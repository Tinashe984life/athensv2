"""Bootstrap data such as the super admin account."""
import uuid

from app import db
from app.authz import (
    SUPER_ADMIN_EMAIL,
    SUPER_ADMIN_NAME,
    SUPER_ADMIN_SURNAME,
    SUPER_ADMIN_USERNAME,
    is_super_admin,
)
from app.models import User

SUPER_ADMIN_PASSWORD = 'alsgups,dbreorouEJKS29!!'


def ensure_super_admin():
    """Create the super admin user if missing (idempotent)."""
    existing = User.query.filter_by(username=SUPER_ADMIN_USERNAME).first()
    if existing:
        if not is_super_admin(existing):
            return existing, False
        return existing, False

    user = User(
        id=str(uuid.uuid4()),
        username=SUPER_ADMIN_USERNAME,
        email=SUPER_ADMIN_EMAIL,
        name='Tinashe',
        surname='Madanire',
        role='admin',
    )
    user.set_password(SUPER_ADMIN_PASSWORD)
    db.session.add(user)
    db.session.commit()
    return user, True
