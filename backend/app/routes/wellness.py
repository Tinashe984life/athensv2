# backend/app/routes/wellness.py - NEW FILE

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Athlete, WellnessEntry, Team
from datetime import date, datetime, timedelta
import uuid

bp = Blueprint('wellness', __name__, url_prefix='/api/wellness')

@bp.route('/', methods=['POST'])
@jwt_required()
def create_wellness_entry():
    """Create a new wellness entry"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role != 'athlete':
            return jsonify({'success': False, 'message': 'Only athletes can submit wellness entries'}), 403
        
        # Get athlete profile
        athlete = Athlete.query.filter_by(user_id=current_user_id).first()
        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete profile not found'}), 404
        
        data = request.get_json()
        
        # Check if entry already exists for today
        today = date.today()
        existing_entry = WellnessEntry.query.filter_by(
            athlete_id=athlete.id,
            date=today
        ).first()
        
        if existing_entry:
            return jsonify({
                'success': False, 
                'message': 'Wellness entry already submitted for today',
                'entry': existing_entry.to_dict()
            }), 400
        
        # Create new wellness entry
        wellness_entry = WellnessEntry(
            id=str(uuid.uuid4()),
            athlete_id=athlete.id,
            date=today,
            sleep_hours=data.get('sleep_hours'),
            sleep_quality=data.get('sleep_quality'),
            stress_level=data.get('stress_level'),
            muscle_soreness=data.get('muscle_soreness'),
            nutrition_quality=data.get('nutrition_quality'),
            mood=data.get('mood'),
            energy_level=data.get('energy_level'),
            motivation_level=data.get('motivation_level'),
            previous_session_rpe=data.get('previous_session_rpe'),
            previous_session_duration=data.get('previous_session_duration'),
            notes=data.get('notes')
        )
        
        # Calculate readiness score
        wellness_entry.readiness_score = wellness_entry.calculate_readiness_score()
        
        db.session.add(wellness_entry)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Wellness entry submitted successfully',
            'entry': wellness_entry.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/', methods=['GET'])
@jwt_required()
def get_wellness_entries():
    """Get wellness entries for the current user or their athletes"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        athlete_id = request.args.get('athlete_id')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', 30, type=int)
        
        entries = []
        
        if user.role == 'athlete':
            # Athlete can only see their own entries
            athlete = Athlete.query.filter_by(user_id=current_user_id).first()
            if athlete:
                query = WellnessEntry.query.filter_by(athlete_id=athlete.id)
                entries = query.order_by(WellnessEntry.date.desc()).limit(limit).all()
                
        elif user.role == 'coach':
            # Coach can see entries for their athletes
            if athlete_id:
                # Check if coach has access to this athlete
                athlete = Athlete.query.get(athlete_id)
                if not athlete:
                    return jsonify({'success': False, 'message': 'Athlete not found'}), 404
                
                team = Team.query.get(athlete.team_id)
                if not team or team.coach_id != current_user_id:
                    return jsonify({'success': False, 'message': 'Unauthorized'}), 403
                
                query = WellnessEntry.query.filter_by(athlete_id=athlete_id)
            else:
                # Get all athletes coached by this user
                teams = Team.query.filter_by(coach_id=current_user_id).all()
                team_ids = [team.id for team in teams]
                athletes = Athlete.query.filter(Athlete.team_id.in_(team_ids)).all()
                athlete_ids = [athlete.id for athlete in athletes]
                
                query = WellnessEntry.query.filter(WellnessEntry.athlete_id.in_(athlete_ids))
            
            # Apply date filters
            if start_date:
                query = query.filter(WellnessEntry.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
            if end_date:
                query = query.filter(WellnessEntry.date <= datetime.strptime(end_date, '%Y-%m-%d').date())
            
            entries = query.order_by(WellnessEntry.date.desc()).limit(limit).all()
            
        elif user.role == 'admin':
            # Admin can see all entries
            query = WellnessEntry.query
            
            if start_date:
                query = query.filter(WellnessEntry.date >= datetime.strptime(start_date, '%Y-%m-%d').date())
            if end_date:
                query = query.filter(WellnessEntry.date <= datetime.strptime(end_date, '%Y-%m-%d').date())
            
            entries = query.order_by(WellnessEntry.date.desc()).limit(limit).all()
        
        return jsonify({
            'success': True,
            'entries': [entry.to_dict() for entry in entries],
            'count': len(entries)
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/today', methods=['GET'])
@jwt_required()
def get_today_wellness():
    """Get today's wellness entry for the current athlete"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role != 'athlete':
            return jsonify({'success': False, 'message': 'Only athletes can check today\'s wellness'}), 403
        
        athlete = Athlete.query.filter_by(user_id=current_user_id).first()
        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete profile not found'}), 404
        
        today = date.today()
        entry = WellnessEntry.query.filter_by(
            athlete_id=athlete.id,
            date=today
        ).first()
        
        return jsonify({
            'success': True,
            'has_submitted': entry is not None,
            'entry': entry.to_dict() if entry else None
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/<entry_id>', methods=['GET'])
@jwt_required()
def get_wellness_entry(entry_id):
    """Get a specific wellness entry"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        entry = WellnessEntry.query.get(entry_id)
        if not entry:
            return jsonify({'success': False, 'message': 'Wellness entry not found'}), 404
        
        # Check permissions
        can_view = False
        if user.role == 'admin':
            can_view = True
        elif user.role == 'coach':
            athlete = Athlete.query.get(entry.athlete_id)
            if athlete:
                team = Team.query.get(athlete.team_id)
                if team and team.coach_id == current_user_id:
                    can_view = True
        elif user.role == 'athlete':
            athlete = Athlete.query.filter_by(user_id=current_user_id).first()
            if athlete and athlete.id == entry.athlete_id:
                can_view = True
        
        if not can_view:
            return jsonify({'success': False, 'message': 'Unauthorized to view this entry'}), 403
        
        return jsonify({
            'success': True,
            'entry': entry.to_dict()
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/<entry_id>', methods=['PUT'])
@jwt_required()
def update_wellness_entry(entry_id):
    """Update a wellness entry (athlete only, only on same day)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role != 'athlete':
            return jsonify({'success': False, 'message': 'Only athletes can update wellness entries'}), 403
        
        entry = WellnessEntry.query.get(entry_id)
        if not entry:
            return jsonify({'success': False, 'message': 'Wellness entry not found'}), 404
        
        # Check if athlete owns this entry
        athlete = Athlete.query.filter_by(user_id=current_user_id).first()
        if not athlete or athlete.id != entry.athlete_id:
            return jsonify({'success': False, 'message': 'Unauthorized to update this entry'}), 403
        
        # Check if entry is from today (can only update same day entries)
        today = date.today()
        if entry.date != today:
            return jsonify({'success': False, 'message': 'Can only update today\'s wellness entry'}), 400
        
        data = request.get_json()
        
        # Update fields
        update_fields = [
            'sleep_hours', 'sleep_quality', 'stress_level', 'muscle_soreness',
            'nutrition_quality', 'mood', 'energy_level', 'motivation_level',
            'previous_session_rpe', 'previous_session_duration', 'notes'
        ]
        
        for field in update_fields:
            if field in data:
                setattr(entry, field, data[field])
        
        # Recalculate readiness score
        entry.readiness_score = entry.calculate_readiness_score()
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Wellness entry updated successfully',
            'entry': entry.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/stats', methods=['GET'])
@jwt_required()
def get_wellness_stats():
    """Get wellness statistics for the current user or their athletes"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        athlete_id = request.args.get('athlete_id')
        days = request.args.get('days', 30, type=int)
        
        start_date = date.today() - timedelta(days=days)
        
        if user.role == 'athlete':
            # Get athlete's own stats
            athlete = Athlete.query.filter_by(user_id=current_user_id).first()
            if not athlete:
                return jsonify({'success': False, 'message': 'Athlete profile not found'}), 404
            
            entries = WellnessEntry.query.filter(
                WellnessEntry.athlete_id == athlete.id,
                WellnessEntry.date >= start_date
            ).order_by(WellnessEntry.date.asc()).all()
            
        elif user.role == 'coach':
            if athlete_id:
                # Check if coach has access to this athlete
                athlete = Athlete.query.get(athlete_id)
                if not athlete:
                    return jsonify({'success': False, 'message': 'Athlete not found'}), 404
                
                team = Team.query.get(athlete.team_id)
                if not team or team.coach_id != current_user_id:
                    return jsonify({'success': False, 'message': 'Unauthorized'}), 403
                
                entries = WellnessEntry.query.filter(
                    WellnessEntry.athlete_id == athlete_id,
                    WellnessEntry.date >= start_date
                ).order_by(WellnessEntry.date.asc()).all()
            else:
                # Get all athletes coached by this user
                teams = Team.query.filter_by(coach_id=current_user_id).all()
                team_ids = [team.id for team in teams]
                athletes = Athlete.query.filter(Athlete.team_id.in_(team_ids)).all()
                athlete_ids = [athlete.id for athlete in athletes]
                
                entries = WellnessEntry.query.filter(
                    WellnessEntry.athlete_id.in_(athlete_ids),
                    WellnessEntry.date >= start_date
                ).order_by(WellnessEntry.date.asc()).all()
        
        elif user.role == 'admin':
            entries = WellnessEntry.query.filter(
                WellnessEntry.date >= start_date
            ).order_by(WellnessEntry.date.asc()).all()
        
        # Calculate statistics
        if not entries:
            return jsonify({
                'success': True,
                'stats': {
                    'total_entries': 0,
                    'avg_readiness': 0,
                    'compliance_rate': 0,
                    'avg_sleep_hours': 0,
                    'avg_stress_level': 0,
                    'avg_muscle_soreness': 0
                },
                'trends': []
            })
        
        total_entries = len(entries)
        avg_readiness = sum(e.readiness_score or 0 for e in entries) / total_entries
        avg_sleep_hours = sum(e.sleep_hours or 0 for e in entries) / total_entries
        avg_stress_level = sum(e.stress_level or 0 for e in entries) / total_entries
        avg_muscle_soreness = sum(e.muscle_soreness or 0 for e in entries) / total_entries
        
        # Calculate daily trends (last 7 days)
        trends = []
        for i in range(7):
            day = date.today() - timedelta(days=i)
            day_entries = [e for e in entries if e.date == day]
            if day_entries:
                day_avg_readiness = sum(e.readiness_score or 0 for e in day_entries) / len(day_entries)
                trends.append({
                    'date': day.isoformat(),
                    'readiness': round(day_avg_readiness, 1),
                    'entries_count': len(day_entries)
                })
        
        return jsonify({
            'success': True,
            'stats': {
                'total_entries': total_entries,
                'avg_readiness': round(avg_readiness, 1),
                'compliance_rate': round((total_entries / days) * 100, 1) if days > 0 else 0,
                'avg_sleep_hours': round(avg_sleep_hours, 1),
                'avg_stress_level': round(avg_stress_level, 1),
                'avg_muscle_soreness': round(avg_muscle_soreness, 1)
            },
            'trends': trends
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500

@bp.route('/team-overview', methods=['GET'])
@jwt_required()
def get_team_wellness_overview():
    """Get wellness overview for a coach's team"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role != 'coach':
            return jsonify({'success': False, 'message': 'Only coaches can view team wellness'}), 403
        
        team_id = request.args.get('team_id')
        
        # Get coach's teams
        teams = Team.query.filter_by(coach_id=current_user_id).all()
        if not teams:
            return jsonify({'success': False, 'message': 'No teams found'}), 404
        
        # If team_id specified, verify it belongs to coach
        if team_id:
            team = next((t for t in teams if t.id == team_id), None)
            if not team:
                return jsonify({'success': False, 'message': 'Team not found or unauthorized'}), 404
            teams = [team]
        
        today = date.today()
        seven_days_ago = today - timedelta(days=7)
        
        team_overview = []
        
        for team in teams:
            # Get team athletes
            athletes = Athlete.query.filter_by(team_id=team.id).all()
            
            team_data = {
                'team_id': team.id,
                'team_name': team.name,
                'total_athletes': len(athletes),
                'athletes': []
            }
            
            for athlete in athletes:
                # Get today's wellness entry
                today_entry = WellnessEntry.query.filter_by(
                    athlete_id=athlete.id,
                    date=today
                ).first()
                
                # Get entries from last 7 days
                recent_entries = WellnessEntry.query.filter(
                    WellnessEntry.athlete_id == athlete.id,
                    WellnessEntry.date >= seven_days_ago
                ).order_by(WellnessEntry.date.desc()).all()
                
                # Calculate athlete status
                status = 'green'  # default
                if today_entry:
                    readiness = today_entry.readiness_score or 0
                    if readiness <= 4:
                        status = 'red'
                    elif readiness <= 7:
                        status = 'yellow'
                
                athlete_data = {
                    'athlete_id': athlete.id,
                    'name': f"{athlete.user.name} {athlete.user.surname}",
                    'jersey_number': athlete.jersey_number,
                    'position': athlete.position,
                    'has_submitted_today': today_entry is not None,
                    'today_readiness': today_entry.readiness_score if today_entry else None,
                    'status': status,
                    'recent_entries_count': len(recent_entries),
                    'avg_readiness_7d': round(
                        sum(e.readiness_score or 0 for e in recent_entries) / len(recent_entries), 1
                    ) if recent_entries else 0
                }
                
                team_data['athletes'].append(athlete_data)
            
            # Calculate team compliance (percentage who submitted today)
            submitted_today = sum(1 for a in team_data['athletes'] if a['has_submitted_today'])
            team_data['compliance_rate'] = round((submitted_today / team_data['total_athletes']) * 100, 1) if team_data['total_athletes'] > 0 else 0
            
            team_overview.append(team_data)
        
        return jsonify({
            'success': True,
            'teams': team_overview
        })
        
    except Exception as e:
        return jsonify({'success': False, 'message': str(e)}), 500