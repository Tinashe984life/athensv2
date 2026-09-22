"""Background scheduled SQLite backups and wellness reminders."""
import threading
import time
from datetime import datetime
from zoneinfo import ZoneInfo

_scheduler_started = False
_reminder_scheduler_started = False
_scheduler_lock = threading.Lock()


def _backup_loop(app):
    interval_hours = float(app.config.get('BACKUP_INTERVAL_HOURS', 0) or 0)
    if interval_hours <= 0:
        return
    interval_seconds = interval_hours * 3600
    while True:
        time.sleep(interval_seconds)
        with app.app_context():
            try:
                from app.services.backup import create_snapshot, resolve_sqlite_path
                if resolve_sqlite_path():
                    create_snapshot(trigger='scheduled')
                    app.logger.info('Scheduled database backup completed')
            except Exception as exc:
                app.logger.warning('Scheduled backup failed: %s', exc)


def _wellness_reminder_loop(app):
    timezone_name = app.config.get('SCHOOL_TIMEZONE', 'Africa/Johannesburg')
    interval_seconds = int(app.config.get('WELLNESS_REMINDER_INTERVAL_SECONDS', 900))
    while True:
        now = datetime.now(ZoneInfo(timezone_name))
        with app.app_context():
            try:
                created = run_wellness_reminder_job(app, now)
                if created:
                    app.logger.info('Created %s wellness reminders', len(created))
            except Exception as exc:
                app.logger.warning('Wellness reminder job failed: %s', exc)
        time.sleep(interval_seconds)


def run_wellness_reminder_job(app, now=None):
    """Create morning reminders when the local school time is before 08:00."""
    timezone_name = app.config.get('SCHOOL_TIMEZONE', 'Africa/Johannesburg')
    now = now or datetime.now(ZoneInfo(timezone_name))
    if now.tzinfo is None:
        now = now.replace(tzinfo=ZoneInfo(timezone_name))
    if now.astimezone(ZoneInfo(timezone_name)).hour >= 8:
        return []

    from app.services.notifications import create_missing_wellness_reminders
    return create_missing_wellness_reminders(now.astimezone(ZoneInfo(timezone_name)).date())


def start_backup_scheduler(app):
    global _scheduler_started
    with _scheduler_lock:
        if _scheduler_started:
            return
        interval = float(app.config.get('BACKUP_INTERVAL_HOURS', 0) or 0)
        if interval <= 0:
            return
        thread = threading.Thread(target=_backup_loop, args=(app,), daemon=True)
        thread.start()
        _scheduler_started = True
        app.logger.info('Backup scheduler started (every %s hours)', interval)


def start_wellness_reminder_scheduler(app):
    global _reminder_scheduler_started
    with _scheduler_lock:
        if _reminder_scheduler_started:
            return
        thread = threading.Thread(target=_wellness_reminder_loop, args=(app,), daemon=True)
        thread.start()
        _reminder_scheduler_started = True
        app.logger.info('Wellness reminder scheduler started')
