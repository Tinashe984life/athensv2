"""Avatar file storage helpers (stored under instance/uploads/avatars)."""
import os

from flask import current_app

ALLOWED_EXTS = ('png', 'jpg', 'jpeg', 'webp', 'gif')


def _safe_id(user_id):
    return bool(user_id) and all(c.isalnum() or c in '-_' for c in user_id)


def avatar_dir():
    d = os.path.join(current_app.instance_path, 'uploads', 'avatars')
    os.makedirs(d, exist_ok=True)
    return d


def find_avatar(user_id):
    """Return the stored avatar path for a user, or None."""
    if not _safe_id(user_id):
        return None
    d = avatar_dir()
    for ext in ALLOWED_EXTS:
        path = os.path.join(d, f'{user_id}.{ext}')
        if os.path.exists(path):
            return path
    return None


def remove_avatar(user_id):
    path = find_avatar(user_id)
    while path:
        os.remove(path)
        path = find_avatar(user_id)


def avatar_url_for(user_id):
    """Public URL for a user's avatar (cache-busted), or None if absent."""
    try:
        path = find_avatar(user_id)
    except RuntimeError:  # outside app context
        return None
    if not path:
        return None
    return f'/api/users/{user_id}/avatar?v={int(os.path.getmtime(path))}'
