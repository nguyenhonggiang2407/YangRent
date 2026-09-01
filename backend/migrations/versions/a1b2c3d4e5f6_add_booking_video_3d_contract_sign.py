"""Add booking fields, video/3D view, contract signing, room_videos table

Revision ID: a1b2c3d4e5f6
Revises: 3f2ad5f07e7a
Create Date: 2026-08-18
"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = '3f2ad5f07e7a'
branch_labels = None
depends_on = None


def _col_exists(table, col):
    """Kiem tra cot da ton tai chua."""
    bind = op.get_bind()
    result = bind.execute(sa.text(
        f"SELECT column_name FROM information_schema.columns "
        f"WHERE table_name='{table}' AND column_name='{col}'"
    ))
    return result.fetchone() is not None


def _add_col(table, col_def):
    """Add cot chi neu chua ton tai."""
    if not _col_exists(table, col_def.name):
        op.add_column(table, col_def)


def upgrade() -> None:
    # === rooms: 3D view + video ===
    _add_col('rooms', sa.Column('view_3d_url', sa.String(500), nullable=True))
    _add_col('rooms', sa.Column('view_360_enabled', sa.Boolean(), server_default='false', nullable=False))
    _add_col('rooms', sa.Column('video_url', sa.String(500), nullable=True))

    # === contracts: signature fields ===
    _add_col('contracts', sa.Column('tenant_signed_at', sa.DateTime(), nullable=True))
    _add_col('contracts', sa.Column('landlord_signed_at', sa.DateTime(), nullable=True))
    _add_col('contracts', sa.Column('tenant_signature_name', sa.String(120), nullable=True))
    _add_col('contracts', sa.Column('landlord_signature_name', sa.String(120), nullable=True))

    # === rental_requests: booking fields ===
    _add_col('rental_requests', sa.Column('move_in_date', sa.String(30), nullable=True))
    _add_col('rental_requests', sa.Column('lease_duration', sa.Integer(), nullable=True))
    _add_col('rental_requests', sa.Column('deposit_amount', sa.Integer(), server_default='0', nullable=False))

    # === room_videos: new table ===
    bind = op.get_bind()
    exists = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='room_videos')"
    )).scalar()
    if not exists:
        op.create_table(
            'room_videos',
            sa.Column('id', sa.Integer(), primary_key=True),
            sa.Column('room_id', sa.Integer(), sa.ForeignKey('rooms.id', ondelete='CASCADE'), index=True),
            sa.Column('video_url', sa.String(500), nullable=False),
            sa.Column('title', sa.String(200), server_default=''),
            sa.Column('sort_order', sa.Integer(), server_default='0'),
            sa.Column('created_at', sa.DateTime(), server_default=sa.func.now()),
        )


def downgrade() -> None:
    bind = op.get_bind()
    exists = bind.execute(sa.text(
        "SELECT EXISTS(SELECT 1 FROM information_schema.tables WHERE table_name='room_videos')"
    )).scalar()
    if exists:
        op.drop_table('room_videos')
    if _col_exists('rental_requests', 'deposit_amount'):
        op.drop_column('rental_requests', 'deposit_amount')
    if _col_exists('rental_requests', 'lease_duration'):
        op.drop_column('rental_requests', 'lease_duration')
    if _col_exists('rental_requests', 'move_in_date'):
        op.drop_column('rental_requests', 'move_in_date')
    if _col_exists('contracts', 'landlord_signature_name'):
        op.drop_column('contracts', 'landlord_signature_name')
    if _col_exists('contracts', 'tenant_signature_name'):
        op.drop_column('contracts', 'tenant_signature_name')
    if _col_exists('contracts', 'landlord_signed_at'):
        op.drop_column('contracts', 'landlord_signed_at')
    if _col_exists('contracts', 'tenant_signed_at'):
        op.drop_column('contracts', 'tenant_signed_at')
    if _col_exists('rooms', 'video_url'):
        op.drop_column('rooms', 'video_url')
    if _col_exists('rooms', 'view_360_enabled'):
        op.drop_column('rooms', 'view_360_enabled')
    if _col_exists('rooms', 'view_3d_url'):
        op.drop_column('rooms', 'view_3d_url')
