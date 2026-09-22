"""Dashboard & risk assessment audit — run: python test_dashboard_risk.py

Note: some checks below assert the SECURE expected behavior (an athlete
should not see another athlete's individual risk data). If the endpoint
does not yet enforce this, the check will FAIL, surfacing a real RBAC gap
in app/routes/dashboard.py (athlete-risk / workload-analysis endpoints
only branch on role == 'coach' and do not deny role == 'athlete' for a
mismatched athlete_id).
"""
import sys
from test_helpers import (
    Recorder, new_app, teardown_app, auth_header,
    register_and_login_coach, create_athlete, login_athlete,
)


def main():
    rec = Recorder('DASHBOARD & RISK ASSESSMENT TEST RESULTS')
    app = new_app()
    try:
        with app.test_client() as c:
            coach_token, _, team_id = register_and_login_coach(c, 'coach_dash', 'CoachPass1!')
            athlete, ath_username, ath_password = create_athlete(c, coach_token, team_id, 'Dan', 'Dashboard')
            ath_token, _ = login_athlete(c, ath_username, ath_password)
            athlete_id = athlete['id']

            # Coach team overview
            r = c.get('/api/dashboard/team-overview', headers=auth_header(coach_token))
            rec.check('Coach views team overview', r.status_code == 200
                      and r.get_json()['teams'][0]['team_id'] == team_id)

            # Athlete blocked from team overview
            r = c.get('/api/dashboard/team-overview', headers=auth_header(ath_token))
            rec.check('Athlete blocked from team overview', r.status_code == 403)

            # Coach views athlete risk assessment
            r = c.get(f'/api/dashboard/athlete-risk/{athlete_id}', headers=auth_header(coach_token))
            rec.check('Coach views athlete risk assessment', r.status_code == 200
                      and 'overall_risk' in r.get_json().get('risk_assessment', {}))

            # Coach views team risk summary
            r = c.get('/api/dashboard/team-risk-summary', headers=auth_header(coach_token))
            rec.check('Coach views team risk summary', r.status_code == 200)

            # Athlete blocked from team risk summary
            r = c.get('/api/dashboard/team-risk-summary', headers=auth_header(ath_token))
            rec.check('Athlete blocked from team risk summary', r.status_code == 403)

            # A second coach cannot view this athlete's risk assessment
            coach2_token, _, _ = register_and_login_coach(c, 'coach_dash_2', 'CoachPass2!')
            r = c.get(f'/api/dashboard/athlete-risk/{athlete_id}', headers=auth_header(coach2_token))
            rec.check('Other coach blocked from viewing athlete risk assessment', r.status_code == 403)

            r = c.get(f'/api/dashboard/workload-analysis/{athlete_id}', headers=auth_header(coach2_token))
            rec.check('Other coach blocked from viewing workload analysis', r.status_code == 403)

            # An unrelated athlete should not be able to view this athlete's risk data
            other_athlete, other_username, _ = create_athlete(c, coach_token, team_id, 'Ola', 'Other')
            other_token, _ = login_athlete(c, other_username, 'password123')
            r = c.get(f'/api/dashboard/athlete-risk/{athlete_id}', headers=auth_header(other_token))
            rec.check('Athlete blocked from viewing teammate risk assessment', r.status_code == 403)

            r = c.get(f'/api/dashboard/workload-analysis/{athlete_id}', headers=auth_header(other_token))
            rec.check('Athlete blocked from viewing teammate workload analysis', r.status_code == 403)
    finally:
        teardown_app(app)

    return rec.report()


if __name__ == '__main__':
    sys.exit(main())
