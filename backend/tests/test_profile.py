"""routers/profile.py — /profile, /profile/appliances, /profile/appliance-types, /wards."""

from __future__ import annotations

import uuid

import pytest

from app import database
from app.services.appliance import APPLIANCE_CATALOG, VALID_TYPES
from tests.conftest import auth_headers_for

API = "/api/v1"

PROFILE_ROUTES = [
    ("GET", "/profile"),
    ("PATCH", "/profile"),
    ("PUT", "/profile/push-token"),
    ("DELETE", "/profile/push-token"),
    ("GET", "/profile/appliances"),
    ("PUT", "/profile/appliances"),
    ("GET", "/profile/appliance-types"),
    ("GET", "/wards"),
]

SAMPLE_APPLIANCES = [
    {"type": "ac_1.5ton", "count": 1, "daily_hours": 6, "star_rating": 3},
    {"type": "refrigerator", "count": 1, "daily_hours": 24, "star_rating": 4},
    {"type": "ceiling_fan", "count": 3, "daily_hours": 8},
    {"type": "geyser", "count": 1, "daily_hours": 0.5, "wattage_override": 1500},
]


# --- auth ---------------------------------------------------------------------------------


@pytest.mark.parametrize("method,path", PROFILE_ROUTES)
async def test_every_route_requires_a_token(client, method, path):
    resp = await client.request(method, f"{API}{path}", json={})
    assert resp.status_code == 401, (method, path, resp.text)


# --- GET /profile -------------------------------------------------------------------------


async def test_get_profile_provisions_defaults_for_new_user(client):
    uid = uuid.uuid4()
    resp = await client.get(f"{API}/profile", headers=auth_headers_for(uid, "Fresh.User@Example.com"))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["id"] == str(uid)
    assert body["email"] == "fresh.user@example.com"
    assert body["name"] is None
    assert body["ward_id"] is None and body["ward_name"] is None
    assert body["household_size"] == 1
    assert body["city"] == "Bengaluru"
    assert body["role"] == "citizen"
    assert body["push_enabled"] is False
    assert body["onboarding_complete"] is False
    assert body["created_at"]
    assert set(body) == {
        "id", "email", "name", "ward_id", "ward_name", "household_size", "city", "role",
        "push_enabled", "onboarding_complete", "created_at",
    }
    assert await database.fetchval("SELECT COUNT(*) FROM users WHERE id = $1", uid) == 1


async def test_get_profile_joins_ward_name_and_flags_onboarding(client, citizen):
    user, headers = citizen
    resp = await client.get(f"{API}/profile", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert body["ward_id"] == 1 and body["ward_name"] == "Koramangala"
    assert body["onboarding_complete"] is True
    assert body["household_size"] == user["household_size"] == 3
    assert body["name"] == "Test User"


async def test_profile_never_leaks_the_push_token(client, citizen):
    _, headers = citizen
    await client.put(f"{API}/profile/push-token", headers=headers, json={"fcm_token": "secret-tok"})
    body = (await client.get(f"{API}/profile", headers=headers)).json()
    assert "fcm_token" not in body and "secret-tok" not in str(body)


# --- PATCH /profile -----------------------------------------------------------------------


async def test_patch_profile_updates_fields(client, citizen):
    _, headers = citizen
    resp = await client.patch(
        f"{API}/profile",
        headers=headers,
        json={"name": "  Ananya  ", "ward_id": 2, "household_size": 4, "city": "Bengaluru"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["name"] == "Ananya"
    assert body["ward_id"] == 2 and body["ward_name"] == "Indiranagar"
    assert body["household_size"] == 4
    assert body["onboarding_complete"] is True
    # persisted, and visible on the next GET
    again = (await client.get(f"{API}/profile", headers=headers)).json()
    assert again["name"] == "Ananya" and again["ward_id"] == 2 and again["household_size"] == 4


async def test_patch_profile_is_partial(client, citizen):
    _, headers = citizen
    before = (await client.get(f"{API}/profile", headers=headers)).json()
    resp = await client.patch(f"{API}/profile", headers=headers, json={"household_size": 5})
    assert resp.status_code == 200
    body = resp.json()
    assert body["household_size"] == 5
    assert body["name"] == before["name"] and body["ward_id"] == before["ward_id"]

    # empty patch is a no-op, not an error
    resp = await client.patch(f"{API}/profile", headers=headers, json={})
    assert resp.status_code == 200 and resp.json()["household_size"] == 5


@pytest.mark.parametrize(
    "payload",
    [
        {"household_size": 0},
        {"household_size": 21},
        {"household_size": None},
        {"household_size": "many"},
        {"ward_id": 999},
        {"ward_id": 0},
        {"city": ""},
        {"city": None},
        {"name": "x" * 121},
    ],
)
async def test_patch_profile_validation_422(client, citizen, payload):
    _, headers = citizen
    resp = await client.patch(f"{API}/profile", headers=headers, json=payload)
    assert resp.status_code == 422, resp.text
    # nothing changed
    body = (await client.get(f"{API}/profile", headers=headers)).json()
    assert body["household_size"] == 3 and body["ward_id"] == 1


async def test_patch_profile_unknown_ward_error_names_the_field(client, citizen):
    _, headers = citizen
    resp = await client.patch(f"{API}/profile", headers=headers, json={"ward_id": 4242})
    assert resp.status_code == 422
    detail = resp.json()["detail"]
    assert any("ward_id" in d.get("loc", []) for d in detail)


async def test_patch_profile_can_clear_ward_and_name(client, citizen):
    _, headers = citizen
    resp = await client.patch(f"{API}/profile", headers=headers, json={"ward_id": None, "name": ""})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["ward_id"] is None and body["ward_name"] is None
    assert body["onboarding_complete"] is False
    assert body["name"] is None


async def test_patch_profile_ignores_protected_fields(client, citizen):
    """role / email / id come from auth and the DB, never from the client."""
    user, headers = citizen
    resp = await client.patch(
        f"{API}/profile",
        headers=headers,
        json={"role": "admin", "email": "hacker@savera.test", "id": str(uuid.uuid4()), "name": "N"},
    )
    assert resp.status_code == 200
    body = resp.json()
    assert body["role"] == "citizen" and body["email"] == user["email"] and body["id"] == str(user["id"])


# --- push token ---------------------------------------------------------------------------


async def test_push_token_set_and_clear_toggles_push_enabled(client, citizen):
    user, headers = citizen
    assert (await client.get(f"{API}/profile", headers=headers)).json()["push_enabled"] is False

    resp = await client.put(f"{API}/profile/push-token", headers=headers, json={"fcm_token": "tok-1"})
    assert resp.status_code == 204 and resp.content == b""
    assert (await client.get(f"{API}/profile", headers=headers)).json()["push_enabled"] is True
    assert await database.fetchval("SELECT fcm_token FROM users WHERE id = $1", user["id"]) == "tok-1"

    # re-registering replaces the token
    await client.put(f"{API}/profile/push-token", headers=headers, json={"fcm_token": "tok-2"})
    assert await database.fetchval("SELECT fcm_token FROM users WHERE id = $1", user["id"]) == "tok-2"

    resp = await client.delete(f"{API}/profile/push-token", headers=headers)
    assert resp.status_code == 204
    assert (await client.get(f"{API}/profile", headers=headers)).json()["push_enabled"] is False
    assert await database.fetchval("SELECT fcm_token FROM users WHERE id = $1", user["id"]) is None

    # clearing twice is fine
    assert (await client.delete(f"{API}/profile/push-token", headers=headers)).status_code == 204


@pytest.mark.parametrize("payload", [{}, {"fcm_token": ""}, {"fcm_token": "   "}, {"fcm_token": None}])
async def test_push_token_validation(client, citizen, payload):
    _, headers = citizen
    resp = await client.put(f"{API}/profile/push-token", headers=headers, json=payload)
    assert resp.status_code == 422


# --- appliances ---------------------------------------------------------------------------


async def test_put_appliances_replace_all_is_idempotent(client, citizen):
    user, headers = citizen
    first = await client.put(
        f"{API}/profile/appliances", headers=headers, json={"appliances": SAMPLE_APPLIANCES}
    )
    assert first.status_code == 200, first.text
    second = await client.put(
        f"{API}/profile/appliances", headers=headers, json={"appliances": SAMPLE_APPLIANCES}
    )
    assert second.status_code == 200

    def _strip_ids(rows: list[dict]) -> list[dict]:
        return [{k: v for k, v in r.items() if k != "id"} for r in rows]

    assert _strip_ids(first.json()) == _strip_ids(second.json())
    assert len(second.json()) == len(SAMPLE_APPLIANCES)
    assert len({r["type"] for r in second.json()}) == len(SAMPLE_APPLIANCES)
    assert await database.fetchval(
        "SELECT COUNT(*) FROM appliances WHERE user_id = $1", user["id"]
    ) == len(SAMPLE_APPLIANCES)

    listed = await client.get(f"{API}/profile/appliances", headers=headers)
    assert listed.status_code == 200
    assert listed.json() == second.json()


async def test_put_appliances_returns_effective_watts(client, citizen):
    _, headers = citizen
    resp = await client.put(
        f"{API}/profile/appliances", headers=headers, json={"appliances": SAMPLE_APPLIANCES}
    )
    assert resp.status_code == 200
    by_type = {r["type"]: r for r in resp.json()}
    assert set(by_type) == {"ac_1.5ton", "refrigerator", "ceiling_fan", "geyser"}
    assert by_type["ac_1.5ton"]["effective_watts"] == 1600.0
    assert by_type["refrigerator"]["effective_watts"] == 45.0
    assert by_type["ceiling_fan"]["effective_watts"] == 75.0
    assert by_type["ceiling_fan"]["count"] == 3
    assert by_type["ceiling_fan"]["star_rating"] is None
    assert by_type["geyser"]["effective_watts"] == 1500.0  # override wins
    assert by_type["geyser"]["wattage_override"] == 1500.0
    for row in resp.json():
        assert set(row) == {
            "id", "type", "count", "daily_hours", "star_rating", "wattage_override", "effective_watts"
        }
        uuid.UUID(row["id"])  # valid uuid
    # rows come back in catalog order
    catalog_order = {t: i for i, t in enumerate(VALID_TYPES)}
    types = [r["type"] for r in resp.json()]
    assert types == sorted(types, key=catalog_order.__getitem__)


async def test_put_appliances_replaces_rather_than_merges(client, citizen):
    user, headers = citizen
    await client.put(f"{API}/profile/appliances", headers=headers, json={"appliances": SAMPLE_APPLIANCES})
    resp = await client.put(
        f"{API}/profile/appliances",
        headers=headers,
        json={"appliances": [{"type": "tv_led_55", "count": 1, "daily_hours": 3}]},
    )
    assert resp.status_code == 200
    assert [r["type"] for r in resp.json()] == ["tv_led_55"]
    assert await database.fetchval("SELECT COUNT(*) FROM appliances WHERE user_id = $1", user["id"]) == 1

    # empty list clears the profile
    resp = await client.put(f"{API}/profile/appliances", headers=headers, json={"appliances": []})
    assert resp.status_code == 200 and resp.json() == []
    assert (await client.get(f"{API}/profile/appliances", headers=headers)).json() == []


async def test_get_appliances_empty_by_default(client, citizen):
    _, headers = citizen
    resp = await client.get(f"{API}/profile/appliances", headers=headers)
    assert resp.status_code == 200 and resp.json() == []


async def test_put_appliances_duplicate_type_is_422_and_atomic(client, citizen):
    user, headers = citizen
    await client.put(f"{API}/profile/appliances", headers=headers, json={"appliances": SAMPLE_APPLIANCES})
    resp = await client.put(
        f"{API}/profile/appliances",
        headers=headers,
        json={
            "appliances": [
                {"type": "ceiling_fan", "count": 1, "daily_hours": 8},
                {"type": "ceiling_fan", "count": 2, "daily_hours": 4},
            ]
        },
    )
    assert resp.status_code == 422, resp.text
    assert "duplicate" in resp.text.lower()
    # the previous profile is untouched
    assert await database.fetchval(
        "SELECT COUNT(*) FROM appliances WHERE user_id = $1", user["id"]
    ) == len(SAMPLE_APPLIANCES)


@pytest.mark.parametrize(
    "bad",
    [
        {"type": "microwave", "count": 1, "daily_hours": 1},
        {"type": "ceiling_fan", "count": 0, "daily_hours": 1},
        {"type": "ceiling_fan", "count": 11, "daily_hours": 1},
        {"type": "ceiling_fan", "count": 1, "daily_hours": -1},
        {"type": "ceiling_fan", "count": 1, "daily_hours": 24.5},
        {"type": "refrigerator", "count": 1, "daily_hours": 24, "star_rating": 0},
        {"type": "refrigerator", "count": 1, "daily_hours": 24, "star_rating": 6},
        {"type": "geyser", "count": 1, "daily_hours": 1, "wattage_override": 0},
        {"type": "geyser", "count": 1, "daily_hours": 1, "wattage_override": -5},
        {"count": 1, "daily_hours": 1},
    ],
)
async def test_put_appliances_field_validation_422(client, citizen, bad):
    _, headers = citizen
    resp = await client.put(f"{API}/profile/appliances", headers=headers, json={"appliances": [bad]})
    assert resp.status_code == 422, resp.text


async def test_put_appliances_defaults_count_and_hours(client, citizen):
    _, headers = citizen
    resp = await client.put(
        f"{API}/profile/appliances", headers=headers, json={"appliances": [{"type": "other"}]}
    )
    assert resp.status_code == 200, resp.text
    (row,) = resp.json()
    assert row["count"] == 1 and row["daily_hours"] == 4.0 and row["effective_watts"] == 100.0


async def test_appliances_are_scoped_per_user(client, make_user):
    _, headers_a = await make_user(email="a@savera.test")
    _, headers_b = await make_user(email="b@savera.test")
    await client.put(f"{API}/profile/appliances", headers=headers_a, json={"appliances": SAMPLE_APPLIANCES})
    assert (await client.get(f"{API}/profile/appliances", headers=headers_b)).json() == []
    await client.put(f"{API}/profile/appliances", headers=headers_b, json={"appliances": []})
    assert len((await client.get(f"{API}/profile/appliances", headers=headers_a)).json()) == 4


# --- appliance-types ----------------------------------------------------------------------


async def test_appliance_types_catalog(client, citizen):
    _, headers = citizen
    resp = await client.get(f"{API}/profile/appliance-types", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert len(body) == 10
    assert [c["type"] for c in body] == list(VALID_TYPES)
    assert body == APPLIANCE_CATALOG  # str keys survive JSON round-trip
    assert body[1]["label"] == "AC 1.5 ton" and body[1]["has_star_rating"] is True
    assert body[5]["type"] == "geyser" and body[5]["default_hours"] == 0.5


# --- wards --------------------------------------------------------------------------------


async def test_wards_lists_seeded_wards_ordered_by_name(client, citizen):
    _, headers = citizen
    resp = await client.get(f"{API}/wards", headers=headers)
    assert resp.status_code == 200
    body = resp.json()
    assert [w["name"] for w in body] == [
        "Indiranagar", "Jayanagar", "Koramangala", "Malleshwaram", "Whitefield",
    ]
    assert {w["id"] for w in body} == {1, 2, 3, 4, 5}
    for w in body:
        assert set(w) == {"id", "name", "city", "lat", "lng"}
        assert w["city"] == "Bengaluru"
        assert isinstance(w["lat"], float) and isinstance(w["lng"], float)


async def test_wards_city_filter(client, citizen):
    _, headers = citizen
    await database.execute(
        "INSERT INTO wards (name, city, lat, lng) VALUES ('Andheri', 'Mumbai', 19.1136, 72.8697)"
    )
    all_wards = (await client.get(f"{API}/wards", headers=headers)).json()
    assert len(all_wards) == 6  # defaults to all cities

    blr = (await client.get(f"{API}/wards", headers=headers, params={"city": "bengaluru"})).json()
    assert len(blr) == 5 and all(w["city"] == "Bengaluru" for w in blr)

    mum = (await client.get(f"{API}/wards", headers=headers, params={"city": "Mumbai"})).json()
    assert [w["name"] for w in mum] == ["Andheri"]

    assert (await client.get(f"{API}/wards", headers=headers, params={"city": "Nowhere"})).json() == []
