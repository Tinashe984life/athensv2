"""Shared helpers for backend/test_*.py feature scripts.

Follows the plain-script style of test_mvp_audit.py (no pytest): each
test_*.py file is run directly via `python test_xxx.py` and prints a
PASS/WARN/FAIL report, exiting non-zero on failure.
"""
import os
import sys
import tempfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))


class Recorder:
    """Collects pass/fail/warn results and prints an MVP-audit-style report."""

    def __init__(self, title):
        self.title = title
        self.passed = []
        self.failed = []
        self.warned = []

    def ok(self, name, detail=''):
        self.passed.append((name, detail))

    def bad(self, name, detail=''):
        self.failed.append((name, detail))

    def warn(self, name, detail=''):
        self.warned.append((name, detail))

    def check(self, name, condition, detail=''):
        """Record ok/bad based on a boolean condition."""
        if condition:
            self.ok(name, detail)
        else:
            self.bad(name, detail)
        return condition

    def report(self):
        print('\n' + '=' * 60)
        print(self.title)
        print('=' * 60)
        print(f'\nPASSED ({len(self.passed)}):')
        for name, detail in self.passed:
            print(f'  [OK] {name}' + (f' — {detail}' if detail else ''))
        print(f'\nWARNINGS ({len(self.warned)}):')
        for name, detail in self.warned:
            print(f'  [!!] {name}' + (f' — {detail}' if detail else ''))
        print(f'\nFAILED ({len(self.failed)}):')
        for name, detail in self.failed:
            print(f'  [XX] {name}' + (f' — {detail}' if detail else ''))
        print('\n' + '=' * 60)
        return 1 if self.failed else 0


def new_app():
    """Create a fresh Flask app backed by an isolated temp SQLite DB file."""
    db_fd, db_path = tempfile.mkstemp(suffix='.db')
    os.close(db_fd)
    os.environ['DATABASE_URL'] = f'sqlite:///{db_path}'
    os.environ.setdefault('JWT_SECRET_KEY', 'test-jwt-secret')
    os.environ['DISABLE_BACKGROUND_JOBS'] = '1'  # avoid scheduler threads racing table creation / locking the file

    from app import create_app, db as _db
    app = create_app()
    app.config['_TEST_DB_PATH'] = db_path
    with app.app_context():
        _db.create_all()
    return app


def teardown_app(app):
    from app import db as _db
    with app.app_context():
        _db.session.remove()
        _db.drop_all()
    db_path = app.config.get('_TEST_DB_PATH')
    if db_path and os.path.exists(db_path):
        try:
            os.remove(db_path)
        except OSError:
            pass  # best-effort cleanup; harmless if the OS still holds a handle


def auth_header(token):
    return {'Authorization': f'Bearer {token}'}


def register(client, username, password, name, surname, role, **extra):
    payload = {'username': username, 'password': password, 'name': name, 'surname': surname, 'role': role}
    payload.update(extra)
    return client.post('/api/auth/register', json=payload)


def login(client, username, password):
    return client.post('/api/auth/login', json={'username': username, 'password': password})


def register_and_login_coach(client, username='coach_test', password='TestPass123!', name='Coach', surname='Test'):
    """Register a coach (which auto-creates a team) and return (token, user, team_id)."""
    r = register(client, username, password, name, surname, 'coach')
    if r.status_code != 201:
        raise RuntimeError(f'Coach registration failed: {r.get_json()}')

    r = login(client, username, password)
    body = r.get_json()
    token = body['access_token']

    r = client.get('/api/teams/', headers=auth_header(token))
    team_id = r.get_json()['teams'][0]['id']
    return token, body['user'], team_id


def create_athlete(client, coach_token, team_id, name='Ath', surname='Lete', **extra):
    """Coach creates an athlete; returns (athlete_dict, username, password)."""
    payload = {'name': name, 'surname': surname, 'team_id': team_id}
    payload.update(extra)
    r = client.post('/api/athletes/', json=payload, headers=auth_header(coach_token))
    if r.status_code != 201:
        raise RuntimeError(f'Athlete creation failed: {r.get_json()}')
    body = r.get_json()
    return body['athlete'], body['credentials']['username'], body['credentials']['password']


def login_athlete(client, username, password='password123'):
    r = login(client, username, password)
    body = r.get_json()
    return body['access_token'], body['user']
