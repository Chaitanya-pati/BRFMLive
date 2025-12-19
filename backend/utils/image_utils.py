import os
from pathlib import Path

def get_image_url(image_path: str) -> str:
    """
    Convert stored image path to relative path for frontend to construct full URL

    Args:
        image_path: Relative path like '/uploads/image.jpg' or 'uploads/image.jpg'

    Returns:
        Relative path starting with /
    """
    if not image_path:
        return None

    # If already a full URL, return as-is
    if image_path.startswith('http://') or image_path.startswith('https://'):
        return image_path

    # Ensure path starts with /
    if not image_path.startswith('/'):
        image_path = '/' + image_path

    return image_path


def save_image_path(file_path: str) -> str:
    """
    Save image path in a consistent format (relative path)

    Args:
        file_path: Full file path like '/uploads/image.jpg'

    Returns:
        Relative path suitable for storage
    """
    if not file_path:
        return None

    # Remove any base URL if present
    if file_path.startswith('http://') or file_path.startswith('https://'):
        # Extract just the path portion
        from urllib.parse import urlparse
        parsed = urlparse(file_path)
        file_path = parsed.path

    # Ensure it starts with /
    if not file_path.startswith('/'):
        file_path = '/' + file_path

    return file_path