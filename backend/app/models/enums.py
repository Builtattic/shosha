from enum import Enum


class UserRole(str, Enum):
    USER = "USER"
    MODERATOR = "MODERATOR"
    ADMIN = "ADMIN"
    SUPER_ADMIN = "SUPER_ADMIN"


class AccountStatus(str, Enum):
    ACTIVE = "ACTIVE"
    UNDER_REVIEW = "UNDER_REVIEW"
    DISPUTED = "DISPUTED"
    REMOVED = "REMOVED"


class ReportStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    REMOVED = "REMOVED"


class VoteType(str, Enum):
    ALIGN = "ALIGN"
    OPPOSE = "OPPOSE"


class ClaimRequestStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class DisputeStatus(str, Enum):
    PENDING = "PENDING"
    UNDER_REVIEW = "UNDER_REVIEW"
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"
    WITHDRAWN = "WITHDRAWN"


class NotificationType(str, Enum):
    CLAIM = "CLAIM"
    REPORT = "REPORT"
    DISPUTE = "DISPUTE"
    TRUST_BADGE = "TRUST_BADGE"
    MODERATION = "MODERATION"
    SYSTEM = "SYSTEM"


class AdminActionType(str, Enum):
    REPORT_REVIEW = "REPORT_REVIEW"
    CLAIM_REVIEW = "CLAIM_REVIEW"
    DISPUTE_REVIEW = "DISPUTE_REVIEW"
    ACCOUNT_MODERATION = "ACCOUNT_MODERATION"
    USER_ROLE_UPDATE = "USER_ROLE_UPDATE"
    MODERATION_DECIDE = "MODERATION_DECIDE"
    EVIDENCE_DECIDE = "EVIDENCE_DECIDE"
    EVIDENCE_SCAN = "EVIDENCE_SCAN"
    REPORT_CREATE = "REPORT_CREATE"
    REPORT_UPDATE = "REPORT_UPDATE"
    REPORT_DELETE = "REPORT_DELETE"
    USER_UPDATE = "USER_UPDATE"
    USER_DELETE = "USER_DELETE"
    ACCOUNT_CREATE = "ACCOUNT_CREATE"
    ACCOUNT_UPDATE = "ACCOUNT_UPDATE"
    ACCOUNT_DELETE = "ACCOUNT_DELETE"
    SETTINGS_UPDATE = "SETTINGS_UPDATE"
    OWNERSHIP_ASSIGN = "OWNERSHIP_ASSIGN"
    OWNERSHIP_REVOKE = "OWNERSHIP_REVOKE"
    SCORE_REPLAY = "SCORE_REPLAY"


class BubbleType(str, Enum):
    FAMILY = "FAMILY"
    FRIEND_GROUP = "FRIEND_GROUP"
    COLLEGE_GROUP = "COLLEGE_GROUP"
    WORK_GROUP = "WORK_GROUP"
    COMPANY = "COMPANY"
    SPORTS_GROUP = "SPORTS_GROUP"
    OTHER = "OTHER"


class BubbleVisibility(str, Enum):
    PUBLIC = "PUBLIC"
    PRIVATE = "PRIVATE"


class BubbleMemberRole(str, Enum):
    OWNER = "OWNER"
    ADMIN = "ADMIN"
    MEMBER = "MEMBER"


class BubbleJoinStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class SwipeDirection(str, Enum):
    ALIGN = "ALIGN"
    OPPOSE = "OPPOSE"


class ModerationRequestStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class EvidenceProposalStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"


class AuditRequestStatus(str, Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    REJECTED = "REJECTED"


class DeletionRequestStatus(str, Enum):
    PENDING = "PENDING"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    COMPLETED = "COMPLETED"


class IssueReportStatus(str, Enum):
    OPEN = "OPEN"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    DISMISSED = "DISMISSED"


class SubscriptionTier(str, Enum):
    FREE = "FREE"
    PRO = "PRO"


class FeedRankingMode(str, Enum):
    SMART = "SMART"
    RECENT = "RECENT"
