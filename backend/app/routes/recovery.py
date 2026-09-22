from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, date, timedelta
from app import db
from app.models import User, Athlete, Team, RecoverySession, PrehabRecommendation, WorkloadSession
import json
import uuid

bp = Blueprint('recovery', __name__, url_prefix='/api/recovery')


@bp.route('/sessions', methods=['POST'])
@jwt_required()
def create_recovery_session():
    """Create a new recovery session"""
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
    
    # Parse prehab exercises if provided
    prehab_exercises = data.get('prehab_exercises')
    if isinstance(prehab_exercises, list):
        prehab_exercises = json.dumps(prehab_exercises)

    modalities = data.get('modalities', [])
    if not isinstance(modalities, list):
        return jsonify({'success': False, 'message': 'Modalities must be a list'}), 400
    
    # Create session
    session = RecoverySession(
        id=str(uuid.uuid4()),
        athlete_id=data['athlete_id'],
        date=datetime.strptime(data.get('date', date.today().isoformat()), '%Y-%m-%d').date(),
        recovery_type=data.get('recovery_type', 'active'),
        session_name=data.get('session_name'),
        duration_minutes=data.get('duration_minutes', 0),
        stretching=data.get('stretching', False),
        foam_rolling=data.get('foam_rolling', False),
        massage=data.get('massage', False),
        ice_bath=data.get('ice_bath', False),
        compression=data.get('compression', False),
        modalities=json.dumps(modalities),
        sleep_quality=data.get('sleep_quality'),
        nutrition_quality=data.get('nutrition_quality'),
        hydration_status=data.get('hydration_status'),
        prehab_exercises=prehab_exercises,
        perceived_recovery=data.get('perceived_recovery'),
        readiness_improvement=data.get('readiness_improvement'),
        notes=data.get('notes')
    )
    
    db.session.add(session)
    db.session.commit()
    
    return jsonify({'success': True, 'session': session.to_dict()}), 201


@bp.route('/sessions/<session_id>', methods=['GET'])
@jwt_required()
def get_recovery_session(session_id):
    """Get a specific recovery session"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    session = RecoverySession.query.get(session_id)
    if not session:
        return jsonify({'success': False, 'message': 'Session not found'}), 404
    
    # Check permissions
    athlete = Athlete.query.get(session.athlete_id)
    if current_user.role == 'athlete' and current_user.id != athlete.user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    return jsonify({'success': True, 'session': session.to_dict()})


@bp.route('/sessions/athlete/<athlete_id>', methods=['GET'])
@jwt_required()
def get_athlete_recovery_sessions(athlete_id):
    """Get all recovery sessions for an athlete"""
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
    recovery_type = request.args.get('recovery_type')
    
    query = RecoverySession.query.filter_by(athlete_id=athlete_id)
    
    if start_date:
        query = query.filter(RecoverySession.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
    if end_date:
        query = query.filter(RecoverySession.date <= datetime.strptime(end_date, '%Y-%m-%d').date())
    if recovery_type:
        query = query.filter(RecoverySession.recovery_type == recovery_type)
    
    query = query.order_by(RecoverySession.date.desc())
    sessions = query.all()
    
    return jsonify({
        'success': True,
        'sessions': [session.to_dict() for session in sessions]
    })


@bp.route('/prehab/recommendations', methods=['POST'])
@jwt_required()
def create_prehab_recommendation():
    """Create a new prehab recommendation"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    # Only coaches and admins can create recommendations
    if current_user.role == 'athlete':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    # Validate required fields
    if not data.get('athlete_id'):
        return jsonify({'success': False, 'message': 'Athlete ID is required'}), 400
    
    athlete = Athlete.query.get(data['athlete_id'])
    if not athlete:
        return jsonify({'success': False, 'message': 'Athlete not found'}), 404
    
    # Validate exercises
    if not data.get('exercises') or not isinstance(data['exercises'], list):
        return jsonify({'success': False, 'message': 'Exercises list is required'}), 400
    
    exercises_json = json.dumps(data['exercises'])
    
    # Parse dates
    start_date = datetime.strptime(data.get('start_date', date.today().isoformat()), '%Y-%m-%d').date()
    end_date = None
    if data.get('end_date'):
        end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date()
    
    # Create recommendation
    recommendation = PrehabRecommendation(
        id=str(uuid.uuid4()),
        athlete_id=data['athlete_id'],
        created_by=current_user_id,
        recommendation_date=date.today(),
        start_date=start_date,
        end_date=end_date,
        recommendation_type=data.get('recommendation_type', 'injury_prevention'),
        body_parts=','.join(data.get('body_parts', [])) if isinstance(data.get('body_parts'), list) else data.get('body_parts'),
        focus_area=data.get('focus_area'),
        exercises=exercises_json,
        frequency_per_week=data.get('frequency_per_week'),
        estimated_duration_minutes=data.get('estimated_duration_minutes'),
        status=data.get('status', 'active'),
        notes=data.get('notes')
    )
    
    db.session.add(recommendation)
    db.session.commit()
    
    return jsonify({'success': True, 'recommendation': recommendation.to_dict()}), 201


@bp.route('/prehab/recommendations/<recommendation_id>', methods=['GET'])
@jwt_required()
def get_prehab_recommendation(recommendation_id):
    """Get a specific prehab recommendation"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    recommendation = PrehabRecommendation.query.get(recommendation_id)
    if not recommendation:
        return jsonify({'success': False, 'message': 'Recommendation not found'}), 404
    
    # Check permissions
    athlete = Athlete.query.get(recommendation.athlete_id)
    if current_user.role == 'athlete' and current_user.id != athlete.user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    return jsonify({'success': True, 'recommendation': recommendation.to_dict()})


@bp.route('/prehab/recommendations/athlete/<athlete_id>', methods=['GET'])
@jwt_required()
def get_athlete_prehab_recommendations(athlete_id):
    """Get all prehab recommendations for an athlete"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    athlete = Athlete.query.get(athlete_id)
    if not athlete:
        return jsonify({'success': False, 'message': 'Athlete not found'}), 404
    
    # Check permissions
    if current_user.role == 'athlete' and current_user.id != athlete.user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    # Get query parameters
    status = request.args.get('status')
    
    query = PrehabRecommendation.query.filter_by(athlete_id=athlete_id)
    
    if status:
        query = query.filter(PrehabRecommendation.status == status)
    
    query = query.order_by(PrehabRecommendation.start_date.desc())
    recommendations = query.all()
    
    return jsonify({
        'success': True,
        'recommendations': [rec.to_dict() for rec in recommendations]
    })


@bp.route('/prehab/recommendations/<recommendation_id>', methods=['PUT'])
@jwt_required()
def update_prehab_recommendation(recommendation_id):
    """Update a prehab recommendation"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    recommendation = PrehabRecommendation.query.get(recommendation_id)
    if not recommendation:
        return jsonify({'success': False, 'message': 'Recommendation not found'}), 404
    
    # Check permissions - only coaches and admins can update
    if current_user.role == 'athlete':
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    data = request.get_json()
    
    # Update fields
    if 'start_date' in data:
        recommendation.start_date = datetime.strptime(data['start_date'], '%Y-%m-%d').date()
    if 'end_date' in data:
        recommendation.end_date = datetime.strptime(data['end_date'], '%Y-%m-%d').date() if data['end_date'] else None
    if 'recommendation_type' in data:
        recommendation.recommendation_type = data['recommendation_type']
    if 'body_parts' in data:
        if isinstance(data['body_parts'], list):
            recommendation.body_parts = ','.join(data['body_parts'])
        else:
            recommendation.body_parts = data['body_parts']
    if 'focus_area' in data:
        recommendation.focus_area = data['focus_area']
    if 'exercises' in data and isinstance(data['exercises'], list):
        recommendation.exercises = json.dumps(data['exercises'])
    if 'frequency_per_week' in data:
        recommendation.frequency_per_week = data['frequency_per_week']
    if 'estimated_duration_minutes' in data:
        recommendation.estimated_duration_minutes = data['estimated_duration_minutes']
    if 'status' in data:
        recommendation.status = data['status']
    if 'compliance_rate' in data:
        recommendation.compliance_rate = data['compliance_rate']
    if 'notes' in data:
        recommendation.notes = data['notes']
    
    db.session.commit()
    
    return jsonify({'success': True, 'recommendation': recommendation.to_dict()})


@bp.route('/prehab/exercise-library', methods=['GET'])
@jwt_required()
def get_prehab_exercise_library():
    """Get prehab exercise library"""
    # This could be expanded to pull from a database table
    # For now, return a static library
    exercise_library = {
        'upper_body': [
            {
                'id': 'ub1',
                'name': 'Band Pull-Aparts',
                'description': 'Improve shoulder stability and posture',
                'sets': '3',
                'reps': '15-20',
                'equipment': 'Resistance band',
                'difficulty': 'beginner'
            },
            {
                'id': 'ub2',
                'name': 'External Rotation',
                'description': 'Strengthen rotator cuff muscles',
                'sets': '3',
                'reps': '12-15',
                'equipment': 'Light dumbbell or band',
                'difficulty': 'beginner'
            },
            {
                'id': 'ub3',
                'name': 'Prone Y-T-W-L',
                'description': 'Scapular stabilization exercises',
                'sets': '2-3',
                'reps': '10-12 each',
                'equipment': 'Bodyweight',
                'difficulty': 'intermediate'
            }
        ],
        'lower_body': [
            {
                'id': 'lb1',
                'name': 'Single Leg Romanian Deadlift',
                'description': 'Improve balance and hamstring strength',
                'sets': '3',
                'reps': '10-12 each leg',
                'equipment': 'Bodyweight or light dumbbell',
                'difficulty': 'intermediate'
            },
            {
                'id': 'lb2',
                'name': 'Glute Bridges',
                'description': 'Activate glute muscles',
                'sets': '3',
                'reps': '15-20',
                'equipment': 'Bodyweight',
                'difficulty': 'beginner'
            },
            {
                'id': 'lb3',
                'name': 'Copenhagen Adductor',
                'description': 'Strengthen adductors for groin prevention',
                'sets': '3',
                'reps': '10-15 each side',
                'equipment': 'Bench',
                'difficulty': 'advanced'
            }
        ],
        'core': [
            {
                'id': 'c1',
                'name': 'Dead Bug',
                'description': 'Core stability with anti-extension',
                'sets': '3',
                'reps': '10-12 each side',
                'equipment': 'Bodyweight',
                'difficulty': 'beginner'
            },
            {
                'id': 'c2',
                'name': 'Bird Dog',
                'description': 'Improve core stability and coordination',
                'sets': '3',
                'reps': '8-10 each side',
                'equipment': 'Bodyweight',
                'difficulty': 'beginner'
            },
            {
                'id': 'c3',
                'name': 'Pallof Press',
                'description': 'Anti-rotation core exercise',
                'sets': '3',
                'reps': '10-12 each side',
                'equipment': 'Cable machine or band',
                'difficulty': 'intermediate'
            }
        ],
        'mobility': [
            {
                'id': 'm1',
                'name': 'World\'s Greatest Stretch',
                'description': 'Full body dynamic stretch',
                'sets': '1',
                'reps': '5-8 each side',
                'equipment': 'Bodyweight',
                'difficulty': 'beginner'
            },
            {
                'id': 'm2',
                'name': 'Quadruped Thoracic Rotation',
                'description': 'Improve thoracic spine mobility',
                'sets': '2',
                'reps': '8-10 each side',
                'equipment': 'Bodyweight',
                'difficulty': 'beginner'
            },
            {
                'id': 'm3',
                'name': '90/90 Hip Switch',
                'description': 'Improve hip internal/external rotation',
                'sets': '2',
                'reps': '8-10 each side',
                'equipment': 'Bodyweight',
                'difficulty': 'intermediate'
            }
        ]
    }
    
    return jsonify({
        'success': True,
        'exercise_library': exercise_library
    })


@bp.route('/workload-recovery-balance/<athlete_id>', methods=['GET'])
@jwt_required()
def get_workload_recovery_balance(athlete_id):
    """Analyze balance between workload and recovery"""
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    
    athlete = Athlete.query.get(athlete_id)
    if not athlete:
        return jsonify({'success': False, 'message': 'Athlete not found'}), 404
    
    # Check permissions
    if current_user.role == 'athlete' and current_user.id != athlete.user_id:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403
    
    # Get date range (default: last 14 days)
    end_date_str = request.args.get('end_date', date.today().isoformat())
    days_back = int(request.args.get('days', 14))
    
    end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
    start_date = end_date - timedelta(days=days_back)
    
    # Get workload sessions
    workload_sessions = WorkloadSession.query.filter(
        WorkloadSession.athlete_id == athlete_id,
        WorkloadSession.date >= start_date,
        WorkloadSession.date <= end_date
    ).order_by(WorkloadSession.date).all()
    
    # Get recovery sessions
    recovery_sessions = RecoverySession.query.filter(
        RecoverySession.athlete_id == athlete_id,
        RecoverySession.date >= start_date,
        RecoverySession.date <= end_date
    ).order_by(RecoverySession.date).all()
    
    # Group by date
    daily_data = {}
    
    # Initialize all dates in range
    current_date = start_date
    while current_date <= end_date:
        date_str = current_date.isoformat()
        daily_data[date_str] = {
            'date': date_str,
            'workload_score': 0,
            'recovery_score': 0,
            'workload_sessions': [],
            'recovery_sessions': [],
            'balance_ratio': 0
        }
        current_date += timedelta(days=1)
    
    # Add workload data
    for session in workload_sessions:
        date_str = session.date.isoformat()
        if date_str in daily_data:
            daily_data[date_str]['workload_score'] += session.workload_score or 0
            daily_data[date_str]['workload_sessions'].append({
                'id': session.id,
                'name': session.session_name,
                'type': session.session_type,
                'workload': session.workload_score
            })
    
    # Add recovery data (simple scoring: duration * perceived_recovery)
    for session in recovery_sessions:
        date_str = session.date.isoformat()
        if date_str in daily_data:
            recovery_score = session.duration_minutes * (session.perceived_recovery or 5) / 10
            daily_data[date_str]['recovery_score'] += recovery_score
            daily_data[date_str]['recovery_sessions'].append({
                'id': session.id,
                'name': session.session_name,
                'type': session.recovery_type,
                'duration': session.duration_minutes,
                'perceived_recovery': session.perceived_recovery
            })
    
    # Calculate balance ratios
    for date_str in daily_data:
        workload = daily_data[date_str]['workload_score']
        recovery = daily_data[date_str]['recovery_score']
        
        if workload > 0 and recovery > 0:
            daily_data[date_str]['balance_ratio'] = round(recovery / workload, 2)
        elif workload == 0 and recovery > 0:
            daily_data[date_str]['balance_ratio'] = 2  # Good recovery day
        elif workload > 0 and recovery == 0:
            daily_data[date_str]['balance_ratio'] = 0  # Workload without recovery
    
    # Calculate summary statistics
    dates = sorted(daily_data.keys())
    workload_values = [daily_data[date]['workload_score'] for date in dates]
    recovery_values = [daily_data[date]['recovery_score'] for date in dates]
    balance_values = [daily_data[date]['balance_ratio'] for date in dates]
    
    total_workload = sum(workload_values)
    total_recovery = sum(recovery_values)
    avg_balance = sum(balance_values) / len(balance_values) if balance_values else 0
    
    # Determine overall balance status
    if avg_balance >= 1.5:
        balance_status = 'Excellent'
        balance_color = 'green'
    elif avg_balance >= 1.0:
        balance_status = 'Good'
        balance_color = 'blue'
    elif avg_balance >= 0.5:
        balance_status = 'Fair'
        balance_color = 'yellow'
    else:
        balance_status = 'Poor'
        balance_color = 'red'
    
    return jsonify({
        'success': True,
        'daily_data': list(daily_data.values()),
        'summary': {
            'period_start': start_date.isoformat(),
            'period_end': end_date.isoformat(),
            'total_days': len(dates),
            'total_workload': round(total_workload, 1),
            'total_recovery': round(total_recovery, 1),
            'avg_daily_workload': round(total_workload / len(dates), 1) if dates else 0,
            'avg_daily_recovery': round(total_recovery / len(dates), 1) if dates else 0,
            'avg_balance_ratio': round(avg_balance, 2),
            'balance_status': balance_status,
            'balance_color': balance_color,
            'workload_sessions_count': len(workload_sessions),
            'recovery_sessions_count': len(recovery_sessions)
        }
    })