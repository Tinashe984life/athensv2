from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Athlete, InjuryRecord, Team
from datetime import date, datetime, timedelta
import uuid

bp = Blueprint('injuries', __name__, url_prefix='/api/injuries')

@bp.route('/', methods=['POST'])
@jwt_required()
def create_injury():
    """Create a new injury record"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        # Only coaches, admins, and the athlete themselves can create injuries
        if user.role not in ['coach', 'admin']:
            # Check if athlete is creating their own injury record
            athlete = Athlete.query.filter_by(user_id=current_user_id).first()
            if not athlete:
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        data = request.get_json()
        required_fields = ['athlete_id', 'injury_type', 'body_part', 'severity']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400
        
        # Check if athlete exists
        athlete = Athlete.query.get(data['athlete_id'])
        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404
        
        # Check permissions
        if user.role == 'coach':
            team = Team.query.get(athlete.team_id)
            if not team or team.coach_id != current_user_id:
                return jsonify({'success': False, 'message': 'Unauthorized to log injuries for this athlete'}), 403
        
        elif user.role == 'athlete':
            if athlete.user_id != current_user_id:
                return jsonify({'success': False, 'message': 'Unauthorized to log injuries for this athlete'}), 403
        
        # Parse dates
        date_reported = date.today()
        if 'date_reported' in data and data['date_reported']:
            try:
                date_reported = datetime.strptime(data['date_reported'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date format for date_reported. Use YYYY-MM-DD'}), 400
        
        date_occurred = None
        if 'date_occurred' in data and data['date_occurred']:
            try:
                date_occurred = datetime.strptime(data['date_occurred'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date format for date_occurred. Use YYYY-MM-DD'}), 400
        
        # Check if this is a concussion
        injury_type_lower = data['injury_type'].lower()
        is_concussion = data.get('is_concussion', False) or 'concussion' in injury_type_lower
        
        # Create injury record
        injury = InjuryRecord(
            id=str(uuid.uuid4()),
            athlete_id=athlete.id,
            injury_type=data['injury_type'],
            body_part=data['body_part'],
            side=data.get('side'),
            severity=data['severity'],
            date_reported=date_reported,
            date_occurred=date_occurred,
            mechanism=data.get('mechanism'),
            symptoms=data.get('symptoms'),
            diagnosis=data.get('diagnosis'),
            treatment_plan=data.get('treatment_plan'),
            estimated_recovery_time=data.get('estimated_recovery_time'),
            status=data.get('status', 'active'),
            clearance_date=None,
            clearance_notes=None,
            notes=data.get('notes'),
            
            # Concussion-specific fields
            is_concussion=is_concussion,
            loss_of_consciousness=data.get('loss_of_consciousness', False),
            loc_duration=data.get('loc_duration'),
            post_traumatic_amnesia=data.get('post_traumatic_amnesia', False),
            pta_duration=data.get('pta_duration'),
            mechanism_of_concussion=data.get('mechanism_of_concussion'),
            suspected_concussion=data.get('suspected_concussion', False),
            referred_to_physician=data.get('referred_to_physician', False),
            physician_name=data.get('physician_name'),
            physician_contact=data.get('physician_contact'),
            
            # RTP protocol fields (initialize as empty)
            rtp_protocol_started=False,
            rtp_start_date=None,
            rtp_stage=None,
            rtp_stage_start_date=None,
            rtp_completed_date=None,
            rtp_medical_clearance=False,
            rtp_medical_clearance_date=None,
            rtp_medical_clearance_by=None
        )
        
        # Set clearance date if status is 'recovered'
        if data.get('status') == 'recovered':
            injury.clearance_date = date.today()
            injury.clearance_notes = data.get('clearance_notes')
        
        db.session.add(injury)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Injury record created successfully',
            'injury': injury.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/', methods=['GET'])
@jwt_required()
def get_injuries():
    """Get injury records based on user role and permissions"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        athlete_id = request.args.get('athlete_id')
        status = request.args.get('status')
        severity = request.args.get('severity')
        body_part = request.args.get('body_part')
        limit = request.args.get('limit', 50, type=int)
        
        injuries = []
        
        if user.role == 'athlete':
            # Athlete can only see their own injuries
            athlete = Athlete.query.filter_by(user_id=current_user_id).first()
            if athlete:
                query = InjuryRecord.query.filter_by(athlete_id=athlete.id)
                
                # Apply filters
                if status and status != 'all':
                    query = query.filter_by(status=status)
                if severity and severity != 'all':
                    query = query.filter_by(severity=severity)
                if body_part and body_part != 'all':
                    query = query.filter_by(body_part=body_part)
                
                injuries = query.order_by(InjuryRecord.date_reported.desc()).limit(limit).all()
                
        elif user.role == 'coach':
            if athlete_id:
                # Check if coach has access to this athlete
                athlete = Athlete.query.get(athlete_id)
                if not athlete:
                    return jsonify({'success': False, 'message': 'Athlete not found'}), 404
                
                team = Team.query.get(athlete.team_id)
                if not team or team.coach_id != current_user_id:
                    return jsonify({'success': False, 'message': 'Unauthorized'}), 403
                
                query = InjuryRecord.query.filter_by(athlete_id=athlete_id)
            else:
                # Get all athletes coached by this user
                teams = Team.query.filter_by(coach_id=current_user_id).all()
                team_ids = [team.id for team in teams]
                athletes = Athlete.query.filter(Athlete.team_id.in_(team_ids)).all()
                athlete_ids = [athlete.id for athlete in athletes]
                
                query = InjuryRecord.query.filter(InjuryRecord.athlete_id.in_(athlete_ids))
            
            # Apply filters
            if status and status != 'all':
                query = query.filter_by(status=status)
            if severity and severity != 'all':
                query = query.filter_by(severity=severity)
            if body_part and body_part != 'all':
                query = query.filter_by(body_part=body_part)
            
            injuries = query.order_by(InjuryRecord.date_reported.desc()).limit(limit).all()
            
        elif user.role == 'admin':
            query = InjuryRecord.query
            
            # Apply filters
            if status and status != 'all':
                query = query.filter_by(status=status)
            if severity and severity != 'all':
                query = query.filter_by(severity=severity)
            if body_part and body_part != 'all':
                query = query.filter_by(body_part=body_part)
            
            injuries = query.order_by(InjuryRecord.date_reported.desc()).limit(limit).all()
        
        return jsonify({
            'success': True,
            'injuries': [injury.to_dict() for injury in injuries],
            'count': len(injuries)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/<injury_id>', methods=['GET'])
@jwt_required()
def get_injury(injury_id):
    """Get a specific injury record"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        injury = InjuryRecord.query.get(injury_id)
        if not injury:
            return jsonify({'success': False, 'message': 'Injury record not found'}), 404
        
        # Check permissions
        can_view = False
        if user.role == 'admin':
            can_view = True
        elif user.role == 'coach':
            athlete = Athlete.query.get(injury.athlete_id)
            if athlete:
                team = Team.query.get(athlete.team_id)
                if team and team.coach_id == current_user_id:
                    can_view = True
        elif user.role == 'athlete':
            athlete = Athlete.query.filter_by(user_id=current_user_id).first()
            if athlete and athlete.id == injury.athlete_id:
                can_view = True
        
        if not can_view:
            return jsonify({'success': False, 'message': 'Unauthorized to view this injury record'}), 403
        
        return jsonify({
            'success': True,
            'injury': injury.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/<injury_id>', methods=['PUT'])
@jwt_required()
def update_injury(injury_id):
    """Update an injury record"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        injury = InjuryRecord.query.get(injury_id)
        if not injury:
            return jsonify({'success': False, 'message': 'Injury record not found'}), 404
        
        # Check permissions
        can_edit = False
        if user.role == 'admin':
            can_edit = True
        elif user.role == 'coach':
            athlete = Athlete.query.get(injury.athlete_id)
            if athlete:
                team = Team.query.get(athlete.team_id)
                if team and team.coach_id == current_user_id:
                    can_edit = True
        
        if not can_edit:
            return jsonify({'success': False, 'message': 'Unauthorized to update this injury record'}), 403
        
        data = request.get_json()
        
        # Update fields
        update_fields = [
            'injury_type', 'body_part', 'side', 'severity', 'mechanism',
            'symptoms', 'diagnosis', 'treatment_plan', 'estimated_recovery_time',
            'status', 'clearance_notes', 'notes',
            # Concussion fields
            'loss_of_consciousness', 'loc_duration', 'post_traumatic_amnesia',
            'pta_duration', 'mechanism_of_concussion', 'suspected_concussion',
            'referred_to_physician', 'physician_name', 'physician_contact',
            'rtp_protocol_started', 'rtp_start_date', 'rtp_stage',
            'rtp_stage_start_date', 'rtp_completed_date',
            'rtp_medical_clearance', 'rtp_medical_clearance_date',
            'rtp_medical_clearance_by'
        ]
        
        for field in update_fields:
            if field in data:
                setattr(injury, field, data[field])
        
        # Check if this should be marked as concussion based on injury type
        if 'injury_type' in data:
            injury_type_lower = data['injury_type'].lower()
            injury.is_concussion = data.get('is_concussion', False) or 'concussion' in injury_type_lower
        elif 'is_concussion' in data:
            injury.is_concussion = data['is_concussion']
        
        # Handle date fields
        if 'date_reported' in data and data['date_reported']:
            try:
                injury.date_reported = datetime.strptime(data['date_reported'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date format for date_reported. Use YYYY-MM-DD'}), 400
        
        if 'date_occurred' in data and data['date_occurred']:
            try:
                injury.date_occurred = datetime.strptime(data['date_occurred'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date format for date_occurred. Use YYYY-MM-DD'}), 400
        
        # Handle clearance
        if 'status' in data and data['status'] == 'recovered' and injury.status != 'recovered':
            injury.clearance_date = date.today()
            if 'clearance_notes' in data:
                injury.clearance_notes = data['clearance_notes']
        
        if 'clearance_date' in data and data['clearance_date']:
            try:
                injury.clearance_date = datetime.strptime(data['clearance_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date format for clearance_date. Use YYYY-MM-DD'}), 400
        
        injury.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Injury record updated successfully',
            'injury': injury.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/<injury_id>', methods=['DELETE'])
@jwt_required()
def delete_injury(injury_id):
    """Delete an injury record (admin/coach only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role not in ['coach', 'admin']:
            return jsonify({'success': False, 'message': 'Only coaches and admins can delete injury records'}), 403
        
        injury = InjuryRecord.query.get(injury_id)
        if not injury:
            return jsonify({'success': False, 'message': 'Injury record not found'}), 404
        
        # Check permissions
        if user.role == 'coach':
            athlete = Athlete.query.get(injury.athlete_id)
            if not athlete:
                return jsonify({'success': False, 'message': 'Athlete not found'}), 404
            
            team = Team.query.get(athlete.team_id)
            if not team or team.coach_id != current_user_id:
                return jsonify({'success': False, 'message': 'Unauthorized to delete this injury record'}), 403
        
        db.session.delete(injury)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Injury record deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/stats/<athlete_id>', methods=['GET'])
@jwt_required()
def get_injury_stats(athlete_id):
    """Get injury statistics for an athlete"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        # Check permissions
        if user.role == 'athlete':
            athlete = Athlete.query.filter_by(user_id=current_user_id).first()
            if not athlete or athlete.id != athlete_id:
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        elif user.role == 'coach':
            athlete = Athlete.query.get(athlete_id)
            if not athlete:
                return jsonify({'success': False, 'message': 'Athlete not found'}), 404
            
            team = Team.query.get(athlete.team_id)
            if not team or team.coach_id != current_user_id:
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Get all injuries for the athlete
        injuries = InjuryRecord.query.filter_by(athlete_id=athlete_id).all()
        
        total_injuries = len(injuries)
        active_injuries = len([i for i in injuries if i.status == 'active'])
        recovered_injuries = len([i for i in injuries if i.status == 'recovered'])
        
        # Count by body part
        body_part_counts = {}
        for injury in injuries:
            body_part = injury.body_part
            body_part_counts[body_part] = body_part_counts.get(body_part, 0) + 1
        
        # Count by severity
        severity_counts = {}
        for injury in injuries:
            severity = injury.severity
            severity_counts[severity] = severity_counts.get(severity, 0) + 1
        
        # Get most common injury type
        injury_type_counts = {}
        for injury in injuries:
            injury_type = injury.injury_type
            injury_type_counts[injury_type] = injury_type_counts.get(injury_type, 0) + 1
        
        most_common_injury = max(injury_type_counts.items(), key=lambda x: x[1]) if injury_type_counts else None
        
        # Calculate average recovery time (for recovered injuries with estimated time)
        recovered_with_time = [i for i in injuries if i.status == 'recovered' and i.estimated_recovery_time]
        avg_recovery_time = sum(i.estimated_recovery_time for i in recovered_with_time) / len(recovered_with_time) if recovered_with_time else 0
        
        # Get recent injuries (last 90 days)
        ninety_days_ago = date.today() - timedelta(days=90)
        recent_injuries = [i for i in injuries if i.date_reported and i.date_reported >= ninety_days_ago]
        
        return jsonify({
            'success': True,
            'stats': {
                'total_injuries': total_injuries,
                'active_injuries': active_injuries,
                'recovered_injuries': recovered_injuries,
                'recovery_rate': round((recovered_injuries / total_injuries * 100), 1) if total_injuries > 0 else 0,
                'body_part_distribution': body_part_counts,
                'severity_distribution': severity_counts,
                'most_common_injury': most_common_injury,
                'avg_recovery_time': round(avg_recovery_time, 1),
                'recent_injuries_count': len(recent_injuries)
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/team-stats/<team_id>', methods=['GET'])
@jwt_required()
def get_team_injury_stats(team_id):
    """Get injury statistics for a team"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role != 'coach':
            return jsonify({'success': False, 'message': 'Only coaches can view team injury stats'}), 403
        
        # Verify coach has access to this team
        team = Team.query.get(team_id)
        if not team or team.coach_id != current_user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Get team athletes
        athletes = Athlete.query.filter_by(team_id=team_id).all()
        athlete_ids = [athlete.id for athlete in athletes]
        
        # Get all injuries for team athletes
        injuries = InjuryRecord.query.filter(InjuryRecord.athlete_id.in_(athlete_ids)).all()
        
        total_injuries = len(injuries)
        active_injuries = len([i for i in injuries if i.status == 'active'])
        
        # Count by athlete
        athlete_injury_counts = {}
        for athlete in athletes:
            athlete_injuries = len([i for i in injuries if i.athlete_id == athlete.id])
            if athlete_injuries > 0:
                athlete_injury_counts[f"{athlete.user.name} {athlete.user.surname}"] = athlete_injuries
        
        # Count by injury type
        injury_type_counts = {}
        for injury in injuries:
            injury_type_counts[injury.injury_type] = injury_type_counts.get(injury.injury_type, 0) + 1
        
        # Get athletes with most injuries
        top_affected_athletes = sorted(athlete_injury_counts.items(), key=lambda x: x[1], reverse=True)[:5]
        
        # Calculate injury rate (injuries per athlete)
        injury_rate = total_injuries / len(athletes) if athletes else 0
        
        # Get injuries by month (last 6 months)
        monthly_counts = {}
        for i in range(6):
            month_date = date.today().replace(day=1) - timedelta(days=30*i)
            month_key = month_date.strftime('%Y-%m')
            month_injuries = len([i for i in injuries 
                                if i.date_reported 
                                and i.date_reported.year == month_date.year 
                                and i.date_reported.month == month_date.month])
            monthly_counts[month_key] = month_injuries
        
        return jsonify({
            'success': True,
            'stats': {
                'team_name': team.name,
                'total_athletes': len(athletes),
                'total_injuries': total_injuries,
                'active_injuries': active_injuries,
                'injury_rate': round(injury_rate, 2),
                'injury_type_distribution': injury_type_counts,
                'top_affected_athletes': top_affected_athletes,
                'monthly_trend': monthly_counts
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500