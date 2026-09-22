"""Injury & concussion RTP protocol audit — run: python test_injuries_concussion.py"""
import sys
from test_helpers import (
    Recorder, new_app, teardown_app, auth_header,
    register_and_login_coach, create_athlete, login_athlete,
)


def main():
    rec = Recorder('INJURY & CONCUSSION TEST RESULTS')
    app = new_app()
    try:
        with app.test_client() as c:
            coach_token, _, team_id = register_and_login_coach(c, 'coach_injury', 'CoachPass1!')
            athlete, ath_username, ath_password = create_athlete(c, coach_token, team_id, 'Ivy', 'Injured')
            ath_token, _ = login_athlete(c, ath_username, ath_password)
            athlete_id = athlete['id']

            # Athlete self-reports a non-concussion injury
            r = c.post('/api/injuries/', json={
                'athlete_id': athlete_id, 'injury_type': 'Sprain', 'body_part': 'Ankle',
                'severity': 'moderate', 'injury_context': 'sport_training',
            }, headers=auth_header(ath_token))
            rec.check('Athlete self-reports injury', r.status_code == 201)

            # Athlete cannot report an injury for a teammate
            other_athlete, other_username, _ = create_athlete(c, coach_token, team_id, 'Leo', 'Lonely')
            r = c.post('/api/injuries/', json={
                'athlete_id': other_athlete['id'], 'injury_type': 'Sprain', 'body_part': 'Knee',
                'severity': 'mild', 'injury_context': 'sport_match',
            }, headers=auth_header(ath_token))
            rec.check('Athlete blocked from reporting teammate injury', r.status_code == 403)

            # Coach logs a concussion injury
            r = c.post('/api/injuries/', json={
                'athlete_id': athlete_id, 'injury_type': 'Concussion', 'body_part': 'Head',
                'severity': 'severe', 'injury_context': 'sport_match', 'is_concussion': True,
            }, headers=auth_header(coach_token))
            rec.check('Coach logs concussion injury', r.status_code == 201)
            injury = r.get_json()['injury']
            injury_id = injury['id']
            rec.check('Injury flagged as concussion', injury.get('is_concussion') is True)

            # Athlete cannot advance RTP protocol
            r = c.post('/api/concussion/rtp/advance', json={'injury_id': injury_id}, headers=auth_header(ath_token))
            rec.check('Athlete blocked from advancing RTP stage', r.status_code == 403)

            # Coach starts RTP protocol (stage 1)
            r = c.post('/api/concussion/rtp/advance', json={'injury_id': injury_id}, headers=auth_header(coach_token))
            rec.check('Coach starts RTP protocol (stage 1)', r.status_code == 200
                      and r.get_json()['injury']['rtp_stage'] == 1)

            # Advancing again same day is blocked by the 24-hour minimum-duration rule
            r = c.post('/api/concussion/rtp/advance', json={'injury_id': injury_id}, headers=auth_header(coach_token))
            rec.check('RTP advance enforces 24h minimum stage duration', r.status_code == 400)

            # Coach records SCAT6 symptom assessment
            r = c.post('/api/concussion/symptom-scores', json={
                'injury_id': injury_id, 'assessment_date': injury['date_reported'],
                'headache': 2, 'dizziness': 1,
            }, headers=auth_header(coach_token))
            rec.check('Coach records symptom assessment', r.status_code == 201)
            rec.check('Total symptom score calculated',
                      r.get_json()['symptom_score'].get('total_symptom_score') is not None)

            # Symptom assessment rejected for non-concussion injury
            r = c.post('/api/injuries/', json={
                'athlete_id': athlete_id, 'injury_type': 'Bruise', 'body_part': 'Arm',
                'severity': 'mild', 'injury_context': 'sport_training',
            }, headers=auth_header(coach_token))
            plain_injury_id = r.get_json()['injury']['id']
            r = c.post('/api/concussion/symptom-scores', json={
                'injury_id': plain_injury_id, 'assessment_date': injury['date_reported'],
            }, headers=auth_header(coach_token))
            rec.check('Symptom assessment rejected for non-concussion injury', r.status_code == 400)

            # Medical clearance set ahead of stage 5
            r = c.post('/api/concussion/rtp/medical-clearance', json={'injury_id': injury_id},
                       headers=auth_header(coach_token))
            rec.check('Coach sets medical clearance', r.status_code == 200
                      and r.get_json()['injury']['rtp_medical_clearance'] is True)

            # Coach views team injuries; athlete only sees their own
            r = c.get('/api/injuries/', headers=auth_header(coach_token))
            rec.check('Coach views team injuries', r.status_code == 200 and r.get_json()['count'] >= 3)

            r = c.get('/api/injuries/', headers=auth_header(ath_token))
            body = r.get_json()
            rec.check('Athlete only sees own injuries',
                      r.status_code == 200 and all(i['athlete_id'] == athlete_id for i in body['injuries']))
    finally:
        teardown_app(app)

    return rec.report()


if __name__ == '__main__':
    sys.exit(main())
