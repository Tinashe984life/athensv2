"""Add remaining specification performance fields

Revision ID: d1e2f3a4b5c6
Revises: c7f4a1b2d9e3
Create Date: 2026-08-24

"""
from alembic import op
import sqlalchemy as sa


revision = 'd1e2f3a4b5c6'
down_revision = 'c7f4a1b2d9e3'
branch_labels = None
depends_on = None


def upgrade():
    for name in (
        'sprint_5m', 'sprint_15m', 'stiff_arm_jump', 'cmj',
        'depth_drop_jump', 'knee_to_wall'
    ):
        op.add_column('performance_tests', sa.Column(name, sa.Float(), nullable=True))


def downgrade():
    for name in (
        'knee_to_wall', 'depth_drop_jump', 'cmj', 'stiff_arm_jump',
        'sprint_15m', 'sprint_5m'
    ):
        op.drop_column('performance_tests', name)