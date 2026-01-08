from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Athlete, Team
import uuid
from datetime import datetime

bp = Blueprint('athletes', __name__, url_prefix='/api/athletes')

@bp.route('/', methods=['GET'])
@jwt_required()
def get_athletes():
    """Get athletes based on user role and permissions"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        athletes = []
        
        if user.role == 'coach':
            # Get coach's teams and their athletes
            teams = Team.query.filter_by(coach_id=current_user_id).all()
            team_ids = [team.id for team in teams]
            athletes = Athlete.query.filter(Athlete.team_id.in_(team_ids)).all()
            
        elif user.role == 'athlete':
            # Athletes can only see themselves
            athlete = Athlete.query.filter_by(user_id=current_user_id).first()
            if athlete:
                athletes = [athlete]
                
        elif user.role == 'admin':
            # Admin can see all athletes
            athletes = Athlete.query.all()
        
        return jsonify({
            'success': True,
            'athletes': [athlete.to_dict() for athlete in athletes],
            'count': len(athletes)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/', methods=['POST'])
@jwt_required()
def create_athlete():
    """Create a new athlete (coach only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role != 'coach':
            return jsonify({'success': False, 'message': 'Only coaches can create athletes'}), 403
        
        data = request.get_json()
        required_fields = ['name', 'surname', 'team_id']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400
        
        # Check if team exists and belongs to coach
        team = Team.query.get(data['team_id'])
        if not team:
            return jsonify({'success': False, 'message': 'Team not found'}), 404
        
        if team.coach_id != current_user_id:
            return jsonify({'success': False, 'message': 'Unauthorized to add athletes to this team'}), 403
        
        # Create user account for athlete
        username = f"{data['name'].lower()}.{data['surname'].lower()}"
        # Ensure unique username
        counter = 1
        original_username = username
        while User.query.filter_by(username=username).first():
            username = f"{original_username}{counter}"
            counter += 1
        
        user_id = str(uuid.uuid4())
        athlete_user = User(
            id=user_id,
            username=username,
            name=data['name'],
            surname=data['surname'],
            role='athlete',
            email=data.get('email')
        )
        # Set default password (should be changed on first login)
        athlete_user.set_password('password123')
        
        # Create athlete profile
        athlete_id = f"ATH-{uuid.uuid4().hex[:8].upper()}"
        athlete = Athlete(
            id=athlete_id,
            user_id=user_id,
            team_id=data['team_id'],
            jersey_number=data.get('jersey_number'),
            age=data.get('age'),
            height=data.get('height'),
            weight=data.get('weight'),
            position=data.get('position'),
            dominant_side=data.get('dominant_side'),
            bio_notes=data.get('bio_notes')
        )
        
        db.session.add(athlete_user)
        db.session.add(athlete)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Athlete created successfully',
            'athlete': athlete.to_dict(),
            'credentials': {
                'username': username,
                'password': 'password123'  # In production, this should be sent via email
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/<athlete_id>', methods=['GET'])
@jwt_required()
def get_athlete(athlete_id):
    """Get specific athlete details"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        athlete = Athlete.query.get(athlete_id)
        
        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404
        
        # Check permissions
        can_view = False
        if user.role == 'admin':
            can_view = True
        elif user.role == 'coach':
            team = Team.query.get(athlete.team_id)
            if team and team.coach_id == current_user_id:
                can_view = True
        elif user.role == 'athlete' and athlete.user_id == current_user_id:
            can_view = True
        
        if not can_view:
            return jsonify({'success': False, 'message': 'Unauthorized to view this athlete'}), 403
        
        return jsonify({
            'success': True,
            'athlete': athlete.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/<athlete_id>', methods=['PUT'])
@jwt_required()
def update_athlete(athlete_id):
    """Update athlete details"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        athlete = Athlete.query.get(athlete_id)
        
        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404
        
        # Check permissions
        can_edit = False
        if user.role == 'admin':
            can_edit = True
        elif user.role == 'coach':
            team = Team.query.get(athlete.team_id)
            if team and team.coach_id == current_user_id:
                can_edit = True
        elif user.role == 'athlete' and athlete.user_id == current_user_id:
            can_edit = True
        
        if not can_edit:
            return jsonify({'success': False, 'message': 'Unauthorized to edit this athlete'}), 403
        
        data = request.get_json()
        
        # Update athlete fields
        update_fields = [
            'jersey_number', 'age', 'height', 'weight', 'position',
            'dominant_side', 'photo_url', 'bio_notes', 'injury_history',
            'medical_notes'
        ]
        
        for field in update_fields:
            if field in data:
                setattr(athlete, field, data[field])
        
        # Update user name if provided
        if 'name' in data and data['name']:
            athlete.user.name = data['name']
        if 'surname' in data and data['surname']:
            athlete.user.surname = data['surname']
        
        # Update date of birth and recalculate age
        if 'date_of_birth' in data and data['date_of_birth']:
            athlete.date_of_birth = datetime.strptime(data['date_of_birth'], '%Y-%m-%d').date()
            athlete.age = athlete.calculate_age()
        
        athlete.updated_at = datetime.utcnow()
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Athlete updated successfully',
            'athlete': athlete.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/<athlete_id>', methods=['DELETE'])
@jwt_required()
def delete_athlete(athlete_id):
    """Delete an athlete (admin/coach only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        athlete = Athlete.query.get(athlete_id)
        
        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404
        
        # Check permissions
        can_delete = False
        if user.role == 'admin':
            can_delete = True
        elif user.role == 'coach':
            team = Team.query.get(athlete.team_id)
            if team and team.coach_id == current_user_id:
                can_delete = True
        
        if not can_delete:
            return jsonify({'success': False, 'message': 'Unauthorized to delete this athlete'}), 403
        
        # Delete associated user
        user_to_delete = User.query.get(athlete.user_id)
        
        db.session.delete(athlete)
        if user_to_delete:
            db.session.delete(user_to_delete)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Athlete deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/search', methods=['GET'])
@jwt_required()
def search_athletes():
    """Search athletes by name or other criteria"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        search_query = request.args.get('q', '')
        team_id = request.args.get('team_id')
        
        query = Athlete.query.join(User, Athlete.user_id == User.id)
        
        # Apply filters based on user role
        if user.role == 'coach':
            teams = Team.query.filter_by(coach_id=current_user_id).all()
            team_ids = [team.id for team in teams]
            query = query.filter(Athlete.team_id.in_(team_ids))
        elif user.role == 'athlete':
            query = query.filter(Athlete.user_id == current_user_id)
        
        # Apply team filter if specified
        if team_id:
            if user.role == 'coach':
                # Verify coach has access to this team
                team = Team.query.get(team_id)
                if not team or team.coach_id != current_user_id:
                    return jsonify({'success': False, 'message': 'Unauthorized'}), 403
            query = query.filter(Athlete.team_id == team_id)
        
        # Apply search query
        if search_query:
            query = query.filter(
                db.or_(
                    User.name.ilike(f'%{search_query}%'),
                    User.surname.ilike(f'%{search_query}%'),
                    Athlete.position.ilike(f'%{search_query}%')
                )
            )
        
        athletes = query.limit(50).all()
        
        return jsonify({
            'success': True,
            'athletes': [athlete.to_dict() for athlete in athletes],
            'count': len(athletes)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500