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
