"""OCR jobs — bill upload → background OCR → user confirmation (docs/PHASE0_PLAN.md §6).

Schema addition beyond the brief's Section 4: the brief requires OCR to run in
BackgroundTasks *and* the extracted values to be shown for confirmation, so the upload
returns 202 with a job id and the client polls this table.

Revision ID: 0002
Revises: 0001
Create Date: 2026-09-24
"""

from __future__ import annotations

from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE ocr_jobs (
          id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status        TEXT NOT NULL DEFAULT 'pending'
                        CHECK (status IN ('pending', 'done', 'failed')),
          engine        TEXT CHECK (engine IS NULL OR engine IN ('gcv', 'tesseract', 'none')),
          image_path    TEXT NOT NULL,
          extraction    JSONB,
          raw_text      TEXT,
          confidence    INTEGER CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 100),
          needs_review  BOOLEAN,
          error_code    TEXT,
          reading_id    UUID,
          created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          finished_at   TIMESTAMPTZ
        )
        """
    )
    op.execute("CREATE INDEX idx_ocr_jobs_user ON ocr_jobs(user_id, created_at DESC)")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS ocr_jobs")
