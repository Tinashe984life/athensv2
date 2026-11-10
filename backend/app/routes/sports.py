from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Athlete, Sport, SportMetric, MetricRecord
from datetime import datetime, date
import uuid

bp = Blueprint('sports', __name__, url_prefix='/api/sports')


@bp.route('/', methods=['GET'])
@jwt_required()
def get_sports():
    """List all active sports with their metrics"""
    try:
        sports = Sport.query.filter_by(is_active=True).order_by(Sport.name).all()
        return jsonify({
            'success': True,
            'sports': [sport.to_dict() for sport in sports]
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/', methods=['POST'])
@jwt_required()
def create_sport():
    """Create a new sport (coach/admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.role not in ('coach', 'admin'):
            return jsonify({'success': False, 'message': 'Only coaches and admins can create sports'}), 403

        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({'success': False, 'message': 'Missing required field: name'}), 400

        existing = Sport.query.filter(db.func.lower(Sport.name) == name.lower()).first()
        if existing:
            return jsonify({'success': False, 'message': 'A sport with this name already exists'}), 400

        sport = Sport(
            name=name,
            description=data.get('description'),
            icon=data.get('icon')
        )
        db.session.add(sport)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Sport created successfully',
            'sport': sport.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<sport_id>', methods=['PUT'])
@jwt_required()
def update_sport(sport_id):
    """Update a sport (coach/admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.role not in ('coach', 'admin'):
            return jsonify({'success': False, 'message': 'Only coaches and admins can update sports'}), 403

        sport = Sport.query.get(sport_id)
        if not sport:
            return jsonify({'success': False, 'message': 'Sport not found'}), 404

        data = request.get_json() or {}

        if 'name' in data and data['name']:
            new_name = data['name'].strip()
            duplicate = Sport.query.filter(
                db.func.lower(Sport.name) == new_name.lower(),
                Sport.id != sport_id
            ).first()
            if duplicate:
                return jsonify({'success': False, 'message': 'A sport with this name already exists'}), 400
            sport.name = new_name
        if 'description' in data:
            sport.description = data['description']
        if 'icon' in data:
            sport.icon = data['icon']
        if 'is_active' in data:
            sport.is_active = bool(data['is_active'])

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Sport updated successfully',
            'sport': sport.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<sport_id>', methods=['DELETE'])
@jwt_required()
def delete_sport(sport_id):
    """Soft delete a sport (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.role != 'admin':
            return jsonify({'success': False, 'message': 'Only admins can delete sports'}), 403

        sport = Sport.query.get(sport_id)
        if not sport:
            return jsonify({'success': False, 'message': 'Sport not found'}), 404

        sport.is_active = False
        for metric in sport.metrics:
            metric.is_active = False
        db.session.commit()

        return jsonify({'success': True, 'message': 'Sport deactivated successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<sport_id>/metrics', methods=['POST'])
@jwt_required()
def create_metric(sport_id):
    """Create a metric for a sport (coach/admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.role not in ('coach', 'admin'):
            return jsonify({'success': False, 'message': 'Only coaches and admins can create metrics'}), 403

        sport = Sport.query.get(sport_id)
        if not sport:
            return jsonify({'success': False, 'message': 'Sport not found'}), 404

        data = request.get_json() or {}
        name = (data.get('name') or '').strip()
        if not name:
            return jsonify({'success': False, 'message': 'Missing required field: name'}), 400

        duplicate = SportMetric.query.filter(
            SportMetric.sport_id == sport_id,
            db.func.lower(SportMetric.name) == name.lower()
        ).first()
        if duplicate:
            return jsonify({'success': False, 'message': 'A metric with this name already exists for this sport'}), 400

        direction = data.get('direction', 'higher')
        if direction not in ('higher', 'lower'):
            return jsonify({'success': False, 'message': "direction must be 'higher' or 'lower'"}), 400

        metric = SportMetric(
            sport_id=sport_id,
            name=name,
            unit=data.get('unit'),
            description=data.get('description'),
            direction=direction
        )
        db.session.add(metric)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Metric created successfully',
            'metric': metric.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/metrics/<metric_id>', methods=['PUT'])
@jwt_required()
def update_metric(metric_id):
    """Update a sport metric (coach/admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.role not in ('coach', 'admin'):
            return jsonify({'success': False, 'message': 'Only coaches and admins can update metrics'}), 403

        metric = SportMetric.query.get(metric_id)
        if not metric:
            return jsonify({'success': False, 'message': 'Metric not found'}), 404

        data = request.get_json() or {}

        if 'name' in data and data['name']:
            new_name = data['name'].strip()
            duplicate = SportMetric.query.filter(
                SportMetric.sport_id == metric.sport_id,
                db.func.lower(SportMetric.name) == new_name.lower(),
                SportMetric.id != metric_id
            ).first()
            if duplicate:
                return jsonify({'success': False, 'message': 'A metric with this name already exists for this sport'}), 400
            metric.name = new_name
        if 'unit' in data:
            metric.unit = data['unit']
        if 'description' in data:
            metric.description = data['description']
        if 'direction' in data:
            if data['direction'] not in ('higher', 'lower'):
                return jsonify({'success': False, 'message': "direction must be 'higher' or 'lower'"}), 400
            metric.direction = data['direction']
        if 'is_active' in data:
            metric.is_active = bool(data['is_active'])

        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Metric updated successfully',
            'metric': metric.to_dict()
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/metrics/<metric_id>', methods=['DELETE'])
@jwt_required()
def delete_metric(metric_id):
    """Soft delete a sport metric (coach/admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.role not in ('coach', 'admin'):
            return jsonify({'success': False, 'message': 'Only coaches and admins can delete metrics'}), 403

        metric = SportMetric.query.get(metric_id)
        if not metric:
            return jsonify({'success': False, 'message': 'Metric not found'}), 404

        metric.is_active = False
        db.session.commit()

        return jsonify({'success': True, 'message': 'Metric deactivated successfully'})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/records', methods=['POST'])
@jwt_required()
def create_records():
    """Bulk create metric records (coach/admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user or user.role not in ('coach', 'admin'):
            return jsonify({'success': False, 'message': 'Only coaches and admins can record metrics'}), 403

        data = request.get_json() or {}

        metric_id = data.get('metric_id')
        if not metric_id:
            return jsonify({'success': False, 'message': 'Missing required field: metric_id'}), 400

        metric = SportMetric.query.get(metric_id)
        if not metric or not metric.is_active:
            return jsonify({'success': False, 'message': 'Metric not found or inactive'}), 404

        record_date = date.today()
        if data.get('date'):
            try:
                record_date = datetime.strptime(data['date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date format, expected YYYY-MM-DD'}), 400

        notes = data.get('notes')

        # Accept bulk form {entries: [{athlete_id, value}...]} or single form {athlete_id, value}
        entries = data.get('entries')
        if entries is None:
            if 'athlete_id' not in data or 'value' not in data:
                return jsonify({'success': False, 'message': 'Provide entries list or athlete_id and value'}), 400
            entries = [{'athlete_id': data['athlete_id'], 'value': data['value']}]

        if not isinstance(entries, list) or not entries:
            return jsonify({'success': False, 'message': 'entries must be a non-empty list'}), 400

        records = []
        for entry in entries:
            athlete_id = entry.get('athlete_id')
            value = entry.get('value')

            if not athlete_id:
                return jsonify({'success': False, 'message': 'Each entry requires an athlete_id'}), 400

            athlete = Athlete.query.get(athlete_id)
            if not athlete:
                return jsonify({'success': False, 'message': f'Athlete not found: {athlete_id}'}), 404

            try:
                value = float(value)
            except (TypeError, ValueError):
                return jsonify({'success': False, 'message': f'Invalid value for athlete {athlete_id}: must be a number'}), 400

            record = MetricRecord(
                athlete_id=athlete_id,
                metric_id=metric_id,
                value=value,
                date=record_date,
                notes=notes if notes else entry.get('notes'),
                recorded_by=current_user_id
            )
            db.session.add(record)
            records.append(record)

        db.session.commit()

        return jsonify({
            'success': True,
            'records': [record.to_dict() for record in records],
            'count': len(records)
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/records', methods=['GET'])
@jwt_required()
def get_records():
    """List metric records with optional filters"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        query = MetricRecord.query

        # Athletes only see their own records
        if user.role == 'athlete':
            athlete = Athlete.query.filter_by(user_id=current_user_id).first()
            if not athlete:
                return jsonify({'success': True, 'records': [], 'count': 0})
            query = query.filter(MetricRecord.athlete_id == athlete.id)
        else:
            athlete_id = request.args.get('athlete_id')
            if athlete_id:
                query = query.filter(MetricRecord.athlete_id == athlete_id)

        metric_id = request.args.get('metric_id')
        if metric_id:
            query = query.filter(MetricRecord.metric_id == metric_id)

        sport_id = request.args.get('sport_id')
        if sport_id:
            query = query.join(SportMetric, MetricRecord.metric_id == SportMetric.id).filter(
                SportMetric.sport_id == sport_id
            )

        start_date = request.args.get('start_date')
        if start_date:
            query = query.filter(MetricRecord.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
        end_date = request.args.get('end_date')
        if end_date:
            query = query.filter(MetricRecord.date <= datetime.strptime(end_date, '%Y-%m-%d').date())

        limit = min(int(request.args.get('limit', 100)), 500)

        records = query.order_by(MetricRecord.date.desc(), MetricRecord.created_at.desc()).limit(limit).all()

        return jsonify({
            'success': True,
            'records': [record.to_dict() for record in records],
            'count': len(records)
        })
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/records/summary/<athlete_id>', methods=['GET'])
@jwt_required()
def get_records_summary(athlete_id):
    """Per-metric summary for an athlete"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)

        if not user:
            return jsonify({'success': False, 'message': 'User not found'}), 404

        athlete = Athlete.query.get(athlete_id)
        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404

        # Athletes can only access their own summary
        if user.role == 'athlete' and athlete.user_id != current_user_id:
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403

        records = MetricRecord.query.filter_by(athlete_id=athlete_id).order_by(
            MetricRecord.date.asc(), MetricRecord.created_at.asc()
        ).all()

        by_metric = {}
        for record in records:
            by_metric.setdefault(record.metric_id, []).append(record)

        summaries = []
        for metric_id, metric_records in by_metric.items():
            metric = metric_records[0].metric
            if not metric:
                continue

            values = [r.value for r in metric_records]
            latest = metric_records[-1]
            direction = metric.direction or 'higher'
            best_value = min(values) if direction == 'lower' else max(values)

            trend = 'steady'
            if len(metric_records) >= 2:
                previous = metric_records[-2]
                if latest.value != previous.value:
                    improved = latest.value < previous.value if direction == 'lower' else latest.value > previous.value
                    trend = 'improving' if improved else 'declining'

            summaries.append({
                'metric_id': metric_id,
                'metric_name': metric.name,
                'unit': metric.unit,
                'direction': direction,
                'sport_name': metric.sport.name if metric.sport else None,
                'count': len(metric_records),
                'latest_value': latest.value,
                'latest_date': latest.date.isoformat() if latest.date else None,
                'best_value': best_value,
                'first_value': metric_records[0].value,
                'trend': trend,
            })

        return jsonify({'success': True, 'summaries': summaries})
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500
