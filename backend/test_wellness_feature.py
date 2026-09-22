"""Wellness check-in feature audit — run: python test_wellness_feature.py"""
import sys
from test_helpers import (
    Recorder, new_app, teardown_app, auth_header,
    register_and_login_coach, create_athlete, login_athlete,
)


def main():
    rec = Recorder('WELLNESS FEATURE TEST RESULTS')
    app = new_app()
    try:
        with app.test_client() as c:
            coach_token, _, team_id = register_and_login_coach(c, 'coach_wellness', 'CoachPass1!')
            athlete, ath_username, ath_password = create_athlete(c, coach_token, team_id, 'Wanda', 'Wellness')
            ath_token, _ = login_athlete(c, ath_username, ath_password)

            wellness_payload = {
                'sleep_hours': 7.5, 'sleep_quality': 4, 'stress_level': 2,
                'muscle_soreness': 2, 'nutrition_quality': 4, 'mood': 4,
                'energy_level': 4, 'motivation_level': 4,
                'previous_session_rpe': 5, 'previous_session_duration': 60,
            }

            # Coach cannot submit a wellness entry
            r = c.post('/api/wellness/', json=wellness_payload, headers=auth_header(coach_token))
            rec.check('Coach blocked from submitting wellness entry', r.status_code == 403)

            # Athlete submits daily wellness entry
            r = c.post('/api/wellness/', json=wellness_payload, headers=auth_header(ath_token))
            rec.check('Athlete submits wellness entry', r.status_code == 201)
            entry = r.get_json().get('entry', {})
            rec.check('Readiness score auto-calculated', entry.get('readiness_score') is not None)

            # One entry per day enforced
            r = c.post('/api/wellness/', json=wellness_payload, headers=auth_header(ath_token))
            rec.check('Duplicate same-day entry rejected', r.status_code == 400)

            # Athlete can view today's entry
            r = c.get('/api/wellness/today', headers=auth_header(ath_token))
            rec.check('Athlete views today\'s entry', r.status_code == 200 and r.get_json().get('entry'))

            # Coach can view team wellness entries
            r = c.get('/api/wellness/', headers=auth_header(coach_token))
            body = r.get_json()
            rec.check('Coach views team wellness entries', r.status_code == 200 and body['count'] == 1)

            # A second athlete's entries are isolated from the first athlete
            other_athlete, other_username, other_password = create_athlete(c, coach_token, team_id, 'Nia', 'Neutral')
            other_token, _ = login_athlete(c, other_username, other_password)
            r = c.get('/api/wellness/today', headers=auth_header(other_token))
            rec.check('Other athlete has no entry for today yet', r.status_code == 200 and r.get_json().get('entry') is None)

            r = c.get(f"/api/wellness/?athlete_id={athlete['id']}", headers=auth_header(other_token))
            rec.check('Athlete cannot query wellness via athlete_id filter for teammate',
                       r.status_code != 200 or r.get_json().get('count', 0) == 0)
    finally:
        teardown_app(app)

    return rec.report()


if __name__ == '__main__':
    sys.exit(main())
