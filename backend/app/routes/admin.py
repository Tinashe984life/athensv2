from flask import Blueprint, request, jsonify, Response, current_app, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Athlete, Team, WorkloadSession, RecoverySession, InjuryRecord, PerformanceTest
from app.authz import (
    is_super_admin,
    is_team_manager,
    is_any_admin,
    enrich_user_payload,
    can_manage_target_user,
    can_assign_role,
    is_ephemeral_filesystem,
)
from app.services.backup import (
    create_snapshot,
    list_snapshots,
    get_snapshot_path,
    backup_status,
    resolve_sqlite_path,
    is_sqlite_deployment,
)
import uuid
import csv
import io
import os
from datetime import datetime

bp = Blueprint('admin', __name__, url_prefix='/api/admin')


def get_current_admin():
    current_user_id = get_jwt_identity()
    current_user = User.query.get(current_user_id)
    if not current_user or not is_any_admin(current_user):
        return None
    return current_user


def require_super_admin():
    user = get_current_admin()
    if not user or not is_super_admin(user):
        return None
    return user


def serialize_user(user):
    data = enrich_user_payload(user)
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


def _forbidden_team_manager_action(message='This action requires super admin privileges'):
    return jsonify({'success': False, 'message': message}), 403


@bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    current_user = get_current_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    role = request.args.get('role')
    query = User.query
    if role:
        query = query.filter_by(role=role)

    users = query.order_by(User.created_at.desc()).all()
    if is_team_manager(current_user):
        users = [u for u in users if can_manage_target_user(current_user, u) or u.id == current_user.id]

    return jsonify({
        'success': True,
        'users': [serialize_user(user) for user in users],
        'count': len(users)
    })


@bp.route('/users/<user_id>', methods=['GET'])
@jwt_required()
def get_user(user_id):
    current_user = get_current_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    if not can_manage_target_user(current_user, user) and user.id != current_user.id:
        return _forbidden_team_manager_action('You cannot view this user')

    user_data = serialize_user(user)
    return jsonify({'success': True, 'user': user_data})


@bp.route('/users', methods=['POST'])
@jwt_required()
def create_user():
    current_user = get_current_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    data = request.get_json() or {}
    required_fields = ['name', 'surname', 'role']
    for field in required_fields:
        if field not in data:
            return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400

    role = data['role']
    if role == 'team_manager':
        role = 'admin'

    if not can_assign_role(current_user, role):
        return _forbidden_team_manager_action(
            'Team managers can only create coach and athlete accounts. '
            'Only the super admin can create team manager accounts.'
        )

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

    response = serialize_user(user)
    if role == 'athlete':
        response['credentials'] = {'username': username, 'password': password}

    return jsonify({'success': True, 'user': response}), 201


@bp.route('/users/<user_id>', methods=['PUT'])
@jwt_required()
def update_user(user_id):
    current_user = get_current_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    if not can_manage_target_user(current_user, user):
        return _forbidden_team_manager_action('You cannot modify this user')

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

    if 'role' in data:
        new_role = data['role']
        if new_role == 'team_manager':
            new_role = 'admin'
        if new_role != user.role:
            if not can_assign_role(current_user, new_role):
                return _forbidden_team_manager_action('You cannot assign this role')
            if user.role == 'coach':
                active_teams = Team.query.filter_by(coach_id=user.id).all()
                if active_teams:
                    return jsonify({'success': False, 'message': 'Reassign or remove teams before changing coach role'}), 400
            if user.role == 'athlete':
                athlete = Athlete.query.filter_by(user_id=user.id).first()
                if athlete:
                    db.session.delete(athlete)
            user.role = new_role

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
    return jsonify({'success': True, 'user': serialize_user(user)})


@bp.route('/users/<user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    current_user = get_current_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    if current_user.id == user_id:
        return jsonify({'success': False, 'message': 'You cannot delete your own account'}), 400

    user = User.query.get(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found'}), 404

    if not can_manage_target_user(current_user, user):
        return _forbidden_team_manager_action('You cannot delete this user')

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
    current_user = get_current_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    username = request.args.get('username', '')
    exists = User.query.filter_by(username=username).first() is not None
    return jsonify({'success': True, 'available': not exists})


@bp.route('/validate/email', methods=['GET'])
@jwt_required()
def validate_email():
    current_user = get_current_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    email = request.args.get('email', '')
    exists = User.query.filter_by(email=email).first() is not None
    return jsonify({'success': True, 'available': not exists})


@bp.route('/reports/summary', methods=['GET'])
@jwt_required()
def get_summary_report():
    current_user = get_current_admin()
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


@bp.route('/system/health', methods=['GET'])
@jwt_required()
def get_system_health():
    current_user = get_current_admin()
    if not current_user:
        return jsonify({'success': False, 'message': 'Unauthorized'}), 403

    database_uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', '')
    is_sqlite = database_uri.startswith('sqlite:///')
    ephemeral = is_ephemeral_filesystem()
    backup_info = backup_status()

    db_path = resolve_sqlite_path()
    db_size_bytes = os.path.getsize(db_path) if db_path else None

    warnings = []
    if is_sqlite:
        warnings.append({
            'level': 'warning',
            'code': 'sqlite',
            'message': 'Running on SQLite. Data may be lost on redeploy unless you use persistent storage or regular backups.',
        })
    if ephemeral:
        warnings.append({
            'level': 'critical',
            'code': 'ephemeral_fs',
            'message': 'Filesystem appears ephemeral. Database and backup files may not survive container restarts.',
        })
    if is_sqlite and not backup_info.get('last_backup_at'):
        warnings.append({
            'level': 'critical',
            'code': 'no_backup',
            'message': 'No database backup has been taken yet. Take a backup before redeploying.',
        })
    elif backup_info.get('last_backup_at'):
        from datetime import datetime, timezone, timedelta
        try:
            last = datetime.fromisoformat(backup_info['last_backup_at'].replace('Z', '+00:00'))
            if datetime.now(timezone.utc) - last > timedelta(hours=24):
                warnings.append({
                    'level': 'warning',
                    'code': 'stale_backup',
                    'message': 'Last backup is more than 24 hours old. Consider taking a new snapshot.',
                })
        except ValueError:
            pass

    return jsonify({
        'success': True,
        'health': {
            'is_sqlite': is_sqlite,
            'is_ephemeral_filesystem': ephemeral,
            'database_uri_type': 'sqlite' if is_sqlite else 'other',
            'db_size_bytes': db_size_bytes,
            'last_backup_at': backup_info.get('last_backup_at'),
            'backup_count': backup_info.get('backup_count', 0),
            'scheduled_backups_enabled': backup_info.get('scheduled_backups_enabled', False),
            'warnings': warnings,
            'viewer_is_super_admin': is_super_admin(current_user),
            'viewer_admin_scope': current_user and (
                'full' if is_super_admin(current_user) else 'athlete_ops'
            ),
        }
    })


@bp.route('/backups', methods=['GET'])
@jwt_required()
def list_backups():
    current_user = require_super_admin()
    if not current_user:
        return _forbidden_team_manager_action()

    snapshots, last_backup_at = list_snapshots()
    return jsonify({
        'success': True,
        'backups': snapshots,
        'last_backup_at': last_backup_at,
    })


@bp.route('/backups', methods=['POST'])
@jwt_required()
def take_backup():
    current_user = require_super_admin()
    if not current_user:
        return _forbidden_team_manager_action()

    try:
        entry = create_snapshot(trigger='manual')
    except ValueError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 400

    return jsonify({'success': True, 'backup': entry}), 201


@bp.route('/backups/<filename>/download', methods=['GET'])
@jwt_required()
def download_backup(filename):
    current_user = require_super_admin()
    if not current_user:
        return _forbidden_team_manager_action()

    path = get_snapshot_path(filename)
    if not path:
        return jsonify({'success': False, 'message': 'Backup not found'}), 404

    return send_file(path, as_attachment=True, download_name=filename, mimetype='application/octet-stream')


@bp.route('/export/csv', methods=['GET'])
@jwt_required()
def export_csv():
    current_user = require_super_admin()
    if not current_user:
        return _forbidden_team_manager_action('CSV export requires super admin privileges')

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
    current_user = require_super_admin()
    if not current_user:
        return _forbidden_team_manager_action('Database download requires super admin privileges')

    if not is_sqlite_deployment():
        return jsonify({'success': False, 'message': 'Database download is only available for SQLite deployments'}), 400

    db_path = resolve_sqlite_path()
    if not db_path or not os.path.exists(db_path):
        return jsonify({
            'success': False,
            'message': f'SQLite database file not found. Looked under {current_app.instance_path}',
        }), 400

    return send_file(db_path, as_attachment=True, download_name=os.path.basename(db_path), mimetype='application/octet-stream')
