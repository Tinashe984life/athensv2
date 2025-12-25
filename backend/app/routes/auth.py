from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from app import db
from app.models import User, Team
import uuid
from datetime import datetime

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        # Validate required fields
        required = ['username', 'password', 'name', 'surname', 'role']
        for field in required:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400
        
        # Check if username exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({
                'success': False,
                'message': 'Username already exists'
            }), 400
        
        # Create user
        user_id = str(uuid.uuid4())
        user = User(
            id=user_id,
            username=data['username'],
            name=data['name'],
            surname=data['surname'],
            role=data['role'],
            email=data.get('email')
        )
        user.set_password(data['password'])
        
        db.session.add(user)
        
        # If role is coach, create a team
        if data['role'] == 'coach':
            team_id = f"TEAM-{data['name'][:4].upper()}-{uuid.uuid4().hex[:6].upper()}"
            team = Team(
                id=team_id,
                name=data.get('teamName', f"{data['name']}'s Team"),
                coach_id=user_id
            )
            db.session.add(team)
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Registration successful',
            'user': {
                'id': user_id,
                'username': user.username,
                'name': user.name,
                'surname': user.surname,
                'role': user.role
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500

@bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data or 'username' not in data or 'password' not in data:
            return jsonify({
                'success': False,
                'message': 'Missing username or password'
            }), 400
        
        # Find user
        user = User.query.filter_by(username=data['username']).first()
        
        if not user or not user.check_password(data['password']):
            return jsonify({
                'success': False,
                'message': 'Invalid username or password'
            }), 401
        
        # Create JWT token
        access_token = create_access_token(identity=user.id)
        
        return jsonify({
            'success': True,
            'access_token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'name': user.name,
                'surname': user.surname,
                'role': user.role
            }
        }), 200
        
    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500