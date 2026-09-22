from datetime import date

from app import db
from app.models import Athlete, Notification, Team, User, WellnessEntry
from app.services.acwr import calculate_acwr


def create_missing_wellness_reminders(target_date=None):
    """Create one in-app reminder per athlete missing the target date check-in."""
    target_date = target_date or date.today()
    athletes = Athlete.query.all()
    created = []

    for athlete in athletes:
        submitted = WellnessEntry.query.filter_by(
            athlete_id=athlete.id,
            date=target_date,
        ).first()
        if submitted:
            continue

        existing = Notification.query.filter_by(
            user_id=athlete.user_id,
            notification_type='wellness_reminder',
            target_date=target_date,
        ).first()
        if existing:
            continue

        notification = Notification(
            user_id=athlete.user_id,
            notification_type='wellness_reminder',
            message='Please complete your daily wellness check-in.',
            priority='high',
            target_date=target_date,
        )
        db.session.add(notification)
        created.append(notification)

    if created:
        db.session.commit()
    return created

def check_high_risk_acwr(target_date=None):
    """Check for athletes with high-risk ACWR and generate notifications"""
    notifications = []
    target_date = target_date or date.today()
    
    # Get all athletes
    athletes = Athlete.query.all()
    
    for athlete in athletes:
        result = calculate_acwr(athlete.id, target_date)
        if result['risk_level'] == 'high':
            acwr = result['acwr']
            notifications.append({
                'athlete_id': athlete.id,
                'athlete_name': f"{athlete.user.name} {athlete.user.surname}",
                'acwr': acwr,
                'risk_level': 'high',
                'message': f"High injury risk detected: ACWR = {acwr:.2f}",
                'recommendation': 'Consider reducing training load by 20-30%',
                'date': target_date.isoformat()
            })
        elif result['risk_level'] == 'moderate':
            acwr = result['acwr']
            notifications.append({
                'athlete_id': athlete.id,
                'athlete_name': f"{athlete.user.name} {athlete.user.surname}",
                'acwr': acwr,
                'risk_level': 'moderate',
                'message': f"Moderate injury risk: ACWR = {acwr:.2f}",
                'recommendation': 'Monitor closely and consider load management',
                'date': target_date.isoformat()
            })
    
    return notifications

def get_coach_notifications(coach_id):
    """Get notifications for a specific coach"""
    # Get coach's teams
    teams = Team.query.filter_by(coach_id=coach_id).all()
    
    if not teams:
        return []
    
    team_athlete_ids = []
    for team in teams:
        team_athlete_ids.extend([a.id for a in team.athletes])
    
    if not team_athlete_ids:
        return []
    
    # Get high-risk notifications for coach's athletes
    all_notifications = check_high_risk_acwr()
    coach_notifications = [
        n for n in all_notifications 
        if n['athlete_id'] in team_athlete_ids
    ]
    
    return coach_notifications