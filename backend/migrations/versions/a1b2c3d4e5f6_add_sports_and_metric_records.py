"""Add sports, sport metrics, metric records; make athlete team optional

Revision ID: a1b2c3d4e5f6
Revises: e2a3b4c5d6f7
Create Date: 2026-11-10

"""
from alembic import op
import sqlalchemy as sa


revision = 'a1b2c3d4e5f6'
down_revision = 'e2a3b4c5d6f7'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'sports',
        sa.Column('id', sa.String(length=50), primary_key=True),
        sa.Column('name', sa.String(length=100), nullable=False, unique=True),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('icon', sa.String(length=10), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'sport_metrics',
        sa.Column('id', sa.String(length=50), primary_key=True),
        sa.Column('sport_id', sa.String(length=50), sa.ForeignKey('sports.id'), nullable=False),
        sa.Column('name', sa.String(length=100), nullable=False),
        sa.Column('unit', sa.String(length=30), nullable=True),
        sa.Column('description', sa.String(length=255), nullable=True),
        sa.Column('direction', sa.String(length=10), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )

    op.create_table(
        'metric_records',
        sa.Column('id', sa.String(length=50), primary_key=True),
        sa.Column('athlete_id', sa.String(length=50), sa.ForeignKey('athletes.id'), nullable=False),
        sa.Column('metric_id', sa.String(length=50), sa.ForeignKey('sport_metrics.id'), nullable=False),
        sa.Column('value', sa.Float(), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('notes', sa.String(length=255), nullable=True),
        sa.Column('recorded_by', sa.String(length=50), sa.ForeignKey('users.id'), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True),
    )

    with op.batch_alter_table('athletes') as batch_op:
        batch_op.alter_column('team_id', existing_type=sa.String(length=50), nullable=True)


def downgrade():
    with op.batch_alter_table('athletes') as batch_op:
        batch_op.alter_column('team_id', existing_type=sa.String(length=50), nullable=False)

    op.drop_table('metric_records')
    op.drop_table('sport_metrics')
    op.drop_table('sports')
