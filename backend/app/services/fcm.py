"""Firebase Cloud Messaging — HTTP v1 via a service account (docs/PHASE0_PLAN.md §0/§2).

Push is opt-in and best-effort: a user with no ``fcm_token`` or a deployment with no
``FIREBASE_SERVICE_ACCOUNT_JSON`` simply gets no push, silently, and the alert is still
created in-app either way. Nothing here ever raises into the caller — a push failure must
never fail the reading save or the alert write it is attached to.

Tests never touch the real Firebase Admin SDK: they monkeypatch ``send_push`` (or the module
this function is imported from, via ``sys.modules``) and assert on the payload dict shape.
"""

from __future__ import annotations

import logging
from typing import Any

from app.config import get_settings

logger = logging.getLogger("savera.fcm")

_app: Any = None
_unavailable = False


def _get_app() -> Any:
    """Lazily initialise the firebase-admin App from the configured service account."""
    global _app, _unavailable
    if _app is not None or _unavailable:
        return _app
    settings = get_settings()
    if not settings.firebase_service_account_json:
        _unavailable = True
        return None
    try:
        import firebase_admin
        from firebase_admin import credentials

        cred = credentials.Certificate(settings.firebase_service_account_json)
        _app = firebase_admin.get_app() if firebase_admin._apps else firebase_admin.initialize_app(cred)
    except Exception:
        logger.exception("Firebase Admin SDK could not be initialised; push is disabled")
        _unavailable = True
        _app = None
    return _app


def build_payload(title: str, body: str, *, data: dict[str, str] | None = None) -> dict[str, Any]:
    """The notification payload shape, split out so tests can assert on it without a token."""
    return {
        "notification": {"title": title, "body": body},
        "data": {k: str(v) for k, v in (data or {}).items()},
    }


async def send_push(
    fcm_token: str | None, title: str, body: str, *, data: dict[str, str] | None = None
) -> bool:
    """Send one push notification. Returns whether it was actually sent (False is not an error)."""
    if not fcm_token:
        return False
    app = _get_app()
    if app is None:
        logger.debug("push skipped (Firebase not configured): %s", title)
        return False

    payload = build_payload(title, body, data=data)
    try:
        from firebase_admin import messaging

        message = messaging.Message(
            token=fcm_token,
            notification=messaging.Notification(
                title=payload["notification"]["title"], body=payload["notification"]["body"]
            ),
            data=payload["data"],
        )
        messaging.send(message, app=app)
        return True
    except Exception:
        logger.exception("push send failed")
        return False
