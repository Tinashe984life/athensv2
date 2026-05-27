from flask import Blueprint, request, jsonify, Response, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Athlete, Team, WorkloadSession, RecoverySession, InjuryRecord, PerformanceTest
import uuid
import csv
import io
import os
from datetime import datetime

bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def require_admin():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if not current_user or current_user.role != 'admin':
        return None
    return current_user


def serialize_user(user):
    data = user.to_dict()
    if user.role == 'athlete':
        athlete = Athlete.query.filter_by(user_id=user.id).first()
        if athlete:
            data['team_id'] = athlete.team_id
            data['athlete'] = athlete.to_dict()
    elif user.role == 'coach':
        coach_teams = Team.query.filter_by(coach_id=user.id).all()
        data['teams'] = [team.to_dict() for team in coach_teams]
    return data


def generate_unique_username(base_username):
    username = base_username.lower().replace(' ', '.')
    counter = 1
    while User.query.filter_by(username=username).first():
        username = f"{base_username.lower().replace(' ', '.')}{counter}"
        counter += 1
    return username


@bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    """Get all users for admin"""
    current_user = require_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    role = request.args.get('role')
    query = User.query
    if role:
        query = query.filter_by(role=role)

    users = query.order_by(User.created_at.desc()).all()
    return jsonify({
        'success': True,
        'users': [serialize_user(user) for user in users],
        'count': len(users)
    })


@bp.route('/users/<user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    current_user = require_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    user_data = user.to_dict()
    if user.role == 'athlete':
        athlete = Athlete.query.filter_by(user_id=user.id).first()
        if athlete:
            user_data['athlete'] = athlete.to_dict()
    elif user.role == 'coach':
        teams = Team.query.filter_by(coach_id=user.id).all()
        user_data['teams'] = [team.to_dict() for team in teams]

    return jsonify({'success': True, 'user': user_data})


@bp.route('/users', methods=['POST'])
@jwt_required()
def create_user():
    current_user = require_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    data = request.get_json() or {}
    required_fields = ['name', 'surname', 'role']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400

    role = data['role']
    if role not in ['admin', 'coach', 'athlete']:
        return jsonify({'success': False, 'message': 'Invalid role'}), 400

    username = data.get('username')
    if username:
        if User.query.filter_by(username=username).first():
            return jsonify({'success': False, 'message': 'Username already exists'}), 400
    else:
        base_username = f"{data['name']}.{data['surname']}"
        username = generate_unique_username(base_username)

    email = data.get('email')
    if email and User.query.filter_by(email=email).first():
        return jsonify({'success': False, 'message': 'Email already exists'}), 400

    password = data.get('password') or 'Athens123!'
    user_id = str(uuid.uuid4())
    user = User(
        id=user_id,
        username=username,
        email=email,
        name=data['name'],
        surname=data['surname'],
        role=role
    )
    user.set_password(password)
    db.session.add(user)

    if role == 'coach' and data.get('team_id'):
        team = Team.query.get(data['team_id'])
        if not team:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Team not found'}), 404
        team.coach_id = user_id

    if role == 'athlete':
        if not data.get('team_id'):
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Team ID is required for athletes'}), 400
        team = Team.query.get(data['team_id'])
        if not team:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'Team not found'}), 404

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
            photo_url=data.get('photo_url'),
            bio_notes=data.get('bio_notes')
        )
        db.session.add(athlete)

    db.session.commit()

    response = user.to_dict()
    if role == 'athlete':
        response['credentials'] = {'username': username, 'password': password}

    return jsonify({'success': True, 'user': response}), 201


@bp.route('/users/<user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    current_user = require_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    data = request.get_json() or {}
    if 'name' in data:
        user.name = data['name']
    if 'surname' in data:
        user.surname = data['surname']
    if 'email' in data:
        email = data['email']
        if email and User.query.filter(User.email == email, User.id != user.id).first():
            return jsonify({'success': False, 'message': 'Email already exists'}), 400
        user.email = email

    if 'username' in data:
        username = data['username']
        if User.query.filter(User.username == username, User.id != user.id).first():
            return jsonify({'success': False, 'message': 'Username already exists'}), 400
        user.username = username

    if 'password' in data and data['password']:
        user.set_password(data['password'])

    if 'role' in data and data['role'] in ['admin', 'coach', 'athlete'] and data['role'] != user.role:
        if user.role == 'coach':
            active_teams = Team.query.filter_by(coach_id=user.id).all()
            if active_teams:
                return jsonify({'success': False, 'message': 'Reassign or remove teams before changing coach role'}), 400
        if user.role == 'athlete':
            athlete = Athlete.query.filter_by(user_id=user.id).first()
            if athlete:
                db.session.delete(athlete)
        user.role = data['role']

    if user.role == 'athlete':
        athlete = Athlete.query.filter_by(user_id=user.id).first()
        if not athlete and data.get('role') == 'athlete':
            athlete = Athlete(
                id=f"ATH-{uuid.uuid4().hex[:8].upper()}",
                user_id=user.id,
                team_id=data.get('team_id') or None
            )
            db.session.add(athlete)
        if athlete:
            if 'team_id' in data and data['team_id']:
                team = Team.query.get(data['team_id'])
                if not team:
                    return jsonify({'success': False, 'message': 'Team not found'}), 404
                athlete.team_id = data['team_id']
            if 'jersey_number' in data:
                athlete.jersey_number = data.get('jersey_number')
            if 'age' in data:
                athlete.age = data.get('age')
            if 'date_of_birth' in data:
                athlete.date_of_birth = data.get('date_of_birth')
            if 'height' in data:
                athlete.height = data.get('height')
            if 'weight' in data:
                athlete.weight = data.get('weight')
            if 'position' in data:
                athlete.position = data.get('position')
            if 'dominant_side' in data:
                athlete.dominant_side = data.get('dominant_side')
            if 'photo_url' in data:
                athlete.photo_url = data.get('photo_url')
            if 'bio_notes' in data:
                athlete.bio_notes = data.get('bio_notes')

    db.session.commit()
    return jsonify({'success': True, 'user': user.to_dict()})


@bp.route('/users/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user = require_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    if user.role == 'coach':
        teams = Team.query.filter_by(coach_id=user.id).all()
        if teams:
            return jsonify({'success': False, 'message': 'Reassign or remove coach teams before deleting user'}), 400

    athlete = Athlete.query.filter_by(user_id=user.id).first()
    if athlete:
        db.session.delete(athlete)

    db.session.delete(user)
    db.session.commit()

    return jsonify({'success': True, 'message': 'User deleted successfully'})


@bp.route('/validate/username', methods=['GET'])
@jwt_required()
def validate_username():
    current_user = require_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    username = request.args.get('username', '')
    exists = User.query.filter_by(username=username).first() is not None
    return jsonify({'success': True, 'available': not exists})


@bp.route('/validate/email', methods=['GET'])
@jwt_required()
def validate_email():
    current_user = require_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    email = request.args.get('email', '')
    exists = User.query.filter_by(email=email).first() is not None
    return jsonify({'success': True, 'available': not exists})


@bp.route('/reports/summary', methods=['GET'])
@jwt_required()
def get_summary_report():
    current_user = require_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    total_users = User.query.count()
    total_coaches = User.query.filter_by(role='coach').count()
    total_athletes = User.query.filter_by(role='athlete').count()
    total_admins = User.query.filter_by(role='admin').count()
    total_teams = Team.query.count()
    total_workload_sessions = WorkloadSession.query.count()
    total_recovery_sessions = RecoverySession.query.count()
    total_injuries = InjuryRecord.query.count()
    total_performance_tests = PerformanceTest.query.count()

    teams = Team.query.all()
    avg_team_size = 0
    if teams:
        avg_team_size = sum(len(team.athletes) for team in teams) / len(teams)

    return jsonify({
        'success': True,
        'summary': {
            'total_users': total_users,
            'total_admins': total_admins,
            'total_coaches': total_coaches,
            'total_athletes': total_athletes,
            'total_teams': total_teams,
            'avg_team_size': round(avg_team_size, 1),
            'total_workload_sessions': total_workload_sessions,
            'total_recovery_sessions': total_recovery_sessions,
            'total_injuries': total_injuries,
            'total_performance_tests': total_performance_tests
        }
    })


@bp.route('/export/csv', methods=['GET'])
@jwt_required()
def export_csv():
    current_user = require_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    export_type = request.args.get('type', 'users')
    output = io.StringIO()
    writer = csv.writer(output)
    filename = f"{export_type}-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}.csv"

    if export_type == 'users':
        writer.writerow(['ID', 'Username', 'Name', 'Surname', 'Email', 'Role', 'Created At'])
        for user in User.query.order_by(User.created_at.desc()).all():
            writer.writerow([
                user.id,
                user.username,
                user.name,
                user.surname,
                user.email or '',
                user.role,
                user.created_at.isoformat() if user.created_at else ''
            ])
    elif export_type == 'athletes':
        writer.writerow(['Athlete ID', 'Username', 'Name', 'Surname', 'Team', 'Position', 'Age', 'Height', 'Weight', 'Created At'])
        athletes = Athlete.query.join(User, Athlete.user_id == User.id).all()
        for athlete in athletes:
            writer.writerow([
                athlete.id,
                athlete.user.username if athlete.user else '',
                athlete.user.name if athlete.user else '',
                athlete.user.surname if athlete.user else '',
                athlete.team.name if athlete.team else '',
                athlete.position or '',
                athlete.age or '',
                athlete.height or '',
                athlete.weight or '',
                athlete.created_at.isoformat() if athlete.created_at else ''
            ])
    elif export_type == 'teams':
        writer.writerow(['Team ID', 'Team Name', 'Sport', 'Season', 'Coach', 'Athlete Count', 'Created At'])
        for team in Team.query.order_by(Team.created_at.desc()).all():
            writer.writerow([
                team.id,
                team.name,
                team.sport or '',
                team.season or '',
                team.coach.name + ' ' + team.coach.surname if team.coach else '',
                len(team.athletes),
                team.created_at.isoformat() if team.created_at else ''
            ])
    else:
        return jsonify({'success': False, 'message': 'Invalid export type'}), 400

    response = Response(output.getvalue(), mimetype='text/csv')
    response.headers.set('Content-Disposition', f'attachment; filename={filename}')
    return response


@bp.route('/download/db', methods=['GET'])
@jwt_required()
def download_database():
    current_user = require_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    database_uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', '')
    if not database_uri.startswith('sqlite:///'):
        return jsonify({'success': False, 'message': 'Database download is only available for SQLite deployments'}), 400

    db_path = database_uri.replace('sqlite:///', '', 1)
    if not os.path.isabs(db_path):
        db_path = os.path.abspath(db_path)

    if not os.path.exists(db_path):
        return jsonify({'success': False, 'message': 'Database file not found'}), 404

    return send_file(db_path, as_attachment=True, download_name=os.path.basename(db_path), mimetype='application/octet-stream')
