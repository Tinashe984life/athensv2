from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token
from app import db
from app.models import User, Team
from app.authz import (
    is_super_admin,
    enrich_user_payload,
    pick_security_question,
    verify_security_answer,
    create_security_challenge,
    verify_security_challenge,
)
import uuid

bp = Blueprint('auth', __name__, url_prefix='/api/auth')


@bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()

        required = ['username', 'password', 'name', 'surname', 'role']
        for field in required:
            if field not in data:
                return jsonify({
                    'success': False,
                    'message': f'Missing required field: {field}'
                }), 400

        if data['role'] not in ('athlete', 'coach'):
            return jsonify({
                'success': False,
                'message': 'Invalid role. Only athlete and coach accounts can self-register.'
            }), 400

        if User.query.filter_by(username=data['username']).first():
            return jsonify({
                'success': False,
                'message': 'Username already exists'
            }), 400

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
            'user': enrich_user_payload(user)
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

        user = User.query.filter_by(username=data['username']).first()

        if not user or not user.check_password(data['password']):
            return jsonify({
                'success': False,
                'message': 'Invalid username or password'
            }), 401

        if is_super_admin(user):
            question_id, question_text = pick_security_question()
            return jsonify({
                'success': True,
                'requires_security_question': True,
                'security_challenge': create_security_challenge(user.id),
                'question_id': question_id,
                'question': question_text,
            }), 200

        access_token = create_access_token(identity=user.id)
        return jsonify({
            'success': True,
            'access_token': access_token,
            'user': enrich_user_payload(user)
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500


@bp.route('/verify-security', methods=['POST'])
def verify_security():
    try:
        data = request.get_json() or {}
        challenge = data.get('security_challenge')
        question_id = data.get('question_id')
        answer = data.get('answer')

        if not challenge or not question_id or not answer:
            return jsonify({
                'success': False,
                'message': 'Security challenge, question, and answer are required'
            }), 400

        user_id = verify_security_challenge(challenge)
        if not user_id:
            return jsonify({
                'success': False,
                'message': 'Security challenge expired or invalid. Please sign in again.'
            }), 401

        user = User.query.get(user_id)
        if not user or not is_super_admin(user):
            return jsonify({
                'success': False,
                'message': 'Unauthorized'
            }), 403

        if not verify_security_answer(question_id, answer):
            return jsonify({
                'success': False,
                'message': 'Incorrect security answer'
            }), 401

        access_token = create_access_token(identity=user.id)
        return jsonify({
            'success': True,
            'access_token': access_token,
            'user': enrich_user_payload(user)
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'message': str(e)
        }), 500
