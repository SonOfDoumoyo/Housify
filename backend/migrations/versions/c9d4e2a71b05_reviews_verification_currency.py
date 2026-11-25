"""agent reviews, verification photo, currency, status freshness

Revision ID: c9d4e2a71b05
Revises: b7c2e1a94f03
Create Date: 2026-11-23

Additive only:
- users.verification_photo_url (agent selfie for identity verification,
  also used as the profile picture)
- listings.currency (ISO code, default NGN) and listings.status_updated_at
  (backfilled from uploaded_at for existing rows)
- listings.walk_time / listings.drive_time become nullable (travel times
  were removed from Housify; old values are kept)
- agent_reviews table (one review per customer per agent)

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c9d4e2a71b05'
down_revision: Union[str, Sequence[str], None] = 'b7c2e1a94f03'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('users', sa.Column('verification_photo_url', sa.String(length=255), nullable=True))
    op.add_column('listings', sa.Column('currency', sa.VARCHAR(length=3), server_default='NGN', nullable=False))
    op.add_column('listings', sa.Column('status_updated_at', sa.TIMESTAMP(timezone=True), nullable=True))
    # Existing listings count as "status confirmed" when they were
    # uploaded, so stale-status warnings only apply going forward.
    op.execute("UPDATE listings SET status_updated_at = uploaded_at WHERE status_updated_at IS NULL")
    op.alter_column('listings', 'walk_time', existing_type=sa.Integer(), nullable=True)
    op.alter_column('listings', 'drive_time', existing_type=sa.Integer(), nullable=True)
    op.create_table('agent_reviews',
    sa.Column('review_id', sa.UUID(), nullable=False),
    sa.Column('agent_id', sa.UUID(), nullable=False),
    sa.Column('reviewer_id', sa.UUID(), nullable=False),
    sa.Column('rating', sa.SMALLINT(), nullable=False),
    sa.Column('comment', sa.Text(), nullable=True),
    sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False),
    sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['agent_id'], ['users.uid'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['reviewer_id'], ['users.uid'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('review_id'),
    sa.UniqueConstraint('reviewer_id', 'agent_id', name='uq_review_reviewer_agent')
    )
    op.create_index(op.f('ix_agent_reviews_review_id'), 'agent_reviews', ['review_id'], unique=True)
    op.create_index(op.f('ix_agent_reviews_agent_id'), 'agent_reviews', ['agent_id'], unique=False)
    op.create_index(op.f('ix_agent_reviews_reviewer_id'), 'agent_reviews', ['reviewer_id'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_agent_reviews_reviewer_id'), table_name='agent_reviews')
    op.drop_index(op.f('ix_agent_reviews_agent_id'), table_name='agent_reviews')
    op.drop_index(op.f('ix_agent_reviews_review_id'), table_name='agent_reviews')
    op.drop_table('agent_reviews')
    op.alter_column('listings', 'drive_time', existing_type=sa.Integer(), nullable=False)
    op.alter_column('listings', 'walk_time', existing_type=sa.Integer(), nullable=False)
    op.drop_column('listings', 'status_updated_at')
    op.drop_column('listings', 'currency')
    op.drop_column('users', 'verification_photo_url')
