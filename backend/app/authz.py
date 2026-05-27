"""Authorization helpers — super admin is identified by hardcoded identity, not a DB column."""
import hmac
import os
import random
from datetime import datetime, timedelta

from flask import current_app
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired

# Super admin identity (all fields must match)
SUPER_ADMIN_NAME = 'tinashe'
SUPER_ADMIN_SURNAME = 'madanire'
SUPER_ADMIN_EMAIL = 'madtinashe@gmail.com'
SUPER_ADMIN_USERNAME = 'sauron-ceasar'

SECURITY_QUESTIONS = {
    'q1': {
        'question': 'What is the road to Santiago?',
        'answer': 'pilgrim76',
    },
    'q2': {
        'question': 'So what am I supposed to do?',
        'answer': 'smoke',
    },
    'q3': {
        'question': 'Beatiful Quant Girl from Varsity?',
        'answer': 'ruvimbo',
    },
}

CHALLENGE_MAX_AGE_SECONDS = 300  # 5 minutes


def _normalize(value):
    return (value or '').strip().lower()


def is_super_admin(user):
    """True only for the designated super admin account."""
    if not user or user.role != 'admin':
        return False
    return (
        _normalize(user.name) == SUPER_ADMIN_NAME
        and _normalize(user.surname) == SUPER_ADMIN_SURNAME
        and _normalize(user.email) == SUPER_ADMIN_EMAIL
        and _normalize(user.username) == SUPER_ADMIN_USERNAME
    )


def is_team_manager(user):
    """Lesser-privileged admin (athlete/coach ops only)."""
    return bool(user and user.role == 'admin' and not is_super_admin(user))


def is_any_admin(user):
    return bool(user and user.role == 'admin')


def admin_scope(user):
    if is_super_admin(user):
        return 'full'
    if is_team_manager(user):
        return 'athlete_ops'
    return None


def enrich_user_payload(user):
    """Add admin scope flags to API user payloads."""
    data = user.to_dict()
    scope = admin_scope(user)
    data['admin_scope'] = scope
    data['is_super_admin'] = scope == 'full'
    data['is_team_manager'] = scope == 'athlete_ops'
    return data


def pick_security_question():
    question_id = random.choice(list(SECURITY_QUESTIONS.keys()))
    return question_id, SECURITY_QUESTIONS[question_id]['question']


def verify_security_answer(question_id, answer):
    entry = SECURITY_QUESTIONS.get(question_id)
    if not entry or not answer:
        return False
    return hmac.compare_digest(_normalize(answer), entry['answer'])


def _challenge_serializer():
    secret = current_app.config['SECRET_KEY']
    return URLSafeTimedSerializer(secret, salt='athens-security-challenge')


def create_security_challenge(user_id):
    return _challenge_serializer().dumps({'user_id': user_id})


def verify_security_challenge(token):
    try:
        payload = _challenge_serializer().loads(token, max_age=CHALLENGE_MAX_AGE_SECONDS)
        return payload.get('user_id')
    except (BadSignature, SignatureExpired):
        return None


def team_manager_allowed_roles():
    return {'coach', 'athlete'}


def can_manage_target_user(actor, target):
    """Whether actor may create/update/delete the target user."""
    if is_super_admin(actor):
        return True
    if not is_team_manager(actor):
        return False
    if not target:
        return True
    if is_super_admin(target) or is_team_manager(target):
        return False
    return target.role in team_manager_allowed_roles()


def can_assign_role(actor, role):
    if is_super_admin(actor):
        return role in ('admin', 'coach', 'athlete')
    if is_team_manager(actor):
        return role in team_manager_allowed_roles()
    return False


def is_ephemeral_filesystem():
    if os.environ.get('ATHENS_EPHEMERAL_FS', '').lower() in ('1', 'true', 'yes'):
        return True
    ephemeral_markers = (
        'RENDER',
        'DYNO',
        'VERCEL',
        'RAILWAY_ENVIRONMENT',
        'FLY_APP_NAME',
        'AWS_EXECUTION_ENV',
    )
    return any(os.environ.get(marker) for marker in ephemeral_markers)
