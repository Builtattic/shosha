"""Tests for credibility_service — scoped to formula parity with frontend TS."""

from types import SimpleNamespace

from app.services.credibility_service import (
    calc_credibility,
    calc_credibility_from_input,
    calc_profile_credibility,
)


def _minimal_user() -> SimpleNamespace:
    return SimpleNamespace(
        display_name=None,
        username=None,
        phone=None,
        dob=None,
        city=None,
        country=None,
        occupation_role=None,
        network_size=None,
        education=None,
        specialized_field=None,
        manages_money_people_system=None,
        physical_intellectual_limitations=None,
        ig_url=None,
        tiktok_url=None,
        x_url=None,
        linkedin_url=None,
        reddit_url=None,
        yt_url=None,
        fb_url=None,
        snapchat_url=None,
        photo_url=None,
        bio=None,
        quote=None,
        trust_badge=False,
    )


def _full_user_no_badge() -> SimpleNamespace:
    return SimpleNamespace(
        display_name="Jane Doe",
        username="jane",
        phone="+15551234567",
        dob="1990-01-01",
        city="NYC",
        country="US",
        occupation_role="manager",
        network_size="10k-100k",
        education="postgraduate",
        specialized_field="professional",
        manages_money_people_system="moderate_responsibility",
        physical_intellectual_limitations="no",
        ig_url="https://instagram.com/jane",
        tiktok_url="https://tiktok.com/@jane",
        x_url="https://x.com/jane",
        linkedin_url="https://linkedin.com/in/jane",
        reddit_url=None,
        yt_url=None,
        fb_url=None,
        snapchat_url=None,
        photo_url="https://example.com/photo.jpg",
        bio="Builder",
        quote="Ship it",
        trust_badge=False,
    )


def test_calc_profile_credibility_v1_fixture():
    """Matches V1 scoring.test.ts:85-94."""
    result = calc_profile_credibility(
        base_credibility=80,
        trust_badge_bonus=20,
        opposed_posts=12,
        dispute_losses=4,
        ai_flagged_posts=2,
    )
    assert result["total_credibility"] == 100
    assert result["updated_credibility"] == 68


def test_calc_credibility_minimal_user_low_score():
    result = calc_credibility(_minimal_user())
    assert result.total < 30


def test_calc_credibility_full_user_no_badge_near_eighty():
    result = calc_credibility(_full_user_no_badge())
    # Completion sections: 25+25+10+20 = 80 (verification excluded)
    assert result.total == 80


def test_calc_credibility_trust_badge_adds_twenty():
    user = _full_user_no_badge()
    user.trust_badge = True
    result = calc_credibility(user)
    assert result.total == 100


def test_calc_credibility_from_input_social_gate():
    partial_social = {
        "ig_url": "https://instagram.com/a",
        "tiktok_url": "https://tiktok.com/@a",
        "trust_badge": False,
    }
    result = calc_credibility_from_input(partial_social)
    social = result.breakdown["social_links"]
    assert social["ratio"] == 0.5  # 2/4 links
