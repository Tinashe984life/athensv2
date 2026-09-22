"""Auth & RBAC audit — run: python test_auth_rbac.py"""
import sys
from test_helpers import (
    Recorder, new_app, teardown_app, auth_header,
    register, login, register_and_login_coach, create_athlete, login_athlete,
)


def main():
    rec = Recorder('AUTH & RBAC TEST RESULTS')
    app = new_app()
    try:
        with app.test_client() as c:
            # Public registration cannot self-assign admin/other roles
            r = register(c, 'hacker1', 'test123', 'Hack', 'Er', 'admin')
            rec.check('Register blocks admin role', r.status_code == 400)

            r = register(c, 'hacker2', 'test123', 'Hack', 'Er', 'superuser')
            rec.check('Register blocks unknown role', r.status_code == 400)

            # Coach self-registration auto-creates a team
            coach_token, coach_user, team_id = register_and_login_coach(c, 'coach_rbac', 'CoachPass1!')
            rec.check('Coach registration succeeds', bool(coach_token))
            rec.check('Coach auto-assigned a team', bool(team_id))

            # Duplicate username rejected
            r = register(c, 'coach_rbac', 'CoachPass1!', 'Coach', 'Dup', 'coach')
            rec.check('Duplicate username rejected', r.status_code == 400)

            # Wrong password rejected
            r = login(c, 'coach_rbac', 'wrong-password')
            rec.check('Login rejects wrong password', r.status_code == 401)

            # Protected route requires JWT
            r = c.get('/api/athletes/')
            rec.check('Protected route requires JWT', r.status_code == 401)

            # Coach creates an athlete (default password issued)
            athlete, ath_username, ath_password = create_athlete(c, coach_token, team_id, 'Amy', 'Athlete')
            ath_token, ath_user = login_athlete(c, ath_username, ath_password)
            rec.check('Athlete login with issued credentials', bool(ath_token))
            rec.check('Created user has athlete role', ath_user.get('role') == 'athlete')

            # Athlete cannot create another athlete
            r = c.post('/api/athletes/', json={'name': 'X', 'surname': 'Y', 'team_id': team_id},
                       headers=auth_header(ath_token))
            rec.check('Athlete blocked from creating athletes', r.status_code == 403)

            # Athlete cannot create a team
            r = c.post('/api/teams/', json={'name': 'Rogue Team'}, headers=auth_header(ath_token))
            rec.check('Athlete blocked from creating teams', r.status_code == 403)

            # A second coach cannot view the first coach's team
            coach2_token, _, team2_id = register_and_login_coach(c, 'coach_rbac_2', 'CoachPass2!')
            r = c.get(f'/api/teams/{team_id}', headers=auth_header(coach2_token))
            rec.check('Coach cannot view another coach\'s team', r.status_code == 403)
            rec.check('Coaches get distinct teams', team_id != team2_id)

            # Athlete can view their own profile
            r = c.get('/api/athletes/', headers=auth_header(ath_token))
            body = r.get_json()
            rec.check('Athlete sees only own profile', r.status_code == 200 and body['count'] == 1)
    finally:
        teardown_app(app)

    return rec.report()


if __name__ == '__main__':
    sys.exit(main())
