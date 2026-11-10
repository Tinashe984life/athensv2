from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.models import User
from app.services.uploads import (
    ALLOWED_EXTS,
    avatar_dir,
    avatar_url_for,
    find_avatar,
    remove_avatar,
)
import os

bp = Blueprint('users', __name__, url_prefix='/api/users')

MAX_AVATAR_BYTES = 3 * 1024 * 1024  # 3 MB


def _can_manage_avatar(current_user, target):
    if not current_user or not target:
        return False
    if current_user.id == target.id:
        return True
    if current_user.role == 'admin':
        return True
    if current_user.role == 'coach' and target.role == 'athlete':
        return True
    return False


@bp.route('/<user_id>/avatar', methods=['GET'])
def get_avatar(user_id):
    """Serve a user's avatar image (public — referenced from <img> tags)."""
    path = find_avatar(user_id)
    if not path:
        return jsonify({'success': False, 'message': 'No avatar'}), 404
    return send_file(path, max_age=3600)


@bp.route('/<user_id>/avatar', methods=['POST'])
@jwt_required()
def upload_avatar(user_id):
    """Upload or replace a user's avatar."""
    try:
        current_user = User.query.get(get_jwt_identity())
        target = User.query.get(user_id)
        if not target:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        if not _can_manage_avatar(current_user, target):
            return jsonify({'success': False, 'message': 'Unauthorized to change this profile picture'}), 403

        file = request.files.get('file')
        if not file or not file.filename:
            return jsonify({'success': False, 'message': 'No image file provided'}), 400

        ext = file.filename.rsplit('.', 1)[-1].lower() if '.' in file.filename else ''
        if ext == 'jpeg':
            ext = 'jpg'
        if ext not in ALLOWED_EXTS or not (file.mimetype or '').startswith('image/'):
            return jsonify({'success': False, 'message': 'Only PNG, JPG, WEBP or GIF images are allowed'}), 400

        data = file.read()
        if len(data) > MAX_AVATAR_BYTES:
            return jsonify({'success': False, 'message': 'Image must be 3 MB or smaller'}), 400
        if len(data) == 0:
            return jsonify({'success': False, 'message': 'Empty file'}), 400

        remove_avatar(target.id)
        dest = os.path.join(avatar_dir(), f'{target.id}.{ext}')
        with open(dest, 'wb') as fh:
            fh.write(data)

        return jsonify({
            'success': True,
            'message': 'Profile picture updated',
            'avatar_url': avatar_url_for(target.id),
            'user': target.to_dict(),
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<user_id>/avatar', methods=['DELETE'])
@jwt_required()
def delete_avatar(user_id):
    """Remove a user's avatar."""
    try:
        current_user = User.query.get(get_jwt_identity())
        target = User.query.get(user_id)
        if not target:
            return jsonify({'success': False, 'message': 'User not found'}), 404
        if not _can_manage_avatar(current_user, target):
            return jsonify({'success': False, 'message': 'Unauthorized to change this profile picture'}), 403

        remove_avatar(target.id)
        return jsonify({'success': True, 'message': 'Profile picture removed', 'user': target.to_dict()})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
