"""
Centralised Indian Standard Time (IST) datetime helper.

All datetime storage and formatting across the application must go through
this module to ensure consistency.

Rules:
  - Storage : naive datetime representing IST (no tzinfo, value is IST)
  - Display : ISO-8601 string with +05:30 offset  e.g. "2026-03-16T15:14:00+05:30"
  - Parsing : incoming strings (IST or UTC-aware) are converted to IST naive for storage
"""

from datetime import datetime
import pytz

IST = pytz.timezone("Asia/Kolkata")


# ---------------------------------------------------------------------------
# Storage helper — use this everywhere a "now" timestamp is needed
# ---------------------------------------------------------------------------

def ist_now() -> datetime:
    """Return current IST time as a naive datetime for database storage."""
    return datetime.now(IST).replace(tzinfo=None)


# ---------------------------------------------------------------------------
# Display helper — use this when serialising datetimes to API responses
# ---------------------------------------------------------------------------

def format_ist(dt: datetime):
    """
    Convert a stored naive IST datetime (or any tz-aware datetime) to an
    ISO-8601 string with +05:30 offset, e.g. '2026-03-16T15:14:00+05:30'.
    Returns None if dt is None.
    """
    if dt is None:
        return None
    if dt.tzinfo is None:
        ist_dt = IST.localize(dt)
    else:
        ist_dt = dt.astimezone(IST)
    return ist_dt.isoformat()


# ---------------------------------------------------------------------------
# Parse helper — use when accepting datetime strings from the frontend/client
# ---------------------------------------------------------------------------

def parse_ist(value) -> datetime:
    """
    Parse a datetime value into a naive IST datetime for database storage.

    Accepts:
      - None / ""          → returns None
      - datetime (naive)   → treated as already IST, returned as-is
      - datetime (aware)   → converted to IST naive
      - ISO string with tz → converted to IST naive
      - ISO string no tz   → treated as IST, returned as naive

    Falls back to ist_now() on any parse error.
    """
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        if value.tzinfo is not None:
            return value.astimezone(IST).replace(tzinfo=None)
        return value
    try:
        dt = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        if dt.tzinfo is not None:
            return dt.astimezone(IST).replace(tzinfo=None)
        return dt
    except Exception:
        return ist_now()


# ---------------------------------------------------------------------------
# Legacy aliases — kept for backward compatibility during migration
# ---------------------------------------------------------------------------

def get_ist_now() -> datetime:
    """Alias for ist_now(). Prefer ist_now() in new code."""
    return ist_now()


def format_ist_iso(dt: datetime):
    """Alias for format_ist(). Prefer format_ist() in new code."""
    return format_ist(dt)


def parse_datetime(value) -> datetime:
    """Alias for parse_ist(). Prefer parse_ist() in new code."""
    return parse_ist(value)
