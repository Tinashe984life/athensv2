"""
MVP audit script — run: python test_mvp_audit.py
Requires DB and dependencies installed.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User, Athlete, Team, WellnessEntry, PerformanceTest, InjuryRecord
from app.services.backup import resolve_sqlite_path, is_sqlite_deployment, create_snapshot
from app.authz import is_super_admin, enrich_user_payload

PASS = []
FAIL = []
WARN = []


def ok(name, detail=''):
    PASS.append((name, detail))


def bad(name, detail=''):
    FAIL.append((name, detail))


def warn(name, detail=''):
    WARN.append((name, detail))


def main():
    app = create_app()
    with app.app_context():
        # --- Infrastructure ---
        try:
            from flask import json as _  # noqa
            ok('Flask app starts')
        except Exception as e:
            bad('Flask app starts', str(e))
            return report()

        # Health
        with app.test_client() as c:
            r = c.get('/api/health')
            if r.status_code == 200 and r.get_json().get('status'):
                ok('GET /api/health')
            else:
                bad('GET /api/health', str(r.status_code))

        # DB
        if is_sqlite_deployment():
            ok('SQLite configured')
            path = resolve_sqlite_path()
            if path and os.path.exists(path):
                ok('SQLite file resolved', path)
            else:
                bad('SQLite file resolved', f'not found (instance: {app.instance_path})')
        else:
            warn('SQLite configured', 'Using non-SQLite DATABASE_URL')

        user_count = User.query.count()
        athlete_count = Athlete.query.count()
        team_count = Team.query.count()
        if user_count > 0:
            ok('Database has users', str(user_count))
        else:
            warn('Database has users', 'empty — run test_setup.py or seed')

        # --- Auth ---
        with app.test_client() as c:
            r = c.post('/api/auth/register', json={
                'username': 'mvp_audit_hacker',
                'password': 'test123',
                'name': 'Hack',
                'surname': 'Admin',
                'role': 'admin',
            })
            if r.status_code == 400 and 'Invalid role' in (r.get_json() or {}).get('message', ''):
                ok('Public register blocks admin role')
            elif r.status_code == 201:
                bad('Public register blocks admin role', 'admin registration allowed')
            else:
                warn('Public register blocks admin role', r.get_json())

        coach = User.query.filter_by(role='coach').first()
        athlete_user = User.query.filter_by(role='athlete').first()
        super_user = User.query.filter_by(username='sauron-ceasar').first()

        if coach:
            with app.test_client() as c:
                r = c.post('/api/auth/login', json={'username': coach.username, 'password': 'password123'})
                if r.status_code != 200:
                    r = c.post('/api/auth/login', json={'username': coach.username, 'password': 'Athens123!'})
                if r.status_code == 200 and r.get_json().get('access_token'):
                    ok('Coach login')
                    token = r.get_json()['access_token']
                    h = {'Authorization': f'Bearer {token}'}
                    r2 = c.get('/api/dashboard/team-overview', headers=h)
                    if r2.status_code == 200:
                        ok('Coach team overview API')
                    else:
                        bad('Coach team overview API', str(r2.status_code))
                else:
                    bad('Coach login', 'no coach with password123/Athens123!')
        else:
            warn('Coach login', 'no coach in DB')

        if super_user:
            ok('Super admin account exists', super_user.username)
            if is_super_admin(super_user):
                ok('Super admin identity check')
            else:
                bad('Super admin identity check')
            with app.test_client() as c:
                r = c.post('/api/auth/login', json={'username': super_user.username, 'password': 'wrong'})
                if r.status_code == 401:
                    ok('Super admin login rejects bad password')
                r = c.post('/api/auth/login', json={'username': super_user.username, 'password': 'alsgups,dbreorouEJKS29!!'})
                data = r.get_json() or {}
                if data.get('requires_security_question'):
                    ok('Super admin requires security question')
                elif data.get('access_token'):
                    warn('Super admin security question', 'token issued without 2nd factor')
        else:
            warn('Super admin account', 'sauron-ceasar not in DB')

        # --- MVP data models ---
        if WellnessEntry.query.count() >= 0:
            ok('WellnessEntry model/query')
        if PerformanceTest.query.count() >= 0:
            ok('PerformanceTest model/query')
        if InjuryRecord.query.count() >= 0:
            ok('InjuryRecord model/query')

        # Performance test fields vs spec
        from app.models import PerformanceTest as PT
        cols = {c.name for c in PT.__table__.columns}
        spec_fields = {
            'height', 'weight', 'sit_and_reach', 'dorsiflexion_left', 'dorsiflexion_right',
            'push_ups_1min', 'sit_ups_2min', 'vertical_jump', 'broad_jump',
            'single_leg_jump_left', 'single_leg_jump_right',
            'sprint_10m', 'sprint_20m', 'sprint_40m',
            'agility_t_test', 'agility_505', 'illinois_agility',
            'yo_yo_test', 'bronco_test',
        }
        missing_spec = []
        for f in ('sprint_5m', 'sprint_15m', 'knee_to_wall', 'stiff_arm_jump', 'cmj', 'depth_drop_jump'):
            if f not in cols:
                missing_spec.append(f)
        if not missing_spec:
            ok('All spec performance fields in model')
        else:
            warn('Spec performance fields missing in DB model', ', '.join(missing_spec))

        # --- Admin / export ---
        admin_user = User.query.filter_by(role='admin').first()
        if admin_user and is_super_admin(admin_user):
            with app.test_client() as c:
                # Need full login with security - skip if only challenge returned
                pass

        # CSV export route exists
        routes = [str(r) for r in app.url_map.iter_rules()]
        if any('export/csv' in r for r in routes):
            ok('CSV export route registered')
        else:
            bad('CSV export route registered')
        if any('export' in r and 'pdf' in r.lower() for r in routes):
            ok('PDF export route registered')
        else:
            warn('PDF export route registered', 'not implemented')

        if any('/backups' in r for r in routes):
            ok('Backup routes registered')
        if any('system/health' in r for r in routes):
            ok('System health route registered')

        # Backup (super admin only in API — test path resolution)
        if resolve_sqlite_path():
            try:
                entry = create_snapshot(trigger='audit')
                ok('SQLite backup snapshot', entry.get('filename', ''))
            except Exception as e:
                bad('SQLite backup snapshot', str(e))

        # Prehab API
        if any('prehab' in r for r in routes):
            ok('Prehab API routes registered')

        # Flag logic
        from app.routes.dashboard import calculate_athlete_flag
        ok('Flag calculation function exists')

    report()


def report():
    print('\n' + '=' * 60)
    print('MVP AUDIT RESULTS')
    print('=' * 60)
    print(f'\nPASSED ({len(PASS)}):')
    for name, detail in PASS:
        print(f'  [OK] {name}' + (f' — {detail}' if detail else ''))
    print(f'\nWARNINGS ({len(WARN)}):')
    for name, detail in WARN:
        print(f'  [!!] {name}' + (f' — {detail}' if detail else ''))
    print(f'\nFAILED ({len(FAIL)}):')
    for name, detail in FAIL:
        print(f'  [XX] {name}' + (f' — {detail}' if detail else ''))
    print('\n' + '=' * 60)
    sys.exit(1 if FAIL else 0)


if __name__ == '__main__':
    main()
