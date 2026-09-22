"""Seed NormativeBenchmark rows transcribed from
'H-SS-MASTER SHEET - normative data csv.csv' (Herschell import).

The source sheet packs several small lookup tables side-by-side with blank
separator columns and no single consistent shape, so the values below are
transcribed directly from the CSV rather than parsed generically at runtime.

Run: python seed_normative_benchmarks.py
"""
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import NormativeBenchmark

# Age-independent ladders: test_type -> [(threshold_value, rating_label), ...]
AGE_INDEPENDENT_LADDERS = {
    'sit_and_reach': [
        (0, 'Poor'), (16.1, 'Fair'), (21.1, 'Good'), (25.1, 'Very Good'), (29.1, 'Excellent'),
    ],
    'knee_to_wall': [
        (0, 'bad'), (12.5, 'good'),
    ],
    'sit_ups_2min': [
        (0, 'Very poor'), (36.1, 'Poor'), (50.1, 'below average'), (58.1, 'average'),
        (66.1, 'above average'), (74.1, 'Good'), (86, 'excellent'),
    ],
    'y_balance': [
        (0, 'Not completed'), (1, 'High risk'), (95.6, 'Low risk'), (120, 'Very low risk'),
    ],
    'illinois_agility_left': [
        (14, 'Excellent'), (16.9, 'Above Average'), (18, 'Average'), (21.8, 'Below Average'), (23, 'Poor'),
    ],
    'illinois_agility_right': [
        (17, 'Excellent'), (17.9, 'Above Average'), (21.7, 'Average'), (22.9, 'Below Average'), (60, 'Poor'),
    ],
}

# Age-banded tables: test_type -> {age: {rating_label: threshold_value}}
AGE_BANDED_TABLES = {
    'push_ups_1min': {
        13: {'Poor': 0, 'Below Avg': 8, 'Average': 14, 'Good': 20, 'Very good': 25, 'Excellent': 31},
        14: {'Poor': 0, 'Below Avg': 9, 'Average': 15, 'Good': 21, 'Very good': 26, 'Excellent': 32},
        15: {'Poor': 0, 'Below Avg': 10, 'Average': 16, 'Good': 22, 'Very good': 27, 'Excellent': 33},
        16: {'Poor': 0, 'Below Avg': 11, 'Average': 17, 'Good': 23, 'Very good': 28, 'Excellent': 34},
        17: {'Poor': 0, 'Below Avg': 12, 'Average': 18, 'Good': 24, 'Very good': 30, 'Excellent': 36},
        18: {'Poor': 0, 'Below Avg': 12, 'Average': 18, 'Good': 25, 'Very good': 30, 'Excellent': 36},
    },
    'bleep': {
        13: {'Not completed': 0, 'Very poor': 1, 'Poor': 2.6, 'Fair': 3.6, 'Average': 5.2, 'Good': 6.2, 'Very good': 7.5, 'Excellent': 9.3},
        14: {'Not completed': 0, 'Very poor': 1, 'Poor': 3.3, 'Fair': 5.3, 'Average': 6.5, 'Good': 7.6, 'Very good': 8.8, 'Excellent': 10.7},
        16: {'Not completed': 0, 'Very poor': 1, 'Poor': 4.2, 'Fair': 5.7, 'Average': 7.2, 'Good': 8.5, 'Very good': 9.8, 'Excellent': 11.1},
        18: {'Not completed': 0, 'Very poor': 1, 'Poor': 4.5, 'Fair': 5.8, 'Average': 7.3, 'Good': 8.7, 'Very good': 10.2, 'Excellent': 12.7},
    },
    'bleep_distance_run': {
        13: {'Not completed': 0, 'Very poor': 1, 'Poor': 260, 'Fair': 420, 'Average': 680, 'Good': 860, 'Very good': 1120, 'Excellent': 1500},
        14: {'Not completed': 0, 'Very poor': 1, 'Poor': 360, 'Fair': 700, 'Average': 920, 'Good': 1380, 'Very good': 1380, 'Excellent': 1800},
        16: {'Not completed': 0, 'Very poor': 1, 'Poor': 500, 'Fair': 780, 'Average': 1060, 'Good': 1600, 'Very good': 1600, 'Excellent': 2080},
        18: {'Not completed': 0, 'Very poor': 1, 'Poor': 560, 'Fair': 800, 'Average': 1080, 'Good': 1700, 'Very good': 1700, 'Excellent': 2260},
    },
}


def seed():
    app = create_app()
    with app.app_context():
        if NormativeBenchmark.query.count() > 0:
            print('NormativeBenchmark table already seeded, skipping.')
            return

        created = 0
        for test_type, ladder in AGE_INDEPENDENT_LADDERS.items():
            for threshold_value, rating_label in ladder:
                db.session.add(NormativeBenchmark(
                    id=str(uuid.uuid4()), test_type=test_type, age=None,
                    rating_label=rating_label, threshold_value=threshold_value,
                ))
                created += 1

        for test_type, age_bands in AGE_BANDED_TABLES.items():
            for age, ratings in age_bands.items():
                for rating_label, threshold_value in ratings.items():
                    db.session.add(NormativeBenchmark(
                        id=str(uuid.uuid4()), test_type=test_type, age=age,
                        rating_label=rating_label, threshold_value=threshold_value,
                    ))
                    created += 1

        db.session.commit()
        print(f'Seeded {created} NormativeBenchmark rows.')


if __name__ == '__main__':
    seed()
