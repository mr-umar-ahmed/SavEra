"""Mint a Supabase-shaped HS256 access token for local API testing (Swagger / curl).

Only works for projects (or local .env files) that set SUPABASE_JWT_SECRET; production
projects using ES256 keys must use real Supabase logins. Never an auth bypass: the backend
still verifies the signature.

    python scripts/mint_dev_token.py --email ananya@savera.test [--user-id <uuid>] [--ttl 86400]
"""

from __future__ import annotations

import argparse
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.config import get_settings  # noqa: E402
from app.deps import mint_hs256_token  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--email", required=True)
    parser.add_argument("--user-id", default=None, help="UUID to use as the token subject (default: uuid5 of the email)")
    parser.add_argument("--ttl", type=int, default=86400, help="seconds until expiry")
    args = parser.parse_args()

    secret = get_settings().supabase_jwt_secret
    if not secret:
        print("SUPABASE_JWT_SECRET is not set in the environment / .env", file=sys.stderr)
        return 1
    user_id = uuid.UUID(args.user_id) if args.user_id else uuid.uuid5(uuid.NAMESPACE_URL, f"savera:dev:{args.email.lower()}")
    print(mint_hs256_token(user_id, args.email.lower(), secret=secret, ttl_seconds=args.ttl))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
