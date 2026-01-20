from datetime import datetime, timedelta
from app import db
from app.models import WorkloadSession, Athlete, User

def check_high_risk_acwr():
    """Check for athletes with high-risk ACWR and generate notifications"""
    notifications = []
    today = datetime.now().date()
    
    # Get all athletes
    athletes = Athlete.query.all()
    
    for athlete in athletes:
        # Calculate ACWR for each athlete
        acute_start = today - timedelta(days=7)
        acute_sessions = WorkloadSession.query.filter(
            WorkloadSession.athlete_id == athlete.id,
            WorkloadSession.date >= acute_start,
            WorkloadSession.date <= today
        ).all()
        
        chronic_start = today - timedelta(days=28)
        chronic_sessions = WorkloadSession.query.filter(
            WorkloadSession.athlete_id == athlete.id,
            WorkloadSession.date >= chronic_start,
            WorkloadSession.date <= today
        ).all()
        
        if not chronic_sessions:
            continue
            
        # Calculate workloads
        acute_workload = sum(s.workload_score or 0 for s in acute_sessions)
        chronic_workload = sum(s.workload_score or 0 for s in chronic_sessions)
        
        acute_days = len({s.date for s in acute_sessions}) or 1
        chronic_days = len({s.date for s in chronic_sessions}) or 1
        
        acute_avg = acute_workload / acute_days if acute_days > 0 else 0
        chronic_avg = chronic_workload / chronic_days if chronic_days > 0 else 0
        
        if chronic_avg == 0:
            continue
            
        acwr = acute_avg / chronic_avg
        
        # Check for high risk
        if acwr > 1.5:
            notifications.append({
                'athlete_id': athlete.id,
                'athlete_name': f"{athlete.user.name} {athlete.user.surname}",
                'acwr': round(acwr, 2),
                'risk_level': 'high',
                'message': f"High injury risk detected: ACWR = {acwr:.2f}",
                'recommendation': 'Consider reducing training load by 20-30%',
                'date': today.isoformat()
            })
        elif acwr > 1.2:
            notifications.append({
                'athlete_id': athlete.id,
                'athlete_name': f"{athlete.user.name} {athlete.user.surname}",
                'acwr': round(acwr, 2),
                'risk_level': 'moderate',
                'message': f"Moderate injury risk: ACWR = {acwr:.2f}",
                'recommendation': 'Monitor closely and consider load management',
                'date': today.isoformat()
            })
    
    return notifications

def get_coach_notifications(coach_id):
    """Get notifications for a specific coach"""
    # Get coach's teams
    from app.models import Team
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