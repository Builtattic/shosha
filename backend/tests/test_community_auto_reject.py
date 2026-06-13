"""Day 8 (parity hardening): community vote Rule A eligibility."""

from app.models.enums import ReportStatus
from app.services.report_service import _community_auto_reject_eligible


def test_pending_report_meets_threshold_and_two_thirds_opposes():
    assert _community_auto_reject_eligible(ReportStatus.PENDING, align_count=1, oppose_count=2, dispute_threshold=3)


def test_pending_report_below_threshold():
    assert not _community_auto_reject_eligible(ReportStatus.PENDING, align_count=1, oppose_count=1, dispute_threshold=3)


def test_pending_report_insufficient_oppose_ratio():
    assert not _community_auto_reject_eligible(ReportStatus.PENDING, align_count=2, oppose_count=1, dispute_threshold=3)


def test_approved_report_not_auto_rejected_pending_only_guard():
    """V1 allows status != rejected; V2 Day 8 intentionally limits to PENDING."""
    assert not _community_auto_reject_eligible(ReportStatus.APPROVED, align_count=1, oppose_count=2, dispute_threshold=3)


def test_already_rejected_not_eligible():
    assert not _community_auto_reject_eligible(ReportStatus.REJECTED, align_count=0, oppose_count=3, dispute_threshold=3)
