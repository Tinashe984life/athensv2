from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
from app import db
from app.models import User, Athlete, Team, WorkloadSession, RecoverySession, PrehabRecommendation, WellnessEntry
from app.services.acwr import calculate_acwr as calculate_canonical_acwr, calculate_team_acwr
import json
import uuid

bp = Blueprint('workload', __name__, url_prefix='/api/workload')


@bp.route('/sessions', methods=['POST'])
@jwt_required()
def create_workload_session():
    """Create a new workload session"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    data = request.get_json()
    
    # Validate required fields
    if not data.get('athlete_id'):
        return jsonify({'success': False, 'message': 'Athlete ID is required'}), 400
    
    athlete = Athlete.query.get(data['athlete_id'])
    if not athlete:
        return jsonify({'success': False, 'message': 'Athlete not found'}), 404
    
    # Check permissions - coach or admin can create for athletes
    if current_user.role == 'athlete' and current_user.id != athlete.user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    # Create session
    session = WorkloadSession(
        id=str(uuid.uuid4()),
        athlete_id=data['athlete_id'],
        date=datetime.strptime(data.get('date', date.today().isoformat()), '%Y-%m-%d').date(),
        session_type=data.get('session_type', 'training'),
        session_name=data.get('session_name'),
        duration_minutes=data.get('duration_minutes', 0),
        perceived_exertion=data.get('perceived_exertion', 0),
        distance_km=data.get('distance_km'),
        average_hr=data.get('average_hr'),
        max_hr=data.get('max_hr'),
        sprints_count=data.get('sprints_count'),
        high_intensity_distance=data.get('high_intensity_distance'),
        fatigue_level=data.get('fatigue_level'),
        muscle_soreness_post=data.get('muscle_soreness_post'),
        motivation_post=data.get('motivation_post'),
        notes=data.get('notes')
    )
    
    # Calculate workload score
    if session.perceived_exertion and session.duration_minutes:
        session.workload_score = session.perceived_exertion * session.duration_minutes
    
    db.session.add(session)
    db.session.commit()
    
    return jsonify({'success': True, 'session': session.to_dict()}), 201


@bp.route('/sessions/<session_id>', methods=['GET'])
@jwt_required()
def get_workload_session(session_id):
    """Get a specific workload session"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    session = WorkloadSession.query.get(session_id)
    if not session:
        return jsonify({'success': False, 'message': 'Session not found'}), 404
    
    # Check permissions
    athlete = Athlete.query.get(session.athlete_id)
    if current_user.role == 'athlete' and current_user.id != athlete.user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    return jsonify({'success': True, 'session': session.to_dict()})


@bp.route('/sessions/athlete/<athlete_id>', methods=['GET'])
@jwt_required()
def get_athlete_workload_sessions(athlete_id):
    """Get all workload sessions for an athlete"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    athlete = Athlete.query.get(athlete_id)
    if not athlete:
        return jsonify({'success': False, 'message': 'Athlete not found'}), 404
    
    # Check permissions
    if current_user.role == 'athlete' and current_user.id != athlete.user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    # Get query parameters
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    session_type = request.args.get('session_type')
    
    query = WorkloadSession.query.filter_by(athlete_id=athlete_id)
    
    if start_date:
        query = query.filter(WorkloadSession.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.filter(WorkloadSession.date <= datetime.strptime(end_date, '%Y-%m-%d').date())
    if session_type:
        query = query.filter(WorkloadSession.session_type == session_type)
    
    query = query.order_by(WorkloadSession.date.desc())
    sessions = query.all()
    
    return jsonify({
        'success': True,
        'sessions': [session.to_dict() for session in sessions]
    })


@bp.route('/sessions/<session_id>', methods=['PUT'])
@jwt_required()
def update_workload_session(session_id):
    """Update a workload session"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    session = WorkloadSession.query.get(session_id)
    if not session:
        return jsonify({'success': False, 'message': 'Session not found'}), 404
    
    # Check permissions
    athlete = Athlete.query.get(session.athlete_id)
    if current_user.role == 'athlete' and current_user.id != athlete.user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    # Update fields
    if 'date' in data:
        session.date = datetime.strptime(data['date'], '%Y-%m-%d').date()
    if 'session_type' in data:
        session.session_type = data['session_type']
    if 'session_name' in data:
        session.session_name = data['session_name']
    if 'duration_minutes' in data:
        session.duration_minutes = data['duration_minutes']
    if 'perceived_exertion' in data:
        session.perceived_exertion = data['perceived_exertion']
    if 'distance_km' in data:
        session.distance_km = data['distance_km']
    if 'average_hr' in data:
        session.average_hr = data['average_hr']
    if 'max_hr' in data:
        session.max_hr = data['max_hr']
    if 'sprints_count' in data:
        session.sprints_count = data['sprints_count']
    if 'high_intensity_distance' in data:
        session.high_intensity_distance = data['high_intensity_distance']
    if 'fatigue_level' in data:
        session.fatigue_level = data['fatigue_level']
    if 'muscle_soreness_post' in data:
        session.muscle_soreness_post = data['muscle_soreness_post']
    if 'motivation_post' in data:
        session.motivation_post = data['motivation_post']
    if 'notes' in data:
        session.notes = data['notes']
    
    # Recalculate workload score
    if session.perceived_exertion and session.duration_minutes:
        session.workload_score = session.perceived_exertion * session.duration_minutes
    
    db.session.commit()
    
    return jsonify({'success': True, 'session': session.to_dict()})


@bp.route('/sessions/<session_id>', methods=['DELETE'])
@jwt_required()
def delete_workload_session(session_id):
    """Delete a workload session"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    session = WorkloadSession.query.get(session_id)
    if not session:
        return jsonify({'success': False, 'message': 'Session not found'}), 404
    
    # Check permissions - only coaches and admins can delete
    if current_user.role == 'athlete':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    db.session.delete(session)
    db.session.commit()
    
    return jsonify({'success': True, 'message': 'Session deleted'})


@bp.route('/acwr/<athlete_id>', methods=['GET'])
@jwt_required()
def calculate_acwr(athlete_id):
    """Calculate Acute:Chronic Workload Ratio for an athlete"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    athlete = Athlete.query.get(athlete_id)
    if not athlete:
        return jsonify({'success': False, 'message': 'Athlete not found'}), 404
    
    # Check permissions
    if current_user.role == 'athlete' and current_user.id != athlete.user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    result = calculate_canonical_acwr(athlete_id, request.args.get('date'))
    return jsonify({'success': True, **result, 'monotony': 0})


@bp.route('/team-acwr/<team_id>', methods=['GET'])
@jwt_required()
def calculate_team_acwr_route(team_id):
    """Calculate the average ACWR for a coach's team."""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    team = Team.query.get(team_id)
    if not team:
        return jsonify({'success': False, 'message': 'Team not found'}), 404
    if current_user.role == 'coach' and team.coach_id != current_user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    if current_user.role == 'athlete':
        athlete = Athlete.query.filter_by(user_id=current_user_id, team_id=team_id).first()
        if not athlete:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    result = calculate_team_acwr(team_id, request.args.get('date'))
    return jsonify({'success': True, **result})


@bp.route('/workload-trends/<athlete_id>', methods=['GET'])
@jwt_required()
def get_workload_trends(athlete_id):
    """Get workload trends for an athlete over time"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    athlete = Athlete.query.get(athlete_id)
    if not athlete:
        return jsonify({'success': False, 'message': 'Athlete not found'}), 404
    
    # Check permissions
    if current_user.role == 'athlete' and current_user.id != athlete.user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    # Get date range (default: last 30 days)
    end_date_str = request.args.get('end_date', date.today().isoformat())
    days_back = int(request.args.get('days', 30))
    
    end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    start_date = end_date - timedelta(days=days_back)
    
    # Get all sessions in date range
    sessions = WorkloadSession.query.filter(
        WorkloadSession.athlete_id == athlete_id,
        WorkloadSession.date >= start_date,
        WorkloadSession.date <= end_date
    ).order_by(WorkloadSession.date).all()
    
    # Group by date
    daily_workloads = {}
    daily_sessions = {}
    
    for session in sessions:
        date_str = session.date.isoformat()
        if date_str not in daily_workloads:
            daily_workloads[date_str] = 0
            daily_sessions[date_str] = []
        
        daily_workloads[date_str] += session.workload_score or 0
        daily_sessions[date_str].append({
            'id': session.id,
            'session_name': session.session_name,
            'session_type': session.session_type,
            'duration_minutes': session.duration_minutes,
            'perceived_exertion': session.perceived_exertion,
            'workload_score': session.workload_score
        })
    
    # Get wellness scores for same period
    wellness_entries = WellnessEntry.query.filter(
        WellnessEntry.athlete_id == athlete_id,
        WellnessEntry.date >= start_date,
        WellnessEntry.date <= end_date
    ).order_by(WellnessEntry.date).all()
    
    daily_readiness = {}
    for entry in wellness_entries:
        date_str = entry.date.isoformat()
        daily_readiness[date_str] = entry.readiness_score or entry.calculate_readiness_score()
    
    # Calculate rolling averages for acute (7-day) and chronic (28-day) workload
    dates = sorted(daily_workloads.keys())
    acute_rolling = []
    chronic_rolling = []
    
    for i, date_str in enumerate(dates):
        current_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        
        # Acute (7-day)
        acute_start = current_date - timedelta(days=7)
        acute_sum = 0
        acute_count = 0
        
        for j in range(max(0, i-6), i+1):
            check_date = datetime.strptime(dates[j], '%Y-%m-%d').date()
            if check_date >= acute_start:
                acute_sum += daily_workloads.get(dates[j], 0)
                acute_count += 1
        
        acute_avg = acute_sum / acute_count if acute_count > 0 else 0
        acute_rolling.append(acute_avg)
        
        # Chronic (28-day)
        chronic_start = current_date - timedelta(days=28)
        chronic_sum = 0
        chronic_count = 0
        
        for j in range(max(0, i-27), i+1):
            check_date = datetime.strptime(dates[j], '%Y-%m-%d').date()
            if check_date >= chronic_start:
                chronic_sum += daily_workloads.get(dates[j], 0)
                chronic_count += 1
        
        chronic_avg = chronic_sum / chronic_count if chronic_count > 0 else 0
        chronic_rolling.append(chronic_avg)
    
    # Calculate ACWR for each day
    acwr_values = []
    for i in range(len(acute_rolling)):
        if chronic_rolling[i] > 0:
            acwr = acute_rolling[i] / chronic_rolling[i]
        else:
            acwr = 0
        acwr_values.append(acwr)
    
    return jsonify({
        'success': True,
        'daily_workloads': [
            {
                'date': date_str,
                'total_workload': daily_workloads[date_str],
                'sessions': daily_sessions[date_str],
                'readiness_score': daily_readiness.get(date_str)
            }
            for date_str in dates
        ],
        'trends': {
            'dates': dates,
            'acute_workload': acute_rolling,
            'chronic_workload': chronic_rolling,
            'acwr_values': acwr_values
        },
        'summary': {
            'total_days': len(dates),
            'total_workload': sum(daily_workloads.values()),
            'avg_daily_workload': sum(daily_workloads.values()) / len(dates) if dates else 0,
            'max_daily_workload': max(daily_workloads.values()) if daily_workloads else 0
        }
    })