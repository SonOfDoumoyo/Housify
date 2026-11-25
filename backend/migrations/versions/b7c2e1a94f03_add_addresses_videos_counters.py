"""add addresses, listing videos and view/contact counters

Revision ID: b7c2e1a94f03
Revises: f7444a103445
Create Date: 2026-11-21

Adds, without touching any existing table definition:
- addresses table (areas agents pick from; agents can append via "Other")
- listing_videos table (short video tours, mirroring listing_images)
- listings.views_count / listings.contact_count (default 0, backfilled
  for existing rows by the server default)

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b7c2e1a94f03'
down_revision: Union[str, Sequence[str], None] = 'f7444a103445'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

SEEDED_AREA_NAMES = [
    "federal_university_of_otuoke",
    "azikiel",
    "otuaba",
    "skills auditorium",
    "tee-jay estate",
    "olumba",
    "eva glass hotels",
    "after bridge",
    "kata kata",
    "highness",
]


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('addresses',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('name', sa.VARCHAR(), nullable=False),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('name')
    )
    op.create_index(op.f('ix_addresses_id'), 'addresses', ['id'], unique=False)
    op.create_index(op.f('ix_addresses_name'), 'addresses', ['name'], unique=True)
    addresses = sa.table(
        'addresses',
        sa.column('name', sa.VARCHAR()),
    )
    op.bulk_insert(addresses, [{"name": name} for name in SEEDED_AREA_NAMES])
    op.create_table('listing_videos',
    sa.Column('video_id', sa.UUID(), nullable=False),
    sa.Column('listing_id', sa.UUID(), nullable=False),
    sa.Column('video_url', sqlmodel.sql.sqltypes.AutoString(), nullable=False),
    sa.Column('duration_seconds', sa.Integer(), nullable=True),
    sa.ForeignKeyConstraint(['listing_id'], ['listings.listing_id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('video_id')
    )
    op.create_index(op.f('ix_listing_videos_video_id'), 'listing_videos', ['video_id'], unique=True)
    op.add_column('listings', sa.Column('views_count', sa.Integer(), server_default='0', nullable=False))
    op.add_column('listings', sa.Column('contact_count', sa.Integer(), server_default='0', nullable=False))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('listings', 'contact_count')
    op.drop_column('listings', 'views_count')
    op.drop_index(op.f('ix_listing_videos_video_id'), table_name='listing_videos')
    op.drop_table('listing_videos')
    op.drop_index(op.f('ix_addresses_name'), table_name='addresses')
    op.drop_index(op.f('ix_addresses_id'), table_name='addresses')
    op.drop_table('addresses')
