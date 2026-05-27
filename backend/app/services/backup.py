"""SQLite snapshot backups with WAL-safe copy."""
import json
import os
import sqlite3
from datetime import datetime, timezone

from flask import current_app


MANIFEST_FILENAME = 'manifest.json'


def get_backup_dir():
    configured = current_app.config.get('BACKUP_DIR')
    if configured:
        return os.path.abspath(configured)
    instance_path = current_app.instance_path
    return os.path.join(instance_path, 'backups')


def is_sqlite_deployment():
    uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', '')
    return uri.startswith('sqlite:///')


def resolve_sqlite_path():
    """Resolve the on-disk SQLite file (Flask often stores it under instance/)."""
    if not is_sqlite_deployment():
        return None

    # Prefer SQLAlchemy's resolved path (matches the live connection)
    try:
        from app import db
        if db.engine.url.drivername == 'sqlite':
            engine_db = db.engine.url.database
            if engine_db and engine_db != ':memory:':
                resolved = _normalize_sqlite_file_path(engine_db)
                if resolved and os.path.exists(resolved):
                    return resolved
    except Exception:
        pass

    database_uri = current_app.config.get('SQLALCHEMY_DATABASE_URI', '')
    raw_path = database_uri.replace('sqlite:///', '', 1)
    resolved = _normalize_sqlite_file_path(raw_path)
    if resolved and os.path.exists(resolved):
        return resolved
    return None


def _normalize_sqlite_file_path(db_path):
    """Turn a SQLite URL database segment into an existing file path if possible."""
    if not db_path or db_path == ':memory:':
        return None

    # SQLAlchemy on Windows may expose paths like /C:/Users/...
    if os.name == 'nt' and db_path.startswith('/') and len(db_path) > 2 and db_path[2] == ':':
        db_path = db_path[1:]

    if os.path.isabs(db_path):
        return os.path.abspath(db_path)

    basename = os.path.basename(db_path)
    candidates = [
        os.path.join(current_app.instance_path, basename),
        os.path.join(current_app.instance_path, db_path),
        os.path.join(current_app.root_path, db_path),
        os.path.abspath(db_path),
    ]
    for candidate in candidates:
        if os.path.exists(candidate):
            return os.path.abspath(candidate)

    # Default location Flask uses for sqlite:///athens.db
    instance_default = os.path.join(current_app.instance_path, basename)
    return os.path.abspath(instance_default)


def _manifest_path():
    return os.path.join(get_backup_dir(), MANIFEST_FILENAME)


def _load_manifest():
    path = _manifest_path()
    if not os.path.exists(path):
        return {'backups': [], 'last_backup_at': None}
    with open(path, 'r', encoding='utf-8') as handle:
        return json.load(handle)


def _save_manifest(manifest):
    backup_dir = get_backup_dir()
    os.makedirs(backup_dir, exist_ok=True)
    with open(_manifest_path(), 'w', encoding='utf-8') as handle:
        json.dump(manifest, handle, indent=2)


def create_snapshot(trigger='manual'):
    """Create a timestamped SQLite backup. Returns metadata dict or raises ValueError."""
    if not is_sqlite_deployment():
        raise ValueError('Backups are only supported for SQLite deployments')

    db_path = resolve_sqlite_path()
    if not db_path or not os.path.exists(db_path):
        instance_hint = os.path.join(current_app.instance_path, 'athens.db')
        raise ValueError(
            f'SQLite database file not found. Expected near: {instance_hint}'
        )

    backup_dir = get_backup_dir()
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')
    filename = f'athens_backup_{timestamp}.db'
    dest_path = os.path.join(backup_dir, filename)

    source = sqlite3.connect(db_path)
    try:
        dest = sqlite3.connect(dest_path)
        try:
            source.backup(dest)
        finally:
            dest.close()
    finally:
        source.close()

    created_at = datetime.now(timezone.utc).isoformat()
    size_bytes = os.path.getsize(dest_path)

    manifest = _load_manifest()
    entry = {
        'filename': filename,
        'created_at': created_at,
        'size_bytes': size_bytes,
        'trigger': trigger,
    }
    manifest['backups'].insert(0, entry)
    manifest['last_backup_at'] = created_at

    max_keep = int(current_app.config.get('BACKUP_MAX_KEEP', 30))
    stale_entries = manifest['backups'][max_keep:]
    manifest['backups'] = manifest['backups'][:max_keep]

    for stale in stale_entries:
        stale_path = os.path.join(backup_dir, stale['filename'])
        if os.path.exists(stale_path):
            os.remove(stale_path)

    _save_manifest(manifest)
    return entry


def list_snapshots():
    manifest = _load_manifest()
    backup_dir = get_backup_dir()
    valid = []
    for entry in manifest.get('backups', []):
        path = os.path.join(backup_dir, entry['filename'])
        if os.path.exists(path):
            valid.append(entry)
    return valid, manifest.get('last_backup_at')


def get_snapshot_path(filename):
    if '..' in filename or '/' in filename or '\\' in filename:
        return None
    path = os.path.join(get_backup_dir(), filename)
    return path if os.path.exists(path) else None


def backup_status():
    """Summary for health dashboard."""
    is_sqlite = is_sqlite_deployment()
    db_path = resolve_sqlite_path()
    snapshots, last_backup_at = list_snapshots()
    backup_dir = get_backup_dir()
    total_size = sum(entry.get('size_bytes', 0) for entry in snapshots)
    return {
        'is_sqlite': is_sqlite,
        'db_file_found': bool(db_path and os.path.exists(db_path)),
        'db_path': db_path,
        'backup_count': len(snapshots),
        'last_backup_at': last_backup_at,
        'backup_dir': backup_dir,
        'total_backup_size_bytes': total_size,
        'scheduled_backups_enabled': bool(current_app.config.get('BACKUP_INTERVAL_HOURS')),
    }
