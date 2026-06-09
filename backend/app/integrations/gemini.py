from __future__ import annotations

import json
import logging
import math
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone

import httpx

from app.core.config import get_settings

logger = logging.getLogger(__name__)

REPORT_SYSTEM_PROMPT = """You are the Shosha adjudicator, grading a filing for validity and score impact.

Return strict JSON only:
{
  "valid": true,
  "confidence": 0.75,
  "proposedImpact": 3,
  "reasoning": "brief reason",
  "categoryTags": ["community"],
  "abuseFlags": [],
  "isAiFabricated": false,
  "contentSafety": {
    "needsCensor": false,
    "censorReason": "",
    "languageFlags": [],
    "mediaFlags": []
  }
}

Scoring guidance:
- Vague emotional complaints without specifics: low confidence, small magnitude (-1 to +1).
- Concrete dated incidents with evidence: high confidence, larger magnitude (up to -10 or +10).
- Positive filings produce positive proposedImpact, negative filings produce negative.
- Flag coordinated brigading, off-topic vendettas, doxxing, or pure opinion as abuse. Set valid=false and list flags.
- Also evaluate if the report text appears to be AI-generated/fabricated and set isAiFabricated to true if it does.
- Flag explicit language, graphic media, identity-sensitive details, or potentially unsafe media in contentSafety so public surfaces can blur/censor before display.

Categorize each filing with up to 3 tags from: authenticity, engagement, community, content, impact, harassment, misinformation, philanthropy, professionalism, controversy."""

_FENCED_JSON = re.compile(r"```(?:json)?\s*([\s\S]*?)```", re.IGNORECASE)


@dataclass
class ContentSafety:
    needs_censor: bool = False
    censor_reason: str | None = None
    language_flags: list[str] = field(default_factory=list)
    media_flags: list[str] = field(default_factory=list)


@dataclass
class AiVerdict:
    valid: bool
    confidence: float
    proposed_impact: int
    reasoning: str
    category_tags: list[str]
    abuse_flags: list[str]
    is_ai_fabricated: bool
    content_safety: ContentSafety
    analyzed_at: datetime
    used_heuristic: bool | None = None


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def extract_json_object(text: str) -> dict:
    fenced = _FENCED_JSON.search(text)
    candidate = fenced.group(1) if fenced else text
    start = candidate.find("{")
    if start == -1:
        return {}
    depth = 0
    in_string = False
    escape = False
    for i in range(start, len(candidate)):
        ch = candidate[i]
        if escape:
            escape = False
            continue
        if ch == "\\" and in_string:
            escape = True
            continue
        if ch == '"':
            in_string = not in_string
            continue
        if in_string:
            continue
        if ch == "{":
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0:
                try:
                    parsed = json.loads(candidate[start : i + 1])
                    return parsed if isinstance(parsed, dict) else {}
                except json.JSONDecodeError:
                    return {}
    return {}


def heuristic_adjudication(description: str, report_type: str) -> AiVerdict:
    text = f"{description} ".lower()
    abuse_flags = ["abuse_risk"] if re.search(r"(dox|address|brigad|spam|kill|threat)", text) else []
    concrete = bool(
        re.search(r"\d{4}|yesterday|today|screenshot|message|dm|posted|replied", text)
    )
    magnitude = 3 if concrete else 1
    proposed_impact = magnitude if report_type == "positive" else -magnitude
    needs_censor = bool(abuse_flags) or bool(
        re.search(r"(slur|graphic|blood|nude|address|phone number)", text)
    )
    censor_reason = (
        "Potential abuse or identity-sensitive content." if abuse_flags else None
    )
    return AiVerdict(
        valid=len(abuse_flags) == 0,
        confidence=0.45 if concrete else 0.3,
        proposed_impact=proposed_impact,
        reasoning="Shosha heuristic fallback.",
        category_tags=(
            ["community", "harassment"] if "harass" in text else ["community"]
        ),
        abuse_flags=abuse_flags,
        is_ai_fabricated=False,
        content_safety=ContentSafety(
            needs_censor=needs_censor,
            censor_reason=censor_reason,
            language_flags=(
                ["unsafe_language"] if re.search(r"(slur|threat|kill)", text) else []
            ),
            media_flags=(
                ["sensitive_media"] if re.search(r"(graphic|blood|nude)", text) else []
            ),
        ),
        analyzed_at=datetime.now(timezone.utc),
    )


def verdict_to_dict(verdict: AiVerdict) -> dict:
    content_safety: dict = {
        "needsCensor": verdict.content_safety.needs_censor,
        "languageFlags": verdict.content_safety.language_flags,
        "mediaFlags": verdict.content_safety.media_flags,
    }
    if verdict.content_safety.censor_reason:
        content_safety["censorReason"] = verdict.content_safety.censor_reason

    payload: dict = {
        "valid": verdict.valid,
        "confidence": verdict.confidence,
        "proposedImpact": verdict.proposed_impact,
        "reasoning": verdict.reasoning,
        "categoryTags": verdict.category_tags,
        "abuseFlags": verdict.abuse_flags,
        "isAiFabricated": verdict.is_ai_fabricated,
        "contentSafety": content_safety,
        "analyzedAt": verdict.analyzed_at.isoformat(),
        "usedHeuristic": verdict.used_heuristic or False,
    }
    return payload


def _parse_verdict_from_json(json_obj: dict) -> AiVerdict:
    content_raw = json_obj.get("contentSafety") or {}
    censor_reason = str(content_raw.get("censorReason") or "").strip()[:200] or None
    language_flags = content_raw.get("languageFlags")
    media_flags = content_raw.get("mediaFlags")

    return AiVerdict(
        valid=bool(json_obj.get("valid")),
        confidence=_clamp(float(json_obj.get("confidence", 0)), 0, 1),
        proposed_impact=int(
            math.trunc(
                _clamp(float(json_obj.get("proposedImpact", 0)), -10, 10)
            )
        ),
        reasoning=str(json_obj.get("reasoning") or "")[:500],
        category_tags=(
            [str(t) for t in json_obj.get("categoryTags", [])][:3]
            if isinstance(json_obj.get("categoryTags"), list)
            else []
        ),
        abuse_flags=(
            [str(f) for f in json_obj.get("abuseFlags", [])]
            if isinstance(json_obj.get("abuseFlags"), list)
            else []
        ),
        is_ai_fabricated=bool(json_obj.get("isAiFabricated")),
        content_safety=ContentSafety(
            needs_censor=bool(content_raw.get("needsCensor")),
            censor_reason=censor_reason,
            language_flags=(
                [str(f) for f in language_flags][:6]
                if isinstance(language_flags, list)
                else []
            ),
            media_flags=(
                [str(f) for f in media_flags][:6]
                if isinstance(media_flags, list)
                else []
            ),
        ),
        analyzed_at=datetime.now(timezone.utc),
    )


def _media_description(media_type: str | None) -> str | None:
    if media_type == "image":
        return "An image proof was uploaded and is attached for direct analysis."
    if media_type == "video":
        return "A video proof was uploaded but cannot be analyzed inline."
    return None


async def adjudicate_report(
    description: str,
    report_type: str,
    account_display_name: str,
    platform: str,
    media_url: str | None = None,
    media_type: str | None = None,
) -> AiVerdict:
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        return heuristic_adjudication(description, report_type)

    media_desc = _media_description(media_type)
    prompt_text = f"""{REPORT_SYSTEM_PROMPT}

Account: {account_display_name}
Platform: {platform}
Type: {report_type}
Description: {description}
Feelings:
Media: {media_desc or "Media proof was supplied."}"""
    if media_type == "image" and media_url:
        prompt_text += (
            "\nAn image is attached as inline media. Examine it carefully and "
            "reference what you see in reasoning."
        )
    elif media_type == "video" and media_url:
        prompt_text += (
            f"\nA video proof was uploaded but cannot be analyzed inline. "
            f"Source: {media_url}"
        )

    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent"
    )
    body = {"contents": [{"parts": [{"text": prompt_text}]}]}

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                url,
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": settings.GEMINI_API_KEY,
                },
                json=body,
            )
        if not response.is_success:
            detail = response.text
            if "reported as leaked" in detail:
                logger.warning(
                    "GEMINI_API_KEY reported as leaked; using heuristic fallback"
                )
            else:
                logger.warning(
                    "Gemini adjudication failed with status %s", response.status_code
                )
            fallback = heuristic_adjudication(description, report_type)
            fallback.used_heuristic = True
            return fallback

        payload = response.json()
        candidates = payload.get("candidates") or []
        parts = (
            (candidates[0].get("content") or {}).get("parts") or []
            if candidates
            else []
        )
        text = "".join(
            str(part.get("text") or "") for part in parts if isinstance(part, dict)
        )
        json_obj = extract_json_object(text)
        return _parse_verdict_from_json(json_obj)
    except Exception as exc:
        logger.warning("Gemini adjudication error: %s", exc)
        fallback = heuristic_adjudication(description, report_type)
        fallback.used_heuristic = True
        return fallback


AUDIT_SYSTEM_PROMPT = """You audit a social media account's reputation holistically for Shosha. Given approved filings and recent posts, return a rebalanced Shosha Score and trait breakdown. Weight recent events more than old ones. Do not move score more than +/- 15 from current score in a single audit.

Return strict JSON only:
{
  "newScore": 60,
  "breakdown": {
    "authenticity": 60,
    "engagement": 60,
    "community": 60,
    "content": 60,
    "impact": 60
  },
  "summary": "brief summary"
}"""

_AUDIT_TRAITS = ("authenticity", "engagement", "community", "content", "impact")
# V1 clamps final score to 0–100; V2 Account.score uses a 1000 base.
_AUDIT_SCORE_MIN = 0.0
_AUDIT_SCORE_MAX = 1000.0


def _audit_fallback(account: dict) -> dict:
    return {
        "newScore": account["score"],
        "breakdown": account.get("breakdown") or {},
        "summary": "Shosha heuristic fallback. No material score movement was applied.",
    }


def _parse_audit_result(json_obj: dict, account: dict) -> dict:
    current_score = float(account["score"])
    bounded = _clamp(float(json_obj.get("newScore", current_score)), current_score - 15, current_score + 15)
    breakdown_raw = json_obj.get("breakdown") or {}
    if not isinstance(breakdown_raw, dict):
        breakdown_raw = {}

    return {
        "newScore": round(_clamp(bounded, _AUDIT_SCORE_MIN, _AUDIT_SCORE_MAX)),
        "breakdown": {
            trait: round(_clamp(float(breakdown_raw.get(trait, 0))))
            for trait in _AUDIT_TRAITS
        },
        "summary": str(json_obj.get("summary") or "")[:500],
    }


async def run_full_audit(
    account: dict,
    approved_reports: list,
    recent_posts: list | None = None,
) -> dict:
    settings = get_settings()
    if not settings.GEMINI_API_KEY:
        return _audit_fallback(account)

    payload = {
        "account": account,
        "approvedReports": approved_reports,
        "recentPosts": recent_posts or [],
    }
    prompt_text = f"{AUDIT_SYSTEM_PROMPT}\n\n{json.dumps(payload)}"
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent"
    )
    body = {"contents": [{"parts": [{"text": prompt_text}]}]}

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            response = await client.post(
                url,
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": settings.GEMINI_API_KEY,
                },
                json=body,
            )
        if not response.is_success:
            logger.warning(
                "Gemini audit failed with status %s", response.status_code
            )
            return _audit_fallback(account)

        response_payload = response.json()
        candidates = response_payload.get("candidates") or []
        parts = (
            (candidates[0].get("content") or {}).get("parts") or []
            if candidates
            else []
        )
        text = "".join(
            str(part.get("text") or "") for part in parts if isinstance(part, dict)
        )
        json_obj = extract_json_object(text)
        return _parse_audit_result(json_obj, account)
    except Exception as exc:
        logger.warning("Gemini audit error: %s", exc)
        return _audit_fallback(account)


CLASSIFICATION_SYSTEM_PROMPT = """You are a social media analyst. Given a description of an incident, classify the Intent and Repetition Pattern.
Return strict JSON only:
{
  "intent": "0.5" | "1" | "1.5" | "2" | "2.5" | "3",
  "pattern": "0.5" | "1" | "1.5" | "2" | "2.5" | "3"
}

Intent (IN) Guidance:
- "0.5": Didn't mean to (Accidental, unintentional)
- "1": Not Aware (Didn't realize the impact)
- "1.5": Not Careful (Negligent)
- "2": Meant to (Intentional)
- "2.5": Thought Through (Deliberate)
- "3": Fully Planned (Premeditated)

Pattern (RP) Guidance:
- "0.5": No Clear Pattern
- "1": Balanced
- "1.5": Mixed Signals
- "2": Leaning Off
- "2.5": Pattern Forming
- "3": Consistent Pattern"""


def _heuristic_classification(description: str) -> dict:
    text = description.lower()
    repeated = bool(
        re.search(
            r"(again|repeated|pattern|multiple|often|regularly|history|every time)",
            text,
        )
    )
    planned = bool(
        re.search(
            r"(planned|deliberate|intentional|knowingly|threatened|premeditated|organized)",
            text,
        )
    )
    accidental = bool(
        re.search(
            r"(accident|mistake|unintended|without knowing|unaware)",
            text,
        )
    )
    return {
        "pattern": "2.5" if repeated else "1",
        "intent": "2.5" if planned else ("0.5" if accidental else "1.5"),
    }


async def classify_description(description: str, api_key: str | None = None) -> dict:
    """
    Classify a report description into intent and pattern multipliers.
    Returns {"intent": str, "pattern": str} — multiplier key strings.
    Fallback: {"intent": "1", "pattern": "1"}
    """
    settings = get_settings()
    key = api_key or settings.GEMINI_API_KEY
    if not key:
        return _heuristic_classification(description)

    prompt_text = f"{CLASSIFICATION_SYSTEM_PROMPT}\n\nDescription: {description}"
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"{settings.GEMINI_MODEL}:generateContent"
    )
    body = {"contents": [{"parts": [{"text": prompt_text}]}]}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(
                url,
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": key,
                },
                json=body,
            )
        if not response.is_success:
            return _heuristic_classification(description)

        payload = response.json()
        candidates = payload.get("candidates") or []
        parts = (
            (candidates[0].get("content") or {}).get("parts") or []
            if candidates
            else []
        )
        text = "".join(
            str(part.get("text") or "") for part in parts if isinstance(part, dict)
        )
        json_obj = extract_json_object(text)
        return {
            "intent": str(json_obj.get("intent") or "1"),
            "pattern": str(json_obj.get("pattern") or "1"),
        }
    except Exception as exc:
        logger.warning("Gemini classification error: %s", exc)
        return {"intent": "1", "pattern": "1"}
