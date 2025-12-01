
import os
from pathlib import Path

def get_image_url(image_path: str) -> str:
    """
    Convert stored image path to full URL based on environment
    
    Args:
        image_path: Relative path like '/uploads/image.jpg' or 'uploads/image.jpg'
    
    Returns:
        Full URL for the image
    """
    if not image_path:
        return None
    
    # If already a full URL, return as-is
    if image_path.startswith('http://') or image_path.startswith('https://'):
        return image_path
    
    # Ensure path starts with /
    if not image_path.startswith('/'):
        image_path = '/' + image_path
    
    # Check if running in deployment (Render sets RENDER environment variable)
    if os.environ.get('RENDER'):
        # Get the Render service URL
        render_external_url = os.environ.get('RENDER_EXTERNAL_URL', '')
        if render_external_url:
            return f"{render_external_url}{image_path}"
        # Fallback to your known deployment URL
        return f"https://brfmlive.onrender.com{image_path}"
    
    # Local development
    return f"http://0.0.0.0:8000{image_path}"


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
