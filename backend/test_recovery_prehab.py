"""Recovery session & prehab recommendation audit — run: python test_recovery_prehab.py"""
import sys
from test_helpers import (
    Recorder, new_app, teardown_app, auth_header,
    register_and_login_coach, create_athlete, login_athlete,
)


def main():
    rec = Recorder('RECOVERY & PREHAB TEST RESULTS')
    app = new_app()
    try:
        with app.test_client() as c:
            coach_token, _, team_id = register_and_login_coach(c, 'coach_recovery', 'CoachPass1!')
            athlete, ath_username, ath_password = create_athlete(c, coach_token, team_id, 'Rex', 'Recovery')
            ath_token, _ = login_athlete(c, ath_username, ath_password)
            athlete_id = athlete['id']

            # Athlete logs their own recovery session
            r = c.post('/api/recovery/sessions', json={
                'athlete_id': athlete_id, 'recovery_type': 'active',
                'duration_minutes': 30, 'stretching': True, 'ice_bath': False,
                'perceived_recovery': 7,
            }, headers=auth_header(ath_token))
            rec.check('Athlete logs own recovery session', r.status_code == 201)

            # Athlete cannot log a recovery session for a teammate
            other_athlete, _, _ = create_athlete(c, coach_token, team_id, 'Uma', 'Unrelated')
            r = c.post('/api/recovery/sessions', json={'athlete_id': other_athlete['id'], 'recovery_type': 'passive'},
                       headers=auth_header(ath_token))
            rec.check('Athlete blocked from logging teammate recovery session', r.status_code == 403)

            # Coach views athlete's recovery history
            r = c.get(f'/api/recovery/sessions/athlete/{athlete_id}', headers=auth_header(coach_token))
            rec.check('Coach views athlete recovery history', r.status_code == 200
                      and r.get_json()['sessions'])

            # Athlete cannot create a prehab recommendation
            r = c.post('/api/recovery/prehab/recommendations', json={
                'athlete_id': athlete_id, 'exercises': [{'name': 'Hip bridge', 'sets': 3, 'reps': 10}],
            }, headers=auth_header(ath_token))
            rec.check('Athlete blocked from creating prehab recommendation', r.status_code == 403)

            # Coach creates a prehab recommendation
            r = c.post('/api/recovery/prehab/recommendations', json={
                'athlete_id': athlete_id,
                'exercises': [{'name': 'Hip bridge', 'sets': 3, 'reps': 10}],
                'recommendation_type': 'injury_prevention',
                'body_parts': ['hip', 'hamstring'],
            }, headers=auth_header(coach_token))
            rec.check('Coach creates prehab recommendation', r.status_code == 201)
            recommendation_id = r.get_json()['recommendation']['id']

            # Coach updates the recommendation
            r = c.put(f'/api/recovery/prehab/recommendations/{recommendation_id}', json={'status': 'completed'},
                      headers=auth_header(coach_token))
            rec.check('Coach updates prehab recommendation', r.status_code == 200)

            # Athlete can view their own prehab plan
            r = c.get(f'/api/recovery/prehab/recommendations/athlete/{athlete_id}', headers=auth_header(ath_token))
            rec.check('Athlete views own prehab plan', r.status_code == 200
                      and len(r.get_json()['recommendations']) == 1)

            # Athlete cannot view a teammate's prehab plan
            r = c.get(f'/api/recovery/prehab/recommendations/athlete/{other_athlete["id"]}',
                      headers=auth_header(ath_token))
            rec.check('Athlete blocked from viewing teammate prehab plan', r.status_code == 403)
    finally:
        teardown_app(app)

    return rec.report()


if __name__ == '__main__':
    sys.exit(main())
