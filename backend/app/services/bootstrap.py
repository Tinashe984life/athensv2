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
from app.models import User, Sport, SportMetric

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


# (name, icon, description, [(metric_name, unit, direction), ...])
DEFAULT_SPORTS = [
    ('Physical Education', '🏃', 'General PE fitness testing', [
        ('Bleep Test', 'level', 'higher'),
        ('40m Sprint', 's', 'lower'),
        ('Vertical Jump', 'cm', 'higher'),
        ('Push-ups in 60s', 'reps', 'higher'),
        ('Sit-ups in 60s', 'reps', 'higher'),
        ('Sit & Reach', 'cm', 'higher'),
    ]),
    ('Football (Soccer)', '⚽', None, [
        ('30m Sprint', 's', 'lower'),
        ('Yo-Yo IR1', 'level', 'higher'),
        ('Vertical Jump', 'cm', 'higher'),
        ('Illinois Agility', 's', 'lower'),
        ('Passing Accuracy', '%', 'higher'),
        ('Juggling', 'touches', 'higher'),
    ]),
    ('Rugby', '🏉', None, [
        ('40m Sprint', 's', 'lower'),
        ('Bronco Test', 's', 'lower'),
        ('Bench Press 1RM', 'kg', 'higher'),
        ('Squat 1RM', 'kg', 'higher'),
        ('Vertical Jump', 'cm', 'higher'),
        ('Tackle Technique Score', '/10', 'higher'),
    ]),
    ('Cricket', '🏏', None, [
        ('20m Sprint', 's', 'lower'),
        ('Bowling Speed', 'km/h', 'higher'),
        ('Throwing Accuracy', '%', 'higher'),
        ('Batting Drill Score', '/10', 'higher'),
        ('Catching Success', '%', 'higher'),
        ('Yo-Yo IR1', 'level', 'higher'),
    ]),
    ('Hockey', '🏑', None, [
        ('30m Sprint', 's', 'lower'),
        ('Illinois Agility', 's', 'lower'),
        ('Yo-Yo IR1', 'level', 'higher'),
        ('Shooting Accuracy', '%', 'higher'),
        ('Dribbling Circuit', 's', 'lower'),
    ]),
    ('Swimming', '🏊', None, [
        ('50m Freestyle', 's', 'lower'),
        ('100m Freestyle', 's', 'lower'),
        ('50m Backstroke', 's', 'lower'),
        ('50m Breaststroke', 's', 'lower'),
        ('Stroke Rate', 'strokes/min', 'higher'),
        ('Underwater Kick Distance', 'm', 'higher'),
    ]),
    ('Netball', '🏐', None, [
        ('20m Sprint', 's', 'lower'),
        ('Vertical Jump', 'cm', 'higher'),
        ('505 Agility', 's', 'lower'),
        ('Passing Accuracy', '%', 'higher'),
        ('Shooting Accuracy', '%', 'higher'),
    ]),
    ('Basketball', '🏀', None, [
        ('Lane Agility', 's', 'lower'),
        ('Vertical Jump', 'cm', 'higher'),
        ('3/4 Court Sprint', 's', 'lower'),
        ('Free Throw', '%', 'higher'),
        ('Bleep Test', 'level', 'higher'),
    ]),
    ('Athletics', '🏅', None, [
        ('100m Sprint', 's', 'lower'),
        ('400m', 's', 'lower'),
        ('1500m', 's', 'lower'),
        ('Long Jump', 'm', 'higher'),
        ('High Jump', 'm', 'higher'),
        ('Shot Put', 'm', 'higher'),
    ]),
]


def ensure_default_sports():
    """Seed default sports and their metrics (idempotent: skipped if any sport exists)."""
    if Sport.query.first():
        return False

    for name, icon, description, metrics in DEFAULT_SPORTS:
        sport = Sport(
            id=str(uuid.uuid4()),
            name=name,
            icon=icon,
            description=description,
        )
        db.session.add(sport)
        for metric_name, unit, direction in metrics:
            db.session.add(SportMetric(
                id=str(uuid.uuid4()),
                sport_id=sport.id,
                name=metric_name,
                unit=unit,
                direction=direction,
            ))

    db.session.commit()
    return True
