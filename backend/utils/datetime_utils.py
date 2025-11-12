from datetime import datetime
import pytz

IST = pytz.timezone('Asia/Kolkata')

def format_ist_iso(dt):
    """Format datetime to ISO string with IST offset (+05:30)"""
    if dt is None:
        return None
    if dt.tzinfo is None:
        utc_dt = dt.replace(tzinfo=pytz.UTC)
    else:
        utc_dt = dt.astimezone(pytz.UTC)
    ist_dt = utc_dt.astimezone(IST)
    return ist_dt.isoformat()

def parse_datetime(value):
    """Parse datetime from various formats to UTC naive datetime for storage"""
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        if value.tzinfo:
            return value.astimezone(pytz.UTC).replace(tzinfo=None)
        return value
    try:
        dt = datetime.fromisoformat(value.replace('Z', '+00:00'))
        if dt.tzinfo:
            return dt.astimezone(pytz.UTC).replace(tzinfo=None)
        else:
            ist_dt = IST.localize(dt)
            return ist_dt.astimezone(pytz.UTC).replace(tzinfo=None)
    except:
        return datetime.utcnow()
