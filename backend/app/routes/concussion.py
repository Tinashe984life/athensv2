from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Athlete, InjuryRecord, ConcussionSymptomScore, Team
from datetime import date, datetime, timedelta
import uuid

bp = Blueprint('concussion', __name__, url_prefix='/api/concussion')

# Return-to-play protocol stages
RTP_STAGES = [
    {
        'stage': 1,
        'name': 'Symptom-Limited Activity',
        'description': 'Daily activities that do not provoke symptoms',
        'duration_days': 'Minimum 24 hours'
    },
    {
        'stage': 2,
        'name': 'Light Aerobic Exercise',
        'description': 'Walking, stationary cycling at slow to medium pace',
        'duration_days': 'Minimum 24 hours'
    },
    {
        'stage': 3,
        'name': 'Sport-Specific Exercise',
        'description': 'Running or skating drills, no head impact activities',
        'duration_days': 'Minimum 24 hours'
    },
    {
        'stage': 4,
        'name': 'Non-Contact Training Drills',
        'description': 'More complex training drills, may start progressive resistance training',
        'duration_days': 'Minimum 24 hours'
    },
    {
        'stage': 5,
        'name': 'Full Contact Practice',
        'description': 'Following medical clearance, participate in normal training activities',
        'duration_days': 'Minimum 24 hours'
    },
    {
        'stage': 6,
        'name': 'Return to Sport',
        'description': 'Normal game play',
        'duration_days': 'None'
    }
]

@bp.route('/symptom-scores', methods=['POST'])
@jwt_required()
def create_symptom_score():
    """Create a new concussion symptom score assessment"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role not in ['coach', 'admin']:
            return jsonify({'success': False, 'message': 'Only coaches and admins can create symptom assessments'}), 403
        
        data = request.get_json()
        required_fields = ['injury_id', 'assessment_date']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400
        
        # Check if injury exists and is a concussion
        injury = InjuryRecord.query.get(data['injury_id'])
        if not injury:
            return jsonify({'success': False, 'message': 'Injury record not found'}), 404
        
        if not injury.is_concussion:
            return jsonify({'success': False, 'message': 'This injury is not marked as a concussion'}), 400
        
        # Check permissions
        athlete = Athlete.query.get(injury.athlete_id)
        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404
        
        if user.role == 'coach':
            team = Team.query.get(athlete.team_id)
            if not team or team.coach_id != current_user_id:
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Parse assessment date
        assessment_date = date.today()
        if 'assessment_date' in data and data['assessment_date']:
            try:
                assessment_date = datetime.strptime(data['assessment_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        # Create symptom score record
        symptom_score = ConcussionSymptomScore(
            id=str(uuid.uuid4()),
            injury_id=injury.id,
            assessment_date=assessment_date,
            assessed_by=user.name + ' ' + user.surname,
            
            # Symptom scores (0-6 scale)
            headache=data.get('headache'),
            pressure_in_head=data.get('pressure_in_head'),
            neck_pain=data.get('neck_pain'),
            nausea_vomiting=data.get('nausea_vomiting'),
            dizziness=data.get('dizziness'),
            blurred_vision=data.get('blurred_vision'),
            balance_problems=data.get('balance_problems'),
            sensitivity_to_light=data.get('sensitivity_to_light'),
            sensitivity_to_noise=data.get('sensitivity_to_noise'),
            feeling_slowed_down=data.get('feeling_slowed_down'),
            feeling_mental_fog=data.get('feeling_mental_fog'),
            difficulty_concentrating=data.get('difficulty_concentrating'),
            difficulty_remembering=data.get('difficulty_remembering'),
            fatigue_low_energy=data.get('fatigue_low_energy'),
            confusion=data.get('confusion'),
            drowsiness=data.get('drowsiness'),
            trouble_falling_asleep=data.get('trouble_falling_asleep'),
            more_emotional=data.get('more_emotional'),
            irritability=data.get('irritability'),
            sadness=data.get('sadness'),
            nervous_anxious=data.get('nervous_anxious'),
            feeling_like_in_a_fog=data.get('feeling_like_in_a_fog'),
            
            # Cognitive scores
            orientation_score=data.get('orientation_score'),
            immediate_memory_score=data.get('immediate_memory_score'),
            concentration_score=data.get('concentration_score'),
            
            # Balance and gait
            balance_score=data.get('balance_score'),
            tandem_gait_time=data.get('tandem_gait_time'),
            
            clinical_notes=data.get('clinical_notes')
        )
        
        # Calculate and set total score
        symptom_score.total_symptom_score = symptom_score.calculate_total_score()
        
        db.session.add(symptom_score)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Symptom assessment recorded successfully',
            'symptom_score': symptom_score.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/symptom-scores', methods=['GET'])
@jwt_required()
def get_symptom_scores():
    """Get concussion symptom scores for an injury"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        injury_id = request.args.get('injury_id')
        limit = request.args.get('limit', 20, type=int)
        
        if not injury_id:
            return jsonify({'success': False, 'message': 'Injury ID is required'}), 400
        
        # Check if injury exists
        injury = InjuryRecord.query.get(injury_id)
        if not injury:
            return jsonify({'success': False, 'message': 'Injury record not found'}), 404
        
        # Check permissions
        athlete = Athlete.query.get(injury.athlete_id)
        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404
        
        can_view = False
        if user.role == 'admin':
            can_view = True
        elif user.role == 'coach':
            team = Team.query.get(athlete.team_id)
            if team and team.coach_id == current_user_id:
                can_view = True
        elif user.role == 'athlete':
            if athlete.user_id == current_user_id:
                can_view = True
        
        if not can_view:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Get symptom scores
        scores = ConcussionSymptomScore.query.filter_by(
            injury_id=injury_id
        ).order_by(
            ConcussionSymptomScore.assessment_date.desc()
        ).limit(limit).all()
        
        return jsonify({
            'success': True,
            'symptom_scores': [score.to_dict() for score in scores],
            'count': len(scores),
            'injury': injury.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/rtp/stages', methods=['GET'])
@jwt_required()
def get_rtp_stages():
    """Get return-to-play protocol stages"""
    return jsonify({
        'success': True,
        'stages': RTP_STAGES
    })

@bp.route('/rtp/advance', methods=['POST'])
@jwt_required()
def advance_rtp_stage():
    """Advance an athlete to the next RTP stage"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role not in ['coach', 'admin']:
            return jsonify({'success': False, 'message': 'Only coaches and admins can manage RTP protocol'}), 403
        
        data = request.get_json()
        required_fields = ['injury_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400
        
        # Get injury
        injury = InjuryRecord.query.get(data['injury_id'])
        if not injury:
            return jsonify({'success': False, 'message': 'Injury record not found'}), 404
        
        if not injury.is_concussion:
            return jsonify({'success': False, 'message': 'This injury is not a concussion'}), 400
        
        # Check permissions
        athlete = Athlete.query.get(injury.athlete_id)
        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404
        
        if user.role == 'coach':
            team = Team.query.get(athlete.team_id)
            if not team or team.coach_id != current_user_id:
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Get current stage
        current_stage = injury.rtp_stage or 0
        
        # Validate advance
        if current_stage >= 6:
            return jsonify({'success': False, 'message': 'Athlete has already completed RTP protocol'}), 400
        
        if current_stage == 0 and not injury.rtp_protocol_started:
            # Starting RTP protocol
            injury.rtp_protocol_started = True
            injury.rtp_start_date = date.today()
            injury.rtp_stage = 1
            injury.rtp_stage_start_date = date.today()
        else:
            # Advance to next stage
            next_stage = current_stage + 1
            
            # Check if minimum duration has been met for current stage
            if injury.rtp_stage_start_date:
                days_at_stage = (date.today() - injury.rtp_stage_start_date).days
                if days_at_stage < 1:  # Minimum 24 hours per stage
                    return jsonify({
                        'success': False,
                        'message': f'Minimum 24 hours required at Stage {current_stage}. Currently at {days_at_stage * 24} hours.'
                    }), 400
            
            injury.rtp_stage = next_stage
            injury.rtp_stage_start_date = date.today()
            
            # If advancing to stage 5, require medical clearance
            if next_stage == 5 and not injury.rtp_medical_clearance:
                return jsonify({
                    'success': False,
                    'message': 'Medical clearance required before advancing to Stage 5 (Full Contact Practice)'
                }), 400
            
            # If advancing to stage 6, mark as completed
            if next_stage == 6:
                injury.rtp_completed_date = date.today()
                injury.status = 'recovered'
                injury.clearance_date = date.today()
                injury.clearance_notes = 'Completed return-to-play protocol'
        
        injury.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': f'Advanced to Stage {injury.rtp_stage}: {RTP_STAGES[injury.rtp_stage-1]["name"]}',
            'injury': injury.to_dict(),
            'current_stage': RTP_STAGES[injury.rtp_stage-1] if injury.rtp_stage else None
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/rtp/medical-clearance', methods=['POST'])
@jwt_required()
def set_medical_clearance():
    """Set medical clearance for RTP"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role not in ['coach', 'admin']:
            return jsonify({'success': False, 'message': 'Only coaches and admins can set medical clearance'}), 403
        
        data = request.get_json()
        required_fields = ['injury_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400
        
        # Get injury
        injury = InjuryRecord.query.get(data['injury_id'])
        if not injury:
            return jsonify({'success': False, 'message': 'Injury record not found'}), 404
        
        if not injury.is_concussion:
            return jsonify({'success': False, 'message': 'This injury is not a concussion'}), 400
        
        # Check permissions
        athlete = Athlete.query.get(injury.athlete_id)
        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404
        
        if user.role == 'coach':
            team = Team.query.get(athlete.team_id)
            if not team or team.coach_id != current_user_id:
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Set medical clearance
        injury.rtp_medical_clearance = True
        injury.rtp_medical_clearance_date = date.today()
        injury.rtp_medical_clearance_by = data.get('cleared_by', f"{user.name} {user.surname}")
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Medical clearance recorded',
            'injury': injury.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/progress/<injury_id>', methods=['GET'])
@jwt_required()
def get_concussion_progress(injury_id):
    """Get concussion recovery progress"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        # Get injury
        injury = InjuryRecord.query.get(injury_id)
        if not injury:
            return jsonify({'success': False, 'message': 'Injury record not found'}), 404
        
        if not injury.is_concussion:
            return jsonify({'success': False, 'message': 'This injury is not a concussion'}), 400
        
        # Check permissions
        athlete = Athlete.query.get(injury.athlete_id)
        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404
        
        can_view = False
        if user.role == 'admin':
            can_view = True
        elif user.role == 'coach':
            team = Team.query.get(athlete.team_id)
            if team and team.coach_id == current_user_id:
                can_view = True
        elif user.role == 'athlete':
            if athlete.user_id == current_user_id:
                can_view = True
        
        if not can_view:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Get symptom scores for trend analysis
        symptom_scores = ConcussionSymptomScore.query.filter_by(
            injury_id=injury_id
        ).order_by(
            ConcussionSymptomScore.assessment_date.asc()
        ).all()
        
        # Calculate recovery progress
        if injury.date_occurred:
            days_since_injury = (date.today() - injury.date_occurred).days
        else:
            days_since_injury = (date.today() - injury.date_reported).days
        
        # Calculate symptom trend
        symptom_trend = []
        for score in symptom_scores:
            symptom_trend.append({
                'date': score.assessment_date.isoformat(),
                'total_score': score.total_symptom_score,
                'headache': score.headache,
                'dizziness': score.dizziness,
                'difficulty_concentrating': score.difficulty_concentrating
            })
        
        # Calculate recovery percentage based on RTP stage
        recovery_percentage = 0
        if injury.rtp_completed_date:
            recovery_percentage = 100
        elif injury.rtp_stage:
            recovery_percentage = (injury.rtp_stage / 6) * 100
        
        # Get RTP timeline
        rtp_timeline = []
        if injury.rtp_start_date:
            for stage in RTP_STAGES:
                stage_data = stage.copy()
                stage_data['completed'] = injury.rtp_stage and stage['stage'] <= injury.rtp_stage
                stage_data['current'] = stage['stage'] == injury.rtp_stage
                stage_data['start_date'] = injury.rtp_stage_start_date.isoformat() if stage['stage'] == injury.rtp_stage else None
                rtp_timeline.append(stage_data)
        
        return jsonify({
            'success': True,
            'progress': {
                'days_since_injury': days_since_injury,
                'recovery_percentage': round(recovery_percentage, 1),
                'current_stage': injury.rtp_stage,
                'medical_clearance': injury.rtp_medical_clearance,
                'protocol_completed': injury.rtp_completed_date is not None,
                'symptom_trend': symptom_trend,
                'rtp_timeline': rtp_timeline,
                'latest_symptom_score': symptom_scores[-1].to_dict() if symptom_scores else None
            },
            'injury': injury.to_dict(),
            'athlete': athlete.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/athlete-concussions', methods=['GET'])
@jwt_required()
def get_athlete_concussions():
    """Get all concussions for an athlete"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        athlete_id = request.args.get('athlete_id')
        
        if user.role == 'athlete':
            # Athlete can only see their own concussions
            athlete = Athlete.query.filter_by(user_id=current_user_id).first()
            if not athlete:
                return jsonify({'success': False, 'message': 'Athlete profile not found'}), 404
            athlete_id = athlete.id
            
            # Get concussions for athlete
            concussions = InjuryRecord.query.filter_by(
                athlete_id=athlete_id,
                is_concussion=True
            ).order_by(
                InjuryRecord.date_reported.desc()
            ).all()
            
        elif user.role == 'coach':
            if not athlete_id:
                return jsonify({
                    'success': False, 
                    'message': 'Athlete ID is required for coaches'
                }), 400
            
            # Check permissions
            athlete = Athlete.query.get(athlete_id)
            if not athlete:
                return jsonify({'success': False, 'message': 'Athlete not found'}), 404
            
            team = Team.query.get(athlete.team_id)
            if not team or team.coach_id != current_user_id:
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403
            
            # Get concussions for athlete
            concussions = InjuryRecord.query.filter_by(
                athlete_id=athlete_id,
                is_concussion=True
            ).order_by(
                InjuryRecord.date_reported.desc()
            ).all()
            
        elif user.role == 'admin':
            if athlete_id:
                concussions = InjuryRecord.query.filter_by(
                    athlete_id=athlete_id,
                    is_concussion=True
                ).order_by(
                    InjuryRecord.date_reported.desc()
                ).all()
            else:
                # Admin can see all concussions if no athlete specified
                concussions = InjuryRecord.query.filter_by(
                    is_concussion=True
                ).order_by(
                    InjuryRecord.date_reported.desc()
                ).all()
        else:
            return jsonify({'success': False, 'message': 'Unauthorized role'}), 403
        
        # Calculate statistics
        total_concussions = len(concussions)
        active_concussions = len([c for c in concussions if c.status == 'active'])
        recovered_concussions = len([c for c in concussions if c.status == 'recovered'])
        
        # Calculate time between concussions (if multiple)
        time_between_concussions = []
        if len(concussions) > 1:
            sorted_concussions = sorted(concussions, key=lambda x: x.date_reported)
            for i in range(1, len(sorted_concussions)):
                days_between = (sorted_concussions[i].date_reported - sorted_concussions[i-1].date_reported).days
                time_between_concussions.append({
                    'from_injury': sorted_concussions[i-1].id,
                    'to_injury': sorted_concussions[i].id,
                    'days_between': days_between
                })
        
        return jsonify({
            'success': True,
            'concussions': [concussion.to_dict() for concussion in concussions],
            'stats': {
                'total_concussions': total_concussions,
                'active_concussions': active_concussions,
                'recovered_concussions': recovered_concussions,
                'recovery_rate': round((recovered_concussions / total_concussions * 100), 1) if total_concussions > 0 else 0,
                'time_between_concussions': time_between_concussions
            }
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500