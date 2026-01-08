from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Team, Athlete
import uuid

bp = Blueprint('teams', __name__, url_prefix='/api/teams')

@bp.route('/', methods=['GET'])
@jwt_required()
def get_teams():
    """Get teams for the current user"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        
        if user.role == 'coach':
            # Get teams coached by this user
            teams = Team.query.filter_by(coach_id=current_user_id).all()
            return jsonify({
                'success': True,
                'teams': [team.to_dict() for team in teams]
            })
        elif user.role == 'athlete':
            # Get the team the athlete belongs to
            athlete = Athlete.query.filter_by(user_id=current_user_id).first()
            if athlete:
                team = Team.query.get(athlete.team_id)
                if team:
                    return jsonify({
                        'success': True,
                        'teams': [team.to_dict()]
                    })
            return jsonify({'success': True, 'teams': []})
        elif user.role == 'admin':
            # Admin can see all teams
            teams = Team.query.all()
            return jsonify({
                'success': True,
                'teams': [team.to_dict() for team in teams]
            })
        else:
            return jsonify({'success': False, 'message': 'Invalid role'}), 403
            
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/', methods=['POST'])
@jwt_required()
def create_team():
    """Create a new team (coach only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role != 'coach':
            return jsonify({'success': False, 'message': 'Only coaches can create teams'}), 403
        
        data = request.get_json()
        required_fields = ['name']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400
        
        # Create team
        team_id = f"TEAM-{uuid.uuid4().hex[:8].upper()}"
        team = Team(
            id=team_id,
            name=data['name'],
            coach_id=current_user_id,
            sport=data.get('sport'),
            season=data.get('season')
        )
        
        db.session.add(team)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Team created successfully',
            'team': team.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/<team_id>', methods=['GET'])
@jwt_required()
def get_team(team_id):
    """Get specific team details"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        team = Team.query.get(team_id)
        
        if not team:
            return jsonify({'success': False, 'message': 'Team not found'}), 404
        
        # Check permissions
        can_view = False
        if user.role == 'admin':
            can_view = True
        elif user.role == 'coach' and team.coach_id == current_user_id:
            can_view = True
        elif user.role == 'athlete':
            athlete = Athlete.query.filter_by(user_id=current_user_id, team_id=team_id).first()
            if athlete:
                can_view = True
        
        if not can_view:
            return jsonify({'success': False, 'message': 'Unauthorized to view this team'}), 403
        
        # Get team athletes
        athletes = Athlete.query.filter_by(team_id=team_id).all()
        team_data = team.to_dict()
        team_data['athletes'] = [athlete.to_dict() for athlete in athletes]
        
        return jsonify({
            'success': True,
            'team': team_data
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/<team_id>', methods=['PUT'])
@jwt_required()
def update_team(team_id):
    """Update team details"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        team = Team.query.get(team_id)
        
        if not team:
            return jsonify({'success': False, 'message': 'Team not found'}), 404
        
        # Only coach of the team or admin can update
        if not (user.role == 'admin' or (user.role == 'coach' and team.coach_id == current_user_id)):
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        data = request.get_json()
        
        # Update fields
        if 'name' in data:
            team.name = data['name']
        if 'sport' in data:
            team.sport = data['sport']
        if 'season' in data:
            team.season = data['season']
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Team updated successfully',
            'team': team.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500