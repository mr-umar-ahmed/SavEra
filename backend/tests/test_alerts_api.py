"""Alerts API: list, unread count, mark read / read-all — all scoped to the caller."""

from __future__ import annotations

from app import database

BASE = "/api/v1/alerts"


async def _insert(user_id, *, resource="electricity", alert_type="high_consumption", key="a"):
    return await database.fetchval(
        """
        INSERT INTO alerts (user_id, resource_type, alert_type, title, message, dedupe_key)
        VALUES ($1, $2, $3, 'Title', 'Message', $4)
        RETURNING id
        """,
        user_id,
        resource,
        alert_type,
        key,
    )


async def test_list_is_newest_first_and_scoped_to_the_caller(client, citizen, make_user):
    user, headers = citizen
    _, other_headers = await make_user(email="other@savera.test")
    a = await _insert(user["id"], key="a")
    b = await _insert(user["id"], key="b")
    await _insert((await make_user(email="third@savera.test"))[0]["id"], key="c")

    response = await client.get(BASE, headers=headers)
    assert response.status_code == 200
    ids = [row["id"] for row in response.json()]
    assert ids == [str(b), str(a)]  # newest (highest created_at) first

    assert (await client.get(BASE, headers=other_headers)).json() == []


async def test_unread_only_filter(client, citizen):
    user, headers = citizen
    unread = await _insert(user["id"], key="unread")
    await client.post(f"{BASE}/{await _insert(user['id'], key='read')}/read", headers=headers)

    response = await client.get(f"{BASE}?unread_only=true", headers=headers)
    ids = [row["id"] for row in response.json()]
    assert ids == [str(unread)]


async def test_unread_count(client, citizen):
    user, headers = citizen
    assert (await client.get(f"{BASE}/unread-count", headers=headers)).json()["count"] == 0
    await _insert(user["id"], key="a")
    await _insert(user["id"], key="b")
    assert (await client.get(f"{BASE}/unread-count", headers=headers)).json()["count"] == 2


async def test_mark_read(client, citizen):
    user, headers = citizen
    alert_id = await _insert(user["id"], key="a")
    response = await client.post(f"{BASE}/{alert_id}/read", headers=headers)
    assert response.status_code == 200
    assert response.json()["is_read"] is True
    assert (await client.get(f"{BASE}/unread-count", headers=headers)).json()["count"] == 0


async def test_mark_read_is_scoped_to_the_owner(client, citizen, make_user):
    user, _ = citizen
    _, other_headers = await make_user(email="other2@savera.test")
    alert_id = await _insert(user["id"], key="a")
    response = await client.post(f"{BASE}/{alert_id}/read", headers=other_headers)
    assert response.status_code == 404


async def test_mark_all_read(client, citizen):
    user, headers = citizen
    await _insert(user["id"], key="a")
    await _insert(user["id"], key="b")
    response = await client.post(f"{BASE}/read-all", headers=headers)
    assert response.json()["updated"] == 2
    assert (await client.get(f"{BASE}/unread-count", headers=headers)).json()["count"] == 0

    # running it again updates nothing further
    again = await client.post(f"{BASE}/read-all", headers=headers)
    assert again.json()["updated"] == 0


async def test_alert_context_round_trips_as_json(client, citizen):
    user, headers = citizen
    await database.execute(
        """
        INSERT INTO alerts (user_id, resource_type, alert_type, title, message, context, dedupe_key)
        VALUES ($1, 'electricity', 'high_consumption', 'T', 'M', $2::jsonb, 'k')
        """,
        user["id"],
        {"pct_over": 45.45, "severity": "high", "tips": ["Do the thing."]},
    )
    row = (await client.get(BASE, headers=headers)).json()[0]
    assert row["context"] == {"pct_over": 45.45, "severity": "high", "tips": ["Do the thing."]}


async def test_every_route_requires_a_token(client):
    assert (await client.get(BASE)).status_code == 401
    assert (await client.get(f"{BASE}/unread-count")).status_code == 401
    assert (await client.post(f"{BASE}/read-all")).status_code == 401
