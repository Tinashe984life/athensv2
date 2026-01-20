from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Team, Athlete, WellnessEntry, PerformanceTest
from datetime import date, datetime, timedelta
from sqlalchemy import func

bp = Blueprint('dashboard', __name__, url_prefix='/api/dashboard')

@bp.route('/team-overview', methods=['GET'])
@jwt_required()
def get_team_overview():
    """Get comprehensive team overview for coach dashboard"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role != 'coach':
            return jsonify({'success': False, 'message': 'Only coaches can access team overview'}), 403
        
        team_id = request.args.get('team_id')
        sport = request.args.get('sport')
        position = request.args.get('position')
        
        # Get coach's teams
        teams = Team.query.filter_by(coach_id=current_user_id).all()
        
        if team_id:
            # Verify coach has access to this team
            team = next((t for t in teams if t.id == team_id), None)
            if not team:
                return jsonify({'success': False, 'message': 'Team not found or unauthorized'}), 404
            teams = [team]
        
        today = date.today()
        seven_days_ago = today - timedelta(days=7)
        
        team_overview = []
        
        for team in teams:
            # Apply sport filter if specified
            if sport and sport != 'all' and team.sport != sport:
                continue
                
            # Get team athletes
            query = Athlete.query.filter_by(team_id=team.id)
            
            if position and position != 'all':
                query = query.filter_by(position=position)
            
            athletes = query.all()
            
            team_data = {
                'team_id': team.id,
                'team_name': team.name,
                'sport': team.sport,
                'season': team.season,
                'total_athletes': len(athletes),
                'athletes': []
            }
            
            red_count = yellow_count = green_count = 0
            total_readiness = 0
            readiness_count = 0
            
            for athlete in athletes:
                # Get today's wellness entry
                today_entry = WellnessEntry.query.filter_by(
                    athlete_id=athlete.id,
                    date=today
                ).first()
                
                # Get entries from last 7 days
                recent_entries = WellnessEntry.query.filter(
                    WellnessEntry.athlete_id == athlete.id,
                    WellnessEntry.date >= seven_days_ago
                ).order_by(WellnessEntry.date.desc()).all()
                
                # Get latest performance test
                latest_test = PerformanceTest.query.filter_by(
                    athlete_id=athlete.id
                ).order_by(PerformanceTest.test_date.desc()).first()
                
                # Calculate athlete flag
                flag = calculate_athlete_flag(athlete, today_entry, recent_entries, latest_test)
                
                # Count flags
                if flag == 'red':
                    red_count += 1
                elif flag == 'yellow':
                    yellow_count += 1
                else:
                    green_count += 1
                
                # Calculate readiness average
                if today_entry and today_entry.readiness_score:
                    total_readiness += today_entry.readiness_score
                    readiness_count += 1
                
                # Get injury history
                injury_count = len(athlete.injuries) if athlete.injuries else 0
                active_injuries = len([i for i in athlete.injuries if i.status == 'active']) if athlete.injuries else 0
                
                athlete_data = {
                    'athlete_id': athlete.id,
                    'user_id': athlete.user_id,
                    'name': f"{athlete.user.name} {athlete.user.surname}",
                    'jersey_number': athlete.jersey_number,
                    'position': athlete.position,
                    'age': athlete.age,
                    'height': athlete.height,
                    'weight': athlete.weight,
                    'has_submitted_today': today_entry is not None,
                    'today_readiness': today_entry.readiness_score if today_entry else None,
                    'flag': flag,
                    'injury_count': injury_count,
                    'active_injuries': active_injuries,
                    'latest_test_date': latest_test.test_date.isoformat() if latest_test else None,
                    'latest_test_type': latest_test.test_type if latest_test else None,
                    'compliance_rate': calculate_compliance_rate(athlete, 7),  # 7-day compliance
                    'trend': calculate_trend(recent_entries)
                }
                
                team_data['athletes'].append(athlete_data)
            
            # Calculate team compliance (percentage who submitted today)
            submitted_today = sum(1 for a in team_data['athletes'] if a['has_submitted_today'])
            team_data['compliance_rate'] = round((submitted_today / team_data['total_athletes']) * 100, 1) if team_data['total_athletes'] > 0 else 0
            
            # Calculate team readiness average
            team_data['avg_readiness'] = round(total_readiness / readiness_count, 1) if readiness_count > 0 else 0
            
            # Flag distribution
            team_data['flag_distribution'] = {
                'red': red_count,
                'yellow': yellow_count,
                'green': green_count,
                'red_percentage': round((red_count / team_data['total_athletes']) * 100, 1) if team_data['total_athletes'] > 0 else 0,
                'yellow_percentage': round((yellow_count / team_data['total_athletes']) * 100, 1) if team_data['total_athletes'] > 0 else 0,
                'green_percentage': round((green_count / team_data['total_athletes']) * 100, 1) if team_data['total_athletes'] > 0 else 0
            }
            
            team_overview.append(team_data)
        
        return jsonify({
            'success': True,
            'teams': team_overview,
            'filters': {
                'available_sports': list(set([t.sport for t in teams if t.sport])),
                'available_positions': get_all_positions(current_user_id)
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/athlete-risk/<athlete_id>', methods=['GET'])
@jwt_required()
def get_athlete_risk_assessment(athlete_id):
    """Get detailed risk assessment for an athlete"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        # Check permissions
        athlete = Athlete.query.get(athlete_id)
        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404
        
        if user.role == 'coach':
            team = Team.query.get(athlete.team_id)
            if not team or team.coach_id != current_user_id:
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Get wellness data (last 30 days)
        thirty_days_ago = date.today() - timedelta(days=30)
        wellness_entries = WellnessEntry.query.filter(
            WellnessEntry.athlete_id == athlete_id,
            WellnessEntry.date >= thirty_days_ago
        ).order_by(WellnessEntry.date.desc()).all()
        
        # Get performance tests (last 90 days)
        ninety_days_ago = date.today() - timedelta(days=90)
        performance_tests = PerformanceTest.query.filter(
            PerformanceTest.athlete_id == athlete_id,
            PerformanceTest.test_date >= ninety_days_ago
        ).order_by(PerformanceTest.test_date.desc()).all()
        
        # Calculate risk factors
        risk_factors = {
            'readiness': calculate_readiness_risk(wellness_entries),
            'workload': calculate_workload_risk(wellness_entries),
            'recovery': calculate_recovery_risk(wellness_entries),
            'injury_history': calculate_injury_risk(athlete),
            'performance': calculate_performance_risk(performance_tests),
            'compliance': calculate_compliance_risk(athlete, 30)  # 30-day compliance
        }
        
        # Calculate overall risk score
        overall_risk = calculate_overall_risk(risk_factors)
        
        # Generate recommendations
        recommendations = generate_recommendations(risk_factors, overall_risk)
        
        return jsonify({
            'success': True,
            'athlete': {
                'id': athlete.id,
                'name': f"{athlete.user.name} {athlete.user.surname}",
                'position': athlete.position,
                'jersey_number': athlete.jersey_number
            },
            'risk_assessment': {
                'overall_risk': overall_risk,
                'overall_flag': get_flag_from_risk(overall_risk),
                'risk_factors': risk_factors,
                'recommendations': recommendations
            },
            'data_summary': {
                'wellness_entries_count': len(wellness_entries),
                'performance_tests_count': len(performance_tests),
                'last_wellness_date': wellness_entries[0].date.isoformat() if wellness_entries else None,
                'last_test_date': performance_tests[0].test_date.isoformat() if performance_tests else None
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/team-risk-summary', methods=['GET'])
@jwt_required()
def get_team_risk_summary():
    """Get risk summary for entire team"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role != 'coach':
            return jsonify({'success': False, 'message': 'Only coaches can access team risk summary'}), 403
        
        team_id = request.args.get('team_id')
        
        # Get coach's teams
        teams = Team.query.filter_by(coach_id=current_user_id).all()
        
        if team_id:
            # Verify coach has access to this team
            team = next((t for t in teams if t.id == team_id), None)
            if not team:
                return jsonify({'success': False, 'message': 'Team not found or unauthorized'}), 404
            teams = [team]
        
        risk_summary = []
        
        for team in teams:
            athletes = Athlete.query.filter_by(team_id=team.id).all()
            
            high_risk = []
            medium_risk = []
            low_risk = []
            
            for athlete in athletes:
                # Get today's wellness entry
                today_entry = WellnessEntry.query.filter_by(
                    athlete_id=athlete.id,
                    date=date.today()
                ).first()
                
                # Calculate quick risk assessment
                risk_level = calculate_quick_risk(athlete, today_entry)
                
                athlete_info = {
                    'athlete_id': athlete.id,
                    'name': f"{athlete.user.name} {athlete.user.surname}",
                    'jersey_number': athlete.jersey_number,
                    'position': athlete.position,
                    'readiness': today_entry.readiness_score if today_entry else None,
                    'concerns': get_concerns(athlete, today_entry)
                }
                
                if risk_level == 'high':
                    high_risk.append(athlete_info)
                elif risk_level == 'medium':
                    medium_risk.append(athlete_info)
                else:
                    low_risk.append(athlete_info)
            
            team_summary = {
                'team_id': team.id,
                'team_name': team.name,
                'total_athletes': len(athletes),
                'high_risk_count': len(high_risk),
                'medium_risk_count': len(medium_risk),
                'low_risk_count': len(low_risk),
                'high_risk_athletes': high_risk,
                'medium_risk_athletes': medium_risk,
                'low_risk_athletes': low_risk,
                'risk_distribution': {
                    'high_percentage': round((len(high_risk) / len(athletes)) * 100, 1) if athletes else 0,
                    'medium_percentage': round((len(medium_risk) / len(athletes)) * 100, 1) if athletes else 0,
                    'low_percentage': round((len(low_risk) / len(athletes)) * 100, 1) if athletes else 0
                }
            }
            
            risk_summary.append(team_summary)
        
        return jsonify({
            'success': True,
            'risk_summary': risk_summary
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/workload-analysis/<athlete_id>', methods=['GET'])
@jwt_required()
def get_workload_analysis(athlete_id):
    """Calculate acute:chronic workload ratio for an athlete"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        # Check permissions
        athlete = Athlete.query.get(athlete_id)
        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404
        
        if user.role == 'coach':
            team = Team.query.get(athlete.team_id)
            if not team or team.coach_id != current_user_id:
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Get wellness entries with RPE and duration (last 28 days)
        twenty_eight_days_ago = date.today() - timedelta(days=28)
        entries = WellnessEntry.query.filter(
            WellnessEntry.athlete_id == athlete_id,
            WellnessEntry.date >= twenty_eight_days_ago,
            WellnessEntry.previous_session_rpe.isnot(None),
            WellnessEntry.previous_session_duration.isnot(None)
        ).order_by(WellnessEntry.date.asc()).all()
        
        if not entries:
            return jsonify({
                'success': True,
                'message': 'No workload data available',
                'analysis': None
            })
        
        # Calculate daily workload (RPE × Duration)
        daily_loads = []
        for entry in entries:
            if entry.previous_session_rpe and entry.previous_session_duration:
                load = entry.previous_session_rpe * entry.previous_session_duration
                daily_loads.append({
                    'date': entry.date.isoformat(),
                    'rpe': entry.previous_session_rpe,
                    'duration': entry.previous_session_duration,
                    'load': load
                })
        
        # Calculate acute workload (last 7 days)
        acute_load = sum(d['load'] for d in daily_loads[-7:]) if len(daily_loads) >= 7 else 0
        
        # Calculate chronic workload (last 28 days)
        chronic_load = sum(d['load'] for d in daily_loads) / 4 if len(daily_loads) >= 4 else 0  # Average weekly over 4 weeks
        
        # Calculate ACWR
        acwr = acute_load / chronic_load if chronic_load > 0 else 0
        
        # Determine risk level
        if acwr > 1.5:
            acwr_risk = 'high'
            acwr_flag = 'red'
        elif acwr > 1.2:
            acwr_risk = 'moderate'
            acwr_flag = 'yellow'
        elif acwr < 0.8:
            acwr_risk = 'low'  # Under-training
            acwr_flag = 'yellow'
        else:
            acwr_risk = 'optimal'
            acwr_flag = 'green'
        
        # Calculate monotony (standard deviation of daily loads)
        if len(daily_loads) >= 7:
            loads = [d['load'] for d in daily_loads[-7:]]
            avg_load = sum(loads) / len(loads)
            if avg_load > 0:
                variance = sum((l - avg_load) ** 2 for l in loads) / len(loads)
                monotony = avg_load / (variance ** 0.5) if variance > 0 else 0
            else:
                monotony = 0
        else:
            monotony = 0
        
        return jsonify({
            'success': True,
            'analysis': {
                'athlete': {
                    'id': athlete.id,
                    'name': f"{athlete.user.name} {athlete.user.surname}"
                },
                'daily_loads': daily_loads,
                'acute_load': round(acute_load, 1),
                'chronic_load': round(chronic_load, 1),
                'acwr': round(acwr, 2),
                'acwr_risk': acwr_risk,
                'acwr_flag': acwr_flag,
                'monotony': round(monotony, 2) if monotony else 0,
                'recommendations': generate_workload_recommendations(acwr, monotony, acute_load, chronic_load)
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

# Helper functions for risk calculation
def calculate_athlete_flag(athlete, today_entry, recent_entries, latest_test):
    """Calculate red/yellow/green flag for an athlete"""
    if not today_entry:
        return 'yellow'  # No submission today
    
    readiness = today_entry.readiness_score or 0
    
    # Red flags
    if readiness <= 4:
        return 'red'
    
    # Check for recent downward trend
    if len(recent_entries) >= 3:
        recent_scores = [e.readiness_score or 0 for e in recent_entries[:3]]
        if all(recent_scores[i] < recent_scores[i-1] for i in range(1, len(recent_scores))):
            return 'red'
    
    # Check for high stress or soreness
    if today_entry.stress_level and today_entry.stress_level >= 4:
        return 'yellow'
    
    if today_entry.muscle_soreness and today_entry.muscle_soreness >= 4:
        return 'yellow'
    
    # Check sleep
    if today_entry.sleep_hours and today_entry.sleep_hours < 6:
        return 'yellow'
    
    # Check for active injuries
    if athlete.injuries:
        active_injuries = [i for i in athlete.injuries if i.status == 'active']
        if active_injuries:
            return 'yellow'
    
    # Green if none of the above
    return 'green'

def calculate_compliance_rate(athlete, days):
    """Calculate wellness compliance rate over given days"""
    start_date = date.today() - timedelta(days=days)
    expected_entries = days
    actual_entries = WellnessEntry.query.filter(
        WellnessEntry.athlete_id == athlete.id,
        WellnessEntry.date >= start_date
    ).count()
    
    return round((actual_entries / expected_entries) * 100, 1) if expected_entries > 0 else 0

def calculate_trend(recent_entries):
    """Calculate wellness trend based on recent entries"""
    if len(recent_entries) < 3:
        return 'insufficient_data'
    
    scores = [e.readiness_score or 0 for e in recent_entries[:3]]
    if scores[0] > scores[2] + 2:  # Improved by more than 2 points
        return 'improving'
    elif scores[0] < scores[2] - 2:  # Declined by more than 2 points
        return 'declining'
    else:
        return 'stable'

def get_all_positions(coach_id):
    """Get all unique positions from coach's athletes"""
    teams = Team.query.filter_by(coach_id=coach_id).all()
    team_ids = [team.id for team in teams]
    
    athletes = Athlete.query.filter(Athlete.team_id.in_(team_ids)).all()
    positions = set([athlete.position for athlete in athletes if athlete.position])
    
    return list(positions)

def calculate_readiness_risk(wellness_entries):
    """Calculate risk based on readiness scores"""
    if len(wellness_entries) < 7:
        return {'level': 'unknown', 'reason': 'Insufficient data'}
    
    recent_scores = [e.readiness_score or 0 for e in wellness_entries[:7]]
    avg_score = sum(recent_scores) / len(recent_scores)
    
    if avg_score <= 5:
        return {'level': 'high', 'reason': f'Low average readiness ({round(avg_score, 1)}/10)'}
    elif avg_score <= 7:
        return {'level': 'moderate', 'reason': f'Moderate average readiness ({round(avg_score, 1)}/10)'}
    else:
        return {'level': 'low', 'reason': f'Good average readiness ({round(avg_score, 1)}/10)'}

def calculate_workload_risk(wellness_entries):
    """Calculate risk based on workload"""
    # Simplified version - will be enhanced with ACWR
    entries_with_rpe = [e for e in wellness_entries if e.previous_session_rpe]
    
    if len(entries_with_rpe) < 3:
        return {'level': 'unknown', 'reason': 'Insufficient workload data'}
    
    recent_rpe = [e.previous_session_rpe for e in entries_with_rpe[:3]]
    avg_rpe = sum(recent_rpe) / len(recent_rpe)
    
    if avg_rpe >= 8:
        return {'level': 'high', 'reason': f'High recent workload (avg RPE: {round(avg_rpe, 1)})'}
    elif avg_rpe >= 6:
        return {'level': 'moderate', 'reason': f'Moderate recent workload (avg RPE: {round(avg_rpe, 1)})'}
    else:
        return {'level': 'low', 'reason': f'Low recent workload (avg RPE: {round(avg_rpe, 1)})'}

def calculate_recovery_risk(wellness_entries):
    """Calculate risk based on recovery indicators"""
    if not wellness_entries:
        return {'level': 'unknown', 'reason': 'No wellness data'}
    
    latest = wellness_entries[0]
    
    risks = []
    if latest.sleep_hours and latest.sleep_hours < 6:
        risks.append('Insufficient sleep')
    if latest.stress_level and latest.stress_level >= 4:
        risks.append('High stress')
    if latest.muscle_soreness and latest.muscle_soreness >= 4:
        risks.append('High muscle soreness')
    
    if len(risks) >= 2:
        return {'level': 'high', 'reason': ', '.join(risks)}
    elif len(risks) == 1:
        return {'level': 'moderate', 'reason': ', '.join(risks)}
    else:
        return {'level': 'low', 'reason': 'Good recovery indicators'}

def calculate_injury_risk(athlete):
    """Calculate risk based on injury history"""
    if not athlete.injuries:
        return {'level': 'low', 'reason': 'No injury history'}
    
    active_injuries = [i for i in athlete.injuries if i.status == 'active']
    recent_injuries = [i for i in athlete.injuries 
                      if i.date_reported and (date.today() - i.date_reported).days < 90]
    
    if active_injuries:
        return {'level': 'high', 'reason': f'{len(active_injuries)} active injury(ies)'}
    elif recent_injuries:
        return {'level': 'moderate', 'reason': f'{len(recent_injuries)} recent injury(ies)'}
    else:
        return {'level': 'low', 'reason': 'No recent injuries'}

def calculate_performance_risk(performance_tests):
    """Calculate risk based on performance trends"""
    if len(performance_tests) < 2:
        return {'level': 'unknown', 'reason': 'Insufficient performance data'}
    
    # Simplified - in Phase 6 we'll add more sophisticated analysis
    return {'level': 'low', 'reason': 'Stable performance'}

def calculate_compliance_risk(athlete, days):
    """Calculate risk based on compliance rate"""
    compliance = calculate_compliance_rate(athlete, days)
    
    if compliance < 50:
        return {'level': 'high', 'reason': f'Low compliance ({compliance}%)'}
    elif compliance < 80:
        return {'level': 'moderate', 'reason': f'Moderate compliance ({compliance}%)'}
    else:
        return {'level': 'low', 'reason': f'Good compliance ({compliance}%)'}

def calculate_overall_risk(risk_factors):
    """Calculate overall risk score (0-10)"""
    weights = {
        'readiness': 3,
        'workload': 2,
        'recovery': 2,
        'injury_history': 2,
        'performance': 1,
        'compliance': 1
    }
    
    risk_values = {
        'high': 3,
        'moderate': 2,
        'low': 1,
        'unknown': 2  # Unknown treated as moderate
    }
    
    total_weight = sum(weights.values())
    weighted_sum = 0
    
    for factor, risk in risk_factors.items():
        weighted_sum += risk_values[risk['level']] * weights[factor]
    
    # Convert to 0-10 scale (10 = highest risk)
    overall_score = (weighted_sum / (3 * total_weight)) * 10
    
    return round(overall_score, 1)

def get_flag_from_risk(risk_score):
    """Convert risk score to flag"""
    if risk_score >= 7:
        return 'red'
    elif risk_score >= 4:
        return 'yellow'
    else:
        return 'green'

def generate_recommendations(risk_factors, overall_risk):
    """Generate recommendations based on risk factors"""
    recommendations = []
    
    # Readiness recommendations
    if risk_factors['readiness']['level'] == 'high':
        recommendations.append({
            'category': 'Readiness',
            'priority': 'high',
            'action': 'Consider rest day or reduced training intensity',
            'reason': risk_factors['readiness']['reason']
        })
    
    # Workload recommendations
    if risk_factors['workload']['level'] == 'high':
        recommendations.append({
            'category': 'Workload',
            'priority': 'high',
            'action': 'Reduce training volume by 20-30%',
            'reason': risk_factors['workload']['reason']
        })
    
    # Recovery recommendations
    if risk_factors['recovery']['level'] in ['high', 'moderate']:
        recommendations.append({
            'category': 'Recovery',
            'priority': 'medium',
            'action': 'Focus on sleep hygiene and stress management',
            'reason': risk_factors['recovery']['reason']
        })
    
    # Injury prevention
    if risk_factors['injury_history']['level'] == 'high':
        recommendations.append({
            'category': 'Injury Prevention',
            'priority': 'high',
            'action': 'Implement targeted prehab exercises',
            'reason': risk_factors['injury_history']['reason']
        })
    
    # Compliance
    if risk_factors['compliance']['level'] == 'high':
        recommendations.append({
            'category': 'Compliance',
            'priority': 'medium',
            'action': 'Follow up on wellness check completion',
            'reason': risk_factors['compliance']['reason']
        })
    
    # Overall risk recommendations
    if overall_risk >= 7:
        recommendations.append({
            'category': 'Overall',
            'priority': 'high',
            'action': 'Schedule meeting with athlete to discuss concerns',
            'reason': f'High overall risk score ({overall_risk}/10)'
        })
    elif overall_risk >= 4:
        recommendations.append({
            'category': 'Overall',
            'priority': 'medium',
            'action': 'Monitor closely and adjust training as needed',
            'reason': f'Moderate overall risk score ({overall_risk}/10)'
        })
    
    return recommendations

def calculate_quick_risk(athlete, today_entry):
    """Quick risk assessment for team summary"""
    if not today_entry:
        return 'medium'
    
    readiness = today_entry.readiness_score or 0
    
    if readiness <= 4:
        return 'high'
    elif readiness <= 7:
        if today_entry.stress_level and today_entry.stress_level >= 4:
            return 'high'
        if today_entry.muscle_soreness and today_entry.muscle_soreness >= 4:
            return 'high'
        return 'medium'
    else:
        return 'low'

def get_concerns(athlete, today_entry):
    """Get list of concerns for an athlete"""
    concerns = []
    
    if not today_entry:
        concerns.append('No wellness check today')
        return concerns
    
    if today_entry.readiness_score and today_entry.readiness_score <= 4:
        concerns.append('Very low readiness')
    
    if today_entry.sleep_hours and today_entry.sleep_hours < 6:
        concerns.append('Insufficient sleep')
    
    if today_entry.stress_level and today_entry.stress_level >= 4:
        concerns.append('High stress')
    
    if today_entry.muscle_soreness and today_entry.muscle_soreness >= 4:
        concerns.append('High muscle soreness')
    
    # Check for active injuries
    if athlete.injuries:
        active_injuries = [i for i in athlete.injuries if i.status == 'active']
        if active_injuries:
            concerns.append(f'{len(active_injuries)} active injury(ies)')
    
    return concerns

def generate_workload_recommendations(acwr, monotony, acute_load, chronic_load):
    """Generate workload-specific recommendations"""
    recommendations = []
    
    if acwr > 1.5:
        recommendations.append({
            'priority': 'high',
            'action': 'Significant reduction in training load required (30-50%)',
            'reason': f'High ACWR ({acwr:.2f}) indicates excessive load increase'
        })
    elif acwr > 1.2:
        recommendations.append({
            'priority': 'medium',
            'action': 'Consider reducing training load by 10-20%',
            'reason': f'Moderately high ACWR ({acwr:.2f})'
        })
    elif acwr < 0.8:
        recommendations.append({
            'priority': 'medium',
            'action': 'Consider gradual increase in training load',
            'reason': f'Low ACWR ({acwr:.2f}) indicates potential detraining'
        })
    else:
        recommendations.append({
            'priority': 'low',
            'action': 'Maintain current training load',
            'reason': f'Optimal ACWR ({acwr:.2f})'
        })
    
    if monotony > 2.0:
        recommendations.append({
            'priority': 'medium',
            'action': 'Increase training variation to reduce monotony',
            'reason': f'High training monotony ({monotony:.2f})'
        })
    
    if acute_load > 5000:  # Arbitrary threshold, adjust based on sport
        recommendations.append({
            'priority': 'medium',
            'action': 'Monitor for signs of overtraining',
            'reason': f'High acute workload ({acute_load:.0f} units)'
        })
    
    return recommendations

@bp.route('/notifications', methods=['GET'])
@jwt_required()
def get_notifications():
    """Get notifications for the current user"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    notifications = []
    
    if current_user.role == 'coach':
        from app.services.notifications import get_coach_notifications
        notifications = get_coach_notifications(current_user.id)
    elif current_user.role == 'athlete':
        # Athlete-specific notifications (e.g., pending wellness check)
        athlete = Athlete.query.filter_by(user_id=current_user.id).first()
        if athlete:
            # Check for missing wellness entries
            today = date.today()
            wellness_entry = WellnessEntry.query.filter_by(
                athlete_id=athlete.id,
                date=today
            ).first()
            
            if not wellness_entry:
                notifications.append({
                    'type': 'wellness_check',
                    'message': 'Daily wellness check pending',
                    'priority': 'medium',
                    'date': today.isoformat()
                })
    
    return jsonify({
        'success': True,
        'notifications': notifications
    })