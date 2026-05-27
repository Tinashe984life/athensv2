"""Background scheduled SQLite backups."""
import os
import threading
import time

from flask import current_app


_scheduler_started = False
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
