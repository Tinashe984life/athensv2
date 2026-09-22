"""Workload session & ACWR calculation audit — run: python test_workload_acwr.py"""
import sys
from datetime import date, timedelta
from test_helpers import (
    Recorder, new_app, teardown_app, auth_header,
    register_and_login_coach, create_athlete, login_athlete,
)


def log_session(client, token, athlete_id, day, perceived_exertion, duration_minutes):
    return client.post('/api/workload/sessions', json={
        'athlete_id': athlete_id,
        'date': day.isoformat(),
        'session_type': 'training',
        'perceived_exertion': perceived_exertion,
        'duration_minutes': duration_minutes,
    }, headers=auth_header(token))


def main():
    rec = Recorder('WORKLOAD & ACWR TEST RESULTS')
    app = new_app()
    try:
        with app.test_client() as c:
            coach_token, _, team_id = register_and_login_coach(c, 'coach_workload', 'CoachPass1!')
            athlete, ath_username, ath_password = create_athlete(c, coach_token, team_id, 'Wes', 'Workload')
            ath_token, _ = login_athlete(c, ath_username, ath_password)
            athlete_id = athlete['id']

            today = date.today()

            # Chronic period: 28 days at 300 load/day (perceived_exertion 6 x 50 min)
            all_ok = True
            for offset in range(7, 35):
                r = log_session(c, coach_token, athlete_id, today - timedelta(days=offset), 6, 50)
                all_ok = all_ok and r.status_code == 201
            rec.check('Coach logs 28 chronic-period workload sessions', all_ok)

            # Acute period: last 7 days at 400 load/day (perceived_exertion 8 x 50 min)
            all_ok = True
            session_ids = []
            for offset in range(0, 7):
                r = log_session(c, coach_token, athlete_id, today - timedelta(days=offset), 8, 50)
                all_ok = all_ok and r.status_code == 201
                if r.status_code == 201:
                    session_ids.append(r.get_json()['session']['id'])
            rec.check('Coach logs 7 acute-period workload sessions', all_ok)

            # ACWR calculation matches expected ratio (2800 acute / 2100 chronic avg = 1.33, moderate)
            # Checked before any additional sessions are added below, to keep the load totals deterministic.
            r = c.get(f'/api/workload/acwr/{athlete_id}', headers=auth_header(coach_token))
            body = r.get_json()
            rec.check('ACWR endpoint returns 200', r.status_code == 200)
            rec.check('ACWR value approx 1.33 (within tolerance)',
                       abs(body.get('acwr', 0) - 1.33) < 0.05, detail=str(body.get('acwr')))
            rec.check('ACWR classified as moderate risk', body.get('risk_level') == 'moderate',
                       detail=body.get('risk_level'))

            # Athlete cannot log workload for a teammate
            other_athlete, _, _ = create_athlete(c, coach_token, team_id, 'Zed', 'Zulu')
            r = log_session(c, ath_token, other_athlete['id'], today, 5, 30)
            rec.check('Athlete blocked from logging workload for teammate', r.status_code == 403)

            # Athlete can log their own workload session (well outside the ACWR window used above)
            r = log_session(c, ath_token, athlete_id, today - timedelta(days=200), 5, 30)
            rec.check('Athlete logs own workload session', r.status_code == 201)

            # Team ACWR summary accessible to coach
            r = c.get(f'/api/workload/team-acwr/{team_id}', headers=auth_header(coach_token))
            rec.check('Coach views team ACWR summary', r.status_code == 200)

            # Athlete cannot view another athlete's ACWR
            other_ath_user = other_athlete['user']
            other_token, _ = login_athlete(c, other_ath_user['username'], 'password123')
            r = c.get(f'/api/workload/acwr/{athlete_id}', headers=auth_header(other_token))
            rec.check('Athlete blocked from viewing teammate ACWR', r.status_code == 403)

            # Coach updates and deletes a session
            r = c.put(f'/api/workload/sessions/{session_ids[0]}', json={'duration_minutes': 55},
                      headers=auth_header(coach_token))
            rec.check('Coach updates workload session', r.status_code == 200)

            r = c.delete(f'/api/workload/sessions/{session_ids[0]}', headers=auth_header(coach_token))
            rec.check('Coach deletes workload session', r.status_code == 200)
    finally:
        teardown_app(app)

    return rec.report()


if __name__ == '__main__':
    sys.exit(main())
