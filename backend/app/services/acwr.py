"""Canonical acute:chronic workload ratio calculations."""
from collections import defaultdict
from datetime import date, datetime, timedelta

from app.models import Athlete, WellnessEntry, WorkloadSession


# Keep interpretation in one place until the client confirms final labels.
ACWR_BANDS = {
    'detraining_upper_bound': 0.8,
    'optimal_upper_bound': 1.3,
    'high_risk_lower_bound': 1.5,
}


def classify_acwr(acwr):
    """Return the client-approved interpretation for an ACWR value."""
    if acwr > ACWR_BANDS['high_risk_lower_bound']:
        return 'high'
    if acwr >= ACWR_BANDS['optimal_upper_bound']:
        return 'moderate'
    if acwr < ACWR_BANDS['detraining_upper_bound']:
        return 'detraining'
    return 'optimal'


def _target_date(value=None):
    if value is None:
        return date.today()
    if isinstance(value, date):
        return value
    return datetime.strptime(value, '%Y-%m-%d').date()


def _daily_loads(athlete_id, start_date, end_date):
    sessions = WorkloadSession.query.filter(
        WorkloadSession.athlete_id == athlete_id,
        WorkloadSession.date >= start_date,
        WorkloadSession.date <= end_date,
    ).all()
    daily = defaultdict(float)
    for session in sessions:
        daily[session.date] += session.workload_score or 0
    explicit_dates = {session.date for session in sessions}
    wellness_entries = WellnessEntry.query.filter(
        WellnessEntry.athlete_id == athlete_id,
        WellnessEntry.date >= start_date,
        WellnessEntry.date <= end_date,
        WellnessEntry.previous_session_rpe.isnot(None),
        WellnessEntry.previous_session_duration.isnot(None),
    ).all()
    for entry in wellness_entries:
        if entry.date not in explicit_dates:
            daily[entry.date] += entry.previous_session_rpe * entry.previous_session_duration
    return daily, sessions


def calculate_acwr(athlete_id, target_date=None):
    """Return ACWR using current 7-day load / prior 4-week average load.

    Sessions on the same calendar day are summed before weekly totals are
    calculated. Missing days contribute zero to each seven-day week.
    """
    target = _target_date(target_date)
    acute_start = target - timedelta(days=6)
    chronic_start = acute_start - timedelta(days=28)
    daily, all_sessions = _daily_loads(athlete_id, chronic_start, target)

    acute_load = sum(daily[acute_start + timedelta(days=offset)] for offset in range(7))
    weekly_loads = []
    for week in range(4):
        week_start = chronic_start + timedelta(days=week * 7)
        weekly_loads.append(sum(daily[week_start + timedelta(days=offset)] for offset in range(7)))

    chronic_load = sum(weekly_loads) / 4
    acwr = acute_load / chronic_load if chronic_load else 0

    return {
        'acwr': round(acwr, 2),
        'risk_level': classify_acwr(acwr) if chronic_load else 'insufficient_data',
        'acute_workload': round(acute_load, 1),
        'chronic_workload': round(chronic_load, 1),
        'acute_average': round(acute_load / 7, 1),
        'chronic_average': round(chronic_load / 7, 1),
        'acute_days': 7,
        'chronic_days': 28,
        'acute_sessions_count': sum(1 for session in all_sessions if session.date >= acute_start),
        'chronic_sessions_count': len(all_sessions),
        'weekly_chronic_loads': [round(load, 1) for load in weekly_loads],
        'date': target.isoformat(),
    }


def calculate_team_acwr(team_id, target_date=None):
    """Aggregate ACWR across athletes with a non-zero chronic load."""
    athletes = Athlete.query.filter_by(team_id=team_id).all()
    athlete_results = [calculate_acwr(athlete.id, target_date) for athlete in athletes]
    included = [result for result in athlete_results if result['chronic_workload'] > 0]

    if not included:
        return {
            'acwr': 0,
            'risk_level': 'insufficient_data',
            'athlete_count': len(athlete_results),
            'included_athlete_count': 0,
            'date': _target_date(target_date).isoformat(),
        }

    team_acwr = sum(result['acwr'] for result in included) / len(included)
    return {
        'acwr': round(team_acwr, 2),
        'risk_level': classify_acwr(team_acwr),
        'athlete_count': len(athlete_results),
        'included_athlete_count': len(included),
        'acute_workload': round(sum(result['acute_workload'] for result in included) / len(included), 1),
        'chronic_workload': round(sum(result['chronic_workload'] for result in included) / len(included), 1),
        'date': _target_date(target_date).isoformat(),
    }
