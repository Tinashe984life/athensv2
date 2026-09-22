"""Add Herschell import fields (athlete demographics, extended performance metrics, normative benchmarks)

Revision ID: e2a3b4c5d6f7
Revises: d1e2f3a4b5c6
Create Date: 2026-09-13

"""
from alembic import op
import sqlalchemy as sa


revision = 'e2a3b4c5d6f7'
down_revision = 'd1e2f3a4b5c6'
branch_labels = None
depends_on = None


ATHLETE_COLUMNS = [
    ('sex', sa.String(length=20)),
    ('grade_level', sa.Integer()),
    ('class_group', sa.String(length=10)),
    ('extra_metadata', sa.JSON()),
]

PERFORMANCE_TEST_FLOAT_COLUMNS = [
    'sit_reach_cm', 'reach_cm', 'seated_height', 'bmi',
    'illinois_agility_left', 'illinois_agility_right',
    'sprint_10m_speed', 'sprint_40m_speed',
    'bleep_distance_run', 'bleep_vo2max',
    'y_balance_anterior_left', 'y_balance_posterolateral_left', 'y_balance_posteromedial_left',
    'y_balance_anterior_right', 'y_balance_posterolateral_right', 'y_balance_posteromedial_right',
    'y_balance_composite_left', 'y_balance_composite_right',
]
PERFORMANCE_TEST_INT_COLUMNS = ['sit_ups_1min', 'bleep_level', 'bleep_shuttle']
PERFORMANCE_TEST_JSON_COLUMNS = ['body_composition_metrics', 'norm_ratings']


def upgrade():
    for name, col_type in ATHLETE_COLUMNS:
        op.add_column('athletes', sa.Column(name, col_type, nullable=True))

    for name in PERFORMANCE_TEST_FLOAT_COLUMNS:
        op.add_column('performance_tests', sa.Column(name, sa.Float(), nullable=True))
    for name in PERFORMANCE_TEST_INT_COLUMNS:
        op.add_column('performance_tests', sa.Column(name, sa.Integer(), nullable=True))
    for name in PERFORMANCE_TEST_JSON_COLUMNS:
        op.add_column('performance_tests', sa.Column(name, sa.JSON(), nullable=True))

    op.create_table(
        'normative_benchmarks',
        sa.Column('id', sa.String(length=50), primary_key=True),
        sa.Column('test_type', sa.String(length=50), nullable=False),
        sa.Column('age', sa.Integer(), nullable=True),
        sa.Column('rating_label', sa.String(length=30), nullable=False),
        sa.Column('threshold_value', sa.Float(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_normative_benchmarks_test_type', 'normative_benchmarks', ['test_type'])


def downgrade():
    op.drop_index('ix_normative_benchmarks_test_type', table_name='normative_benchmarks')
    op.drop_table('normative_benchmarks')

    for name in PERFORMANCE_TEST_JSON_COLUMNS:
        op.drop_column('performance_tests', name)
    for name in PERFORMANCE_TEST_INT_COLUMNS:
        op.drop_column('performance_tests', name)
    for name in PERFORMANCE_TEST_FLOAT_COLUMNS:
        op.drop_column('performance_tests', name)

    for name, _ in reversed(ATHLETE_COLUMNS):
        op.drop_column('athletes', name)
