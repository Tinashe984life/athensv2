"""Import Herschell athlete + performance-test data from the exported main-data CSV.

Source: backend/H-SS-Main data csv.csv (semicolon-delimited, cp1252 encoding,
comma-decimal locale mixed with some dot-decimal rows, various sentinel/error
values). See /memories/session/plan.md for the full column-mapping rationale.

Usage:
    python import_herschell_data.py --dry-run   # parse + report only, no DB writes
    python import_herschell_data.py              # perform the real import

Identity resolution: athletes are grouped by (sorted name+surname pair, DOB),
so name/surname-swapped rows for the same person + same DOB (including both
blank) are merged into one Athlete. Within a name pair, DOBs that are clearly
the same date with day/month transposed (e.g. 2008-02-12 vs 2008-12-02) are
also reconciled to a single canonical DOB (the earliest-appearing value).
Any remaining, genuinely conflicting non-blank DOBs for the same name pair are
treated as distinct athletes and written to duplicates_review.csv for manual
follow-up.
"""
import argparse
import csv
import os
import re
import sys
import uuid
from calendar import month_name
from datetime import date, datetime

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User, Team, Athlete, PerformanceTest

CSV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'H-SS-Main data csv.csv')
TEAM_NAME = 'Herschell'
COACH_USERNAME = 'herschell_coach'
COACH_PASSWORD = 'Herschell123!'  # temporary — change after import
COACH_NAME = 'Herschell'
COACH_SURNAME = 'Coach'

SENTINELS = {'', '#ref!', '#value!', 'incomplete', 'not completed', 'n/a'}
MONTH_NUM = {name.lower(): i for i, name in enumerate(month_name) if name}


def clean_str(value):
    if value is None:
        return None
    value = value.strip()
    if value.lower() in SENTINELS:
        return None
    return value or None


def parse_float(value, errors, field_name, row_num):
    value = clean_str(value)
    if value is None:
        return None
    normalized = value.replace(',', '.').replace(' ', '')
    try:
        return float(normalized)
    except ValueError:
        errors.append(f'Row {row_num}: could not parse float for {field_name!r}: {value!r}')
        return None


def parse_int(value, errors, field_name, row_num):
    parsed = parse_float(value, errors, field_name, row_num)
    return int(round(parsed)) if parsed is not None else None


def parse_dob(value, errors, row_num):
    value = clean_str(value)
    if value is None:
        return None
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%Y/%m/%d'):
        try:
            return datetime.strptime(value, fmt).date()
        except ValueError:
            continue
    # Fallback: some rows have day/month transposed (e.g. '2009-15-10' meaning day=15, month=10)
    parts = value.replace('/', '-').split('-')
    if len(parts) == 3 and len(parts[0]) == 4:
        try:
            year, maybe_day, maybe_month = int(parts[0]), int(parts[1]), int(parts[2])
            return date(year, maybe_month, maybe_day)
        except ValueError:
            pass
    errors.append(f'Row {row_num}: could not parse DOB: {value!r}')
    return None


def parse_grade(value):
    """Split '9P' -> (9, 'P'); '12' -> (12, None)."""
    value = clean_str(value)
    if value is None:
        return None, None
    digits = ''.join(ch for ch in value if ch.isdigit())
    letters = ''.join(ch for ch in value if ch.isalpha())
    return (int(digits) if digits else None), (letters or None)


def parse_test_date(year_raw, month_raw, warnings, errors, row_num):
    year = parse_int(year_raw, errors, 'TEST DATE YEAR', row_num)
    if year is None:
        return None
    month_str = clean_str(month_raw)
    month_num = MONTH_NUM.get(month_str.lower()) if month_str else None
    if month_num is None:
        warnings.append(f'Row {row_num}: TEST DATE MONTH missing/unrecognised ({month_raw!r}); defaulted to January')
        month_num = 1
    return date(year, month_num, 1)


def name_pair_key(name, surname):
    return tuple(sorted([(name or '').strip().lower(), (surname or '').strip().lower()]))


def parse_rows(errors, warnings):
    """Read the CSV and return a list of cleaned row dicts."""
    with open(CSV_PATH, encoding='cp1252', newline='') as f:
        reader = csv.reader(f, delimiter=';')
        header = next(reader)
        assert len(header) == 101, f'Unexpected column count: {len(header)}'

        parsed_rows = []
        for row_num, raw in enumerate(reader, start=2):
            if not any(clean_str(v) for v in raw):
                continue  # skip fully blank rows
            r = raw + [''] * (101 - len(raw))  # defensive padding for short rows

            name = clean_str(r[0])
            surname = clean_str(r[1])
            if not name or not surname:
                errors.append(f'Row {row_num}: missing NAME or SURNAME, skipped')
                continue

            dob = parse_dob(r[3], errors, row_num)
            grade_level, class_group = parse_grade(r[5])
            test_date = parse_test_date(r[6], r[7], warnings, errors, row_num)
            if test_date is None:
                errors.append(f'Row {row_num}: no TEST DATE YEAR, skipped')
                continue

            body_composition = {k: v for k, v in {
                'tbw': parse_float(r[21], errors, 'TBW', row_num),
                'bfm_kg': parse_float(r[22], errors, 'BFM (kg)', row_num),
                'ffm_kg': parse_float(r[23], errors, 'FFM (kg)', row_num),
                'smm_kg': parse_float(r[24], errors, 'SMM (kg)', row_num),
                'ffm_kg_right_leg': parse_float(r[27], errors, 'FFM (kg) (right leg)', row_num),
                'ffm_pct_right_leg': parse_float(r[28], errors, 'FFM% (right leg)', row_num),
                'ffm_kg_left_leg': parse_float(r[29], errors, 'FFM (kg) (left leg)', row_num),
                'ffm_pct_left_leg': parse_float(r[30], errors, 'FFM% (left leg)', row_num),
                'bfm_kg_right_leg': parse_float(r[31], errors, 'BFM (kg) (right leg)', row_num),
                'bfm_pct_right_leg': parse_float(r[32], errors, 'BFM% (right leg)', row_num),
                'bfm_kg_left_leg': parse_float(r[33], errors, 'BFM (kg) (left leg)', row_num),
                'bfm_pct_left_leg': parse_float(r[34], errors, 'BFM% (left leg)', row_num),
                'impedance_20khz_rl': parse_float(r[35], errors, '20kHz RL impedance', row_num),
                'impedance_20khz_ll': parse_float(r[36], errors, '20kHz LL impedance', row_num),
                'impedance_100khz_rl': parse_float(r[37], errors, '100kHz RL impedance', row_num),
                'impedance_100khz_ll': parse_float(r[38], errors, '100kHz LL impedance', row_num),
                'growth_score': parse_float(r[39], errors, 'GROWTH SCORE', row_num),
                'whr': parse_float(r[40], errors, 'WHR', row_num),
                'smi': parse_float(r[41], errors, 'SMI', row_num),
                'stiff_arm_flight_time': parse_float(r[43], errors, 'Stiff arm [Flight-Time]', row_num),
                'cmj_flight_time': parse_float(r[45], errors, 'CMJ [Flight-Time]', row_num),
                'single_leg_jump_left_flight_time': parse_float(r[47], errors, 'Single Leg CMJ (L) Flight-Time', row_num),
                'single_leg_jump_right_flight_time': parse_float(r[49], errors, 'Single Leg CMJ (R) Flight-Time', row_num),
                'peak_power_stiff_arm': parse_float(r[50], errors, 'Stiff arm Peak Anaerobic Power', row_num),
                'peak_power_cmj': parse_float(r[52], errors, 'CMJ Peak Anaerobic Power', row_num),
                'peak_power_cmj_left': parse_float(r[54], errors, 'CMJ LEFT Peak Anaerobic Power', row_num),
                'peak_power_cmj_right': parse_float(r[56], errors, 'CMJ RIGHT Peak Anaerobic Power', row_num),
                'mid_thigh_left_cm': parse_float(r[66], errors, 'MID THIGH LEFT', row_num),
                'mid_thigh_right_cm': parse_float(r[67], errors, 'MID THIGH RIGHT', row_num),
                'bleep_combined': parse_float(r[94], errors, 'BLEEP', row_num),
            }.items() if v is not None}

            norm_ratings = {k: v for k, v in {
                'stiff_arm_power': clean_str(r[51]),
                'cmj_power': clean_str(r[53]),
                'cmj_left_power': clean_str(r[55]),
                'cmj_right_power': clean_str(r[57]),
                'flexibility': clean_str(r[61]),
                'knee_to_wall_left': clean_str(r[63]),
                'knee_to_wall_right': clean_str(r[65]),
                'y_balance_left': clean_str(r[75]),
                'y_balance_right': clean_str(r[77]),
                'sit_ups_1min': clean_str(r[79]),
                'sit_ups_2min': clean_str(r[81]),
                'push_ups_1min': clean_str(r[83]),
                'illinois_agility_left': clean_str(r[85]),
                'illinois_agility_right': clean_str(r[87]),
                'sprint_10m': clean_str(r[90]),
                'sprint_40m': clean_str(r[93]),
                'bleep': clean_str(r[95]),
                'distance_run': clean_str(r[99]),
            }.items() if v is not None}

            extra_metadata = {k: v for k, v in {
                'grade_raw': clean_str(r[5]),
                'sex_raw': clean_str(r[2]),
                'winter_sport_1_team': clean_str(r[10]),
                'winter_sport_2': clean_str(r[12]),
                'winter_sport_2_team': clean_str(r[13]),
                'winter_sport_2_position': clean_str(r[14]),
                'summer_sport_1_team': clean_str(r[16]),
            }.items() if v is not None}

            parsed_rows.append({
                'row_num': row_num,
                'name': name,
                'surname': surname,
                'sex': clean_str(r[2]),
                'dob': dob,
                'age': parse_int(r[4], errors, 'AGE', row_num),
                'grade_level': grade_level,
                'class_group': class_group,
                'term': parse_int(r[8], errors, 'TEST TERM', row_num),
                'test_date': test_date,
                'winter_sporting_code': clean_str(r[9]),
                'winter_sport_1_position': clean_str(r[11]),
                'summer_sporting_code': clean_str(r[15]),
                'summer_sport_1_position': clean_str(r[17]),
                'extra_metadata': extra_metadata,
                'seated_height': parse_float(r[18], errors, 'SEATED HEIGHT', row_num),
                'height': parse_float(r[19], errors, 'STANDING HEIGHT', row_num),
                'weight': parse_float(r[20], errors, 'WEIGHT', row_num),
                'bmi': parse_float(r[25], errors, 'BMI', row_num),
                'body_fat_percentage': parse_float(r[26], errors, '%BF', row_num),
                'stiff_arm_jump': parse_float(r[42], errors, 'Stiff arm [Height]', row_num),
                'cmj': parse_float(r[44], errors, 'CMJ [Height]', row_num),
                'single_leg_jump_left': parse_float(r[46], errors, 'Single Leg CMJ (L) Height', row_num),
                'single_leg_jump_right': parse_float(r[48], errors, 'Single Leg CMJ (R) Height', row_num),
                'sit_reach_cm': parse_float(r[58], errors, 'Sit (cm)', row_num),
                'reach_cm': parse_float(r[59], errors, 'Reach (cm)', row_num),
                'sit_and_reach': parse_float(r[60], errors, 'Flexibility', row_num),
                'dorsiflexion_left': parse_float(r[62], errors, 'K2W (L)', row_num),
                'dorsiflexion_right': parse_float(r[64], errors, 'K2W (R)', row_num),
                'y_balance_anterior_left': parse_float(r[68], errors, 'Anterior (L)', row_num),
                'y_balance_posterolateral_left': parse_float(r[69], errors, 'Posterolateral (L)', row_num),
                'y_balance_posteromedial_left': parse_float(r[70], errors, 'Posteromedial (L)', row_num),
                'y_balance_anterior_right': parse_float(r[71], errors, 'Anterior (R)', row_num),
                'y_balance_posterolateral_right': parse_float(r[72], errors, 'Posterolateral (R)', row_num),
                'y_balance_posteromedial_right': parse_float(r[73], errors, 'Posteromedial (R)', row_num),
                'y_balance_composite_left': parse_float(r[74], errors, 'Composite score LEFT', row_num),
                'y_balance_composite_right': parse_float(r[76], errors, 'Composite score RIGHT', row_num),
                'sit_ups_1min': parse_int(r[78], errors, '1-min sit up', row_num),
                'sit_ups_2min': parse_int(r[80], errors, '2-min Sit-ups', row_num),
                'push_ups_1min': parse_int(r[82], errors, '1-min push up', row_num),
                'illinois_agility_left': parse_float(r[84], errors, 'Illinois (L)', row_num),
                'illinois_agility_right': parse_float(r[86], errors, 'Illinois (R)', row_num),
                'sprint_10m': parse_float(r[88], errors, '10m sprint TIME', row_num),
                'sprint_10m_speed': parse_float(r[89], errors, '10m sprint SPEED', row_num),
                'sprint_40m': parse_float(r[91], errors, '40m sprint TIME', row_num),
                'sprint_40m_speed': parse_float(r[92], errors, '40m sprint SPEED', row_num),
                'bleep_score': parse_float(r[94], errors, 'BLEEP', row_num),
                'bleep_level': parse_int(r[96], errors, 'Beep test score LEVEL', row_num),
                'bleep_shuttle': parse_int(r[97], errors, 'Beep test score SHUTTLE', row_num),
                'bleep_distance_run': parse_float(r[98], errors, 'Distance Run', row_num),
                'bleep_vo2max': parse_float(r[100], errors, 'VO2MAX', row_num),
                'body_composition_metrics': body_composition,
                'norm_ratings': norm_ratings,
            })
        return parsed_rows


def cluster_athletes(rows, review):
    """Group rows into athlete clusters keyed by (sorted name pair, canonical DOB).

    Within each name pair, DOBs that are day/month transpositions of each
    other (same year, day/month swapped) are reconciled to a single
    canonical value; any other distinct non-blank DOBs are left as separate
    clusters and flagged for manual review.
    """
    by_pair = {}
    for row in rows:
        pair = name_pair_key(row['name'], row['surname'])
        by_pair.setdefault(pair, []).append(row)

    clusters = {}
    for pair, pair_rows in by_pair.items():
        seen_dobs = []
        for row in pair_rows:
            if row['dob'] is not None and row['dob'] not in seen_dobs:
                seen_dobs.append(row['dob'])

        canonical = {d: d for d in seen_dobs}
        for i, d1 in enumerate(seen_dobs):
            for d2 in seen_dobs[i + 1:]:
                same_year = d1.year == d2.year
                transposed = d1.day == d2.month and d1.month == d2.day and d1 != d2
                if same_year and transposed:
                    canonical[d2] = canonical[d1]

        remaining_non_null = sorted(set(canonical.values()))
        if len(remaining_non_null) > 1:
            review.append(
                f'Name pair {pair}: {len(remaining_non_null)} conflicting DOBs found {remaining_non_null} '
                '- treated as distinct athletes, review manually.'
            )

        for row in pair_rows:
            resolved_dob = canonical.get(row['dob'], row['dob'])
            key = (pair, resolved_dob)
            clusters.setdefault(key, []).append(row)

    return clusters


def get_or_create_coach_team(dry_run):
    coach = User.query.filter_by(username=COACH_USERNAME).first()
    if not coach:
        coach = User(id=str(uuid.uuid4()), username=COACH_USERNAME, name=COACH_NAME,
                     surname=COACH_SURNAME, role='coach')
        coach.set_password(COACH_PASSWORD)
        if not dry_run:
            db.session.add(coach)
            db.session.flush()

    team = Team.query.filter_by(name=TEAM_NAME).first()
    if not team:
        team = Team(id=f'TEAM-{uuid.uuid4().hex[:8].upper()}', name=TEAM_NAME, coach_id=coach.id)
        if not dry_run:
            db.session.add(team)
            db.session.flush()
    return coach, team


def unique_username(name, surname, taken_usernames):
    base = f'{name.lower()}.{surname.lower()}'.replace(' ', '')
    username = base
    counter = 1
    while username in taken_usernames:
        username = f'{base}{counter}'
        counter += 1
    taken_usernames.add(username)
    return username


def import_data(dry_run):
    errors = []
    warnings = []
    review = []
    rows = parse_rows(errors, warnings)
    clusters = cluster_athletes(rows, review)

    athletes_created = 0
    tests_created = 0
    tests_skipped = 0

    coach, team = get_or_create_coach_team(dry_run)

    # Preload existing state once to avoid a DB round-trip per row.
    taken_usernames = {u for (u,) in User.query.with_entities(User.username).all()}
    existing_athletes = {}
    for athlete_id, name, surname, dob in (
        db.session.query(Athlete.id, User.name, User.surname, Athlete.date_of_birth)
        .join(User, Athlete.user_id == User.id).all()
    ):
        existing_athletes[(name_pair_key(name, surname), dob)] = athlete_id
    existing_tests = set()
    row_marker_re = re.compile(r'Herschell import \(source row (\d+)\)')
    for athlete_id, notes in db.session.query(PerformanceTest.athlete_id, PerformanceTest.notes).all():
        match = row_marker_re.search(notes or '')
        if match:
            existing_tests.add((athlete_id, int(match.group(1))))

    total_clusters = len(clusters)
    for cluster_index, ((name_pair, dob), group_rows) in enumerate(clusters.items(), start=1):
        if cluster_index % 100 == 0:
            print(f'  ... processed {cluster_index}/{total_clusters} athlete clusters', flush=True)

        first = group_rows[0]
        existing_athlete_id = existing_athletes.get((name_pair, dob))

        if existing_athlete_id:
            athlete_id = existing_athlete_id
        else:
            username = unique_username(first['name'], first['surname'], taken_usernames) if not dry_run else None
            athlete_id = f'ATH-{uuid.uuid4().hex[:8].upper()}'
            user_id = str(uuid.uuid4())
            if not dry_run:
                user = User(id=user_id, username=username, name=first['name'], surname=first['surname'], role='athlete')
                user.set_password('password123')
                db.session.add(user)

                athlete = Athlete(
                    id=athlete_id, user_id=user_id, team_id=team.id,
                    age=first['age'], date_of_birth=dob, height=first['height'], weight=first['weight'],
                    position=first['winter_sport_1_position'] or first['summer_sport_1_position'],
                    summer_sporting_code=first['summer_sporting_code'], winter_sporting_code=first['winter_sporting_code'],
                    bleep_score=first['bleep_score'], sex=first['sex'], grade_level=first['grade_level'],
                    class_group=first['class_group'], extra_metadata=first['extra_metadata'],
                )
                db.session.add(athlete)
            existing_athletes[(name_pair, dob)] = athlete_id
            athletes_created += 1

        for row in group_rows:
            test_key = (athlete_id, row['row_num'])
            if test_key in existing_tests:
                tests_skipped += 1
                continue
            existing_tests.add(test_key)

            if not dry_run:
                test = PerformanceTest(
                    id=str(uuid.uuid4()), athlete_id=athlete_id, test_date=row['test_date'], term=row['term'],
                    test_type='combine',
                    notes=f"Herschell import (source row {row['row_num']})",
                    height=row['height'], weight=row['weight'], body_fat_percentage=row['body_fat_percentage'],
                    push_ups_1min=row['push_ups_1min'], sit_ups_2min=row['sit_ups_2min'], sit_ups_1min=row['sit_ups_1min'],
                    sprint_10m=row['sprint_10m'], sprint_40m=row['sprint_40m'],
                    sprint_10m_speed=row['sprint_10m_speed'], sprint_40m_speed=row['sprint_40m_speed'],
                    illinois_agility_left=row['illinois_agility_left'], illinois_agility_right=row['illinois_agility_right'],
                    vertical_jump=None, single_leg_jump_left=row['single_leg_jump_left'],
                    single_leg_jump_right=row['single_leg_jump_right'], stiff_arm_jump=row['stiff_arm_jump'], cmj=row['cmj'],
                    sit_and_reach=row['sit_and_reach'], knee_to_wall=None,
                    dorsiflexion_left=row['dorsiflexion_left'], dorsiflexion_right=row['dorsiflexion_right'],
                    sit_reach_cm=row['sit_reach_cm'], reach_cm=row['reach_cm'],
                    seated_height=row['seated_height'], bmi=row['bmi'],
                    bleep_level=row['bleep_level'], bleep_shuttle=row['bleep_shuttle'],
                    bleep_distance_run=row['bleep_distance_run'], bleep_vo2max=row['bleep_vo2max'],
                    y_balance_anterior_left=row['y_balance_anterior_left'],
                    y_balance_posterolateral_left=row['y_balance_posterolateral_left'],
                    y_balance_posteromedial_left=row['y_balance_posteromedial_left'],
                    y_balance_anterior_right=row['y_balance_anterior_right'],
                    y_balance_posterolateral_right=row['y_balance_posterolateral_right'],
                    y_balance_posteromedial_right=row['y_balance_posteromedial_right'],
                    y_balance_composite_left=row['y_balance_composite_left'],
                    y_balance_composite_right=row['y_balance_composite_right'],
                    body_composition_metrics=row['body_composition_metrics'] or None,
                    norm_ratings=row['norm_ratings'] or None,
                )
                db.session.add(test)
            tests_created += 1

        if not dry_run and cluster_index % 100 == 0:
            db.session.commit()

    if not dry_run:
        db.session.commit()

    return {
        'rows_parsed': len(rows),
        'athlete_clusters': len(clusters),
        'athletes_created': athletes_created,
        'tests_created': tests_created,
        'tests_skipped_existing': tests_skipped,
        'parse_errors': errors,
        'parse_warnings': warnings,
        'duplicate_review': review,
    }


def write_review_files(result):
    backend_dir = os.path.dirname(os.path.abspath(__file__))
    if result['duplicate_review']:
        with open(os.path.join(backend_dir, 'duplicates_review.csv'), 'w', encoding='utf-8', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['issue'])
            for line in result['duplicate_review']:
                writer.writerow([line])
    if result['parse_errors']:
        with open(os.path.join(backend_dir, 'import_parse_errors.log'), 'w', encoding='utf-8') as f:
            f.write('\n'.join(result['parse_errors']))
    if result['parse_warnings']:
        with open(os.path.join(backend_dir, 'import_parse_warnings.log'), 'w', encoding='utf-8') as f:
            f.write('\n'.join(result['parse_warnings']))


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true', help='Parse and report only, no DB writes')
    args = parser.parse_args()

    app = create_app()
    with app.app_context():
        result = import_data(dry_run=args.dry_run)
        write_review_files(result)

        print(f'\n{"DRY RUN" if args.dry_run else "IMPORT"} SUMMARY')
        print('=' * 50)
        print(f"Rows parsed:              {result['rows_parsed']}")
        print(f"Athlete clusters found:   {result['athlete_clusters']}")
        print(f"Athletes created:         {result['athletes_created']}")
        print(f"Performance tests created:{result['tests_created']}")
        print(f"Tests skipped (existing): {result['tests_skipped_existing']}")
        print(f"Parse errors:             {len(result['parse_errors'])} (see import_parse_errors.log)")
        print(f"Parse warnings:           {len(result['parse_warnings'])} (see import_parse_warnings.log)")
        print(f"Duplicate-review items:   {len(result['duplicate_review'])} (see duplicates_review.csv)")


if __name__ == '__main__':
    main()
