"""Add client feedback athlete metrics and performance terms

Revision ID: c7f4a1b2d9e3
Revises: fb43dbe2f11e
Create Date: 2026-08-22

"""
from alembic import op
import sqlalchemy as sa


revision = 'c7f4a1b2d9e3'
down_revision = 'fb43dbe2f11e'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('athletes', sa.Column('summer_sporting_code', sa.String(length=100), nullable=True))
    op.add_column('athletes', sa.Column('winter_sporting_code', sa.String(length=100), nullable=True))
    op.add_column('athletes', sa.Column('bleep_score', sa.Float(), nullable=True))
    op.add_column('athletes', sa.Column('sport_attendance', sa.Float(), nullable=True))
    op.add_column('athletes', sa.Column('gym_attendance', sa.Float(), nullable=True))
    op.add_column('performance_tests', sa.Column('term', sa.Integer(), nullable=True))
    op.add_column('injury_records', sa.Column('injury_context', sa.String(length=30), nullable=True))
    op.add_column('injury_records', sa.Column('injury_context_other', sa.String(length=200), nullable=True))
    op.add_column('recovery_sessions', sa.Column('modalities', sa.Text(), nullable=True))
    op.create_table('notifications',
        sa.Column('id', sa.String(length=50), nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('notification_type', sa.String(length=50), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('priority', sa.String(length=20), nullable=False),
        sa.Column('target_date', sa.Date(), nullable=False),
        sa.Column('is_read', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id']),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'notification_type', 'target_date', name='uq_notification_user_type_date'),
    )


def downgrade():
    op.drop_table('notifications')
    op.drop_column('injury_records', 'injury_context_other')
    op.drop_column('injury_records', 'injury_context')
    op.drop_column('recovery_sessions', 'modalities')
    op.drop_column('performance_tests', 'term')
    op.drop_column('athletes', 'gym_attendance')
    op.drop_column('athletes', 'sport_attendance')
    op.drop_column('athletes', 'bleep_score')
    op.drop_column('athletes', 'winter_sporting_code')
    op.drop_column('athletes', 'summer_sporting_code')
