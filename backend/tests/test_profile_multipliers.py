"""Tests for profile_multipliers_from_user and resolve_report_multipliers."""

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock
from uuid import uuid4

from app.services.scoring_service import (
    DEFAULT_MULTIPLIERS,
    calc_profile_scores_from_user,
    profile_multipliers_from_account,
    profile_multipliers_from_user,
    resolve_report_multipliers,
)


def _full_onboarded_user() -> SimpleNamespace:
    return SimpleNamespace(
        occupation_role="manager",
        network_size="10k-100k",
        education="postgraduate",
        manages_money_people_system="moderate_responsibility",
        specialized_field="professional",
        physical_intellectual_limitations="no",
    )


def _minimal_user() -> SimpleNamespace:
    return SimpleNamespace(
        occupation_role=None,
        network_size=None,
        education=None,
        manages_money_people_system=None,
        specialized_field=None,
        physical_intellectual_limitations=None,
    )


def test_calc_profile_scores_empty_when_no_onboarding():
    assert calc_profile_scores_from_user(_minimal_user()) == {}


def test_calc_profile_scores_returns_dimensions_for_full_user():
    dims = calc_profile_scores_from_user(_full_onboarded_user())
    assert "IY" in dims
    assert dims["P"] > 1.0
    assert dims["AW"] > 1.0


def test_profile_multipliers_from_user_not_all_neutral():
    mult = profile_multipliers_from_user(_full_onboarded_user())
    assert mult["power"] != 1.0 or mult["awareness"] != 1.0
    assert mult["reputation"] == 1.0  # V1 reporterScore has no V2 equivalent


def test_profile_multipliers_from_user_minimal_returns_defaults():
    mult = profile_multipliers_from_user(_minimal_user())
    assert mult == DEFAULT_MULTIPLIERS


def test_profile_multipliers_from_account_empty_workbook():
    account = SimpleNamespace(
        opposed_posts=0,
        specialized_field_workbook=None,
        role=None,
        management_workbook=None,
        region=None,
        disability=None,
        lifestyle=None,
        reach=None,
        education_workbook=None,
    )
    mult = profile_multipliers_from_account(account)
    assert mult["intent"] == 1.0
    assert mult["reputation"] == 0.5  # opposed_posts=0 → 0.5 + 0/10


def test_resolve_report_multipliers_uses_owner_when_onboarded(monkeypatch):
    owner_id = uuid4()
    owner = _full_onboarded_user()
    owner.id = owner_id

    account = SimpleNamespace(
        owner_user_id=owner_id,
        opposed_posts=0,
        specialized_field_workbook=None,
        role=None,
        management_workbook=None,
        region=None,
        disability=None,
        lifestyle=None,
        reach=None,
        education_workbook=None,
    )

    mock_get = AsyncMock(return_value=owner)
    monkeypatch.setattr(
        "app.repositories.user_repository.get_by_id",
        mock_get,
    )

    db = MagicMock()
    mult = asyncio.run(resolve_report_multipliers(db, account))
    assert mult["power"] != 1.0 or mult["awareness"] != 1.0
    mock_get.assert_awaited_once_with(db, owner_id)


def test_resolve_report_multipliers_falls_back_without_owner(monkeypatch):
    account = SimpleNamespace(
        owner_user_id=None,
        opposed_posts=0,
        specialized_field_workbook=None,
        role=None,
        management_workbook=None,
        region=None,
        disability=None,
        lifestyle=None,
        reach=None,
        education_workbook=None,
    )

    db = MagicMock()
    mult = asyncio.run(resolve_report_multipliers(db, account))
    assert mult["reputation"] == 0.5
