"""Performance testing feature audit — run: python test_performance_tracking.py"""
import sys
from test_helpers import (
    Recorder, new_app, teardown_app, auth_header,
    register_and_login_coach, create_athlete, login_athlete,
)


def main():
    rec = Recorder('PERFORMANCE TRACKING TEST RESULTS')
    app = new_app()
    try:
        with app.test_client() as c:
            coach_token, _, team_id = register_and_login_coach(c, 'coach_perf', 'CoachPass1!')
            athlete, ath_username, ath_password = create_athlete(c, coach_token, team_id, 'Pat', 'Performer')
            ath_token, _ = login_athlete(c, ath_username, ath_password)
            athlete_id = athlete['id']

            # Athlete cannot log their own performance test
            r = c.post('/api/performance/', json={'athlete_id': athlete_id, 'test_type': 'strength'},
                       headers=auth_header(ath_token))
            rec.check('Athlete blocked from logging performance test', r.status_code == 403)

            # Coach logs a performance test
            r = c.post('/api/performance/', json={
                'athlete_id': athlete_id, 'test_type': 'combine',
                'sprint_40m': 5.2, 'vertical_jump': 55.0, 'bench_press_1rm': 80,
            }, headers=auth_header(coach_token))
            rec.check('Coach logs performance test', r.status_code == 201)
            test = r.get_json()['test']
            test_id = test['id']

            # Coach updates the test
            r = c.put(f'/api/performance/{test_id}', json={'sprint_40m': 5.0}, headers=auth_header(coach_token))
            rec.check('Coach updates performance test', r.status_code == 200
                      and r.get_json()['test']['sprint_40m'] == 5.0)

            # Athlete can view own performance history
            r = c.get('/api/performance/', headers=auth_header(ath_token))
            rec.check('Athlete views own performance history', r.status_code == 200
                      and r.get_json()['count'] == 1)

            # Coach from another team blocked from viewing/testing this athlete
            coach2_token, _, team2_id = register_and_login_coach(c, 'coach_perf_2', 'CoachPass2!')
            r = c.post('/api/performance/', json={'athlete_id': athlete_id, 'test_type': 'strength'},
                       headers=auth_header(coach2_token))
            rec.check('Other coach blocked from testing athlete', r.status_code == 403)

            r = c.get(f'/api/performance/{test_id}', headers=auth_header(coach2_token))
            rec.check('Other coach blocked from viewing test detail', r.status_code == 403)

            # Coach deletes a test
            r = c.delete(f'/api/performance/{test_id}', headers=auth_header(coach_token))
            rec.check('Coach deletes performance test', r.status_code == 200)

            r = c.get(f'/api/performance/{test_id}', headers=auth_header(coach_token))
            rec.check('Deleted test no longer retrievable', r.status_code == 404)
    finally:
        teardown_app(app)

    return rec.report()


if __name__ == '__main__':
    sys.exit(main())
