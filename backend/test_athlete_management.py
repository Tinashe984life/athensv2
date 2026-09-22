"""Athlete management feature audit — run: python test_athlete_management.py"""
import sys
from test_helpers import (
    Recorder, new_app, teardown_app, auth_header,
    register_and_login_coach, create_athlete, login_athlete,
)


def main():
    rec = Recorder('ATHLETE MANAGEMENT TEST RESULTS')
    app = new_app()
    try:
        with app.test_client() as c:
            coach_token, _, team_id = register_and_login_coach(c, 'coach_ath_mgmt', 'CoachPass1!')

            athlete, ath_username, ath_password = create_athlete(
                c, coach_token, team_id, 'Ben', 'Baller', jersey_number=7, position='Wing'
            )
            rec.check('Coach creates athlete', bool(athlete.get('id')))
            rec.check('Athlete created with jersey number', athlete.get('jersey_number') == 7)

            athlete_id = athlete['id']

            # Coach can view athlete details
            r = c.get(f'/api/athletes/{athlete_id}', headers=auth_header(coach_token))
            rec.check('Coach views athlete profile', r.status_code == 200)

            # Coach updates athlete
            r = c.put(f'/api/athletes/{athlete_id}', json={'position': 'Fullback', 'jersey_number': 11},
                      headers=auth_header(coach_token))
            rec.check('Coach updates athlete', r.status_code == 200
                      and r.get_json()['athlete']['position'] == 'Fullback')

            # Athlete can view and update own profile, not another athlete's
            ath_token, _ = login_athlete(c, ath_username, ath_password)
            r = c.get(f'/api/athletes/{athlete_id}', headers=auth_header(ath_token))
            rec.check('Athlete views own profile', r.status_code == 200)

            other_athlete, other_username, other_password = create_athlete(
                c, coach_token, team_id, 'Zoe', 'Zebra'
            )
            r = c.get(f'/api/athletes/{other_athlete["id"]}', headers=auth_header(ath_token))
            rec.check('Athlete blocked from viewing teammate profile', r.status_code == 403)

            r = c.put(f'/api/athletes/{other_athlete["id"]}', json={'position': 'Hacked'},
                      headers=auth_header(ath_token))
            rec.check('Athlete blocked from editing teammate profile', r.status_code == 403)

            # Coach from another team cannot manage this athlete
            coach2_token, _, team2_id = register_and_login_coach(c, 'coach_ath_mgmt_2', 'CoachPass2!')
            r = c.get(f'/api/athletes/{athlete_id}', headers=auth_header(coach2_token))
            rec.check('Other coach blocked from viewing athlete', r.status_code == 403)

            r = c.post('/api/athletes/', json={'name': 'X', 'surname': 'Y', 'team_id': team_id},
                       headers=auth_header(coach2_token))
            rec.check('Other coach blocked from adding athlete to team they do not own', r.status_code == 403)

            # Coach deletes athlete
            r = c.delete(f'/api/athletes/{other_athlete["id"]}', headers=auth_header(coach_token))
            rec.check('Coach deletes athlete', r.status_code == 200)

            r = c.get(f'/api/athletes/{other_athlete["id"]}', headers=auth_header(coach_token))
            rec.check('Deleted athlete no longer retrievable', r.status_code == 404)
    finally:
        teardown_app(app)

    return rec.report()


if __name__ == '__main__':
    sys.exit(main())
