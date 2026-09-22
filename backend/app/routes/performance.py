from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app import db
from app.models import User, Athlete, PerformanceTest, Team
from datetime import date, datetime, timedelta
import uuid
import traceback

bp = Blueprint('performance', __name__, url_prefix='/api/performance')


@bp.route('/', methods=['POST'])
@jwt_required()
def create_performance_test():
    """Create a new performance test entry"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role not in ['coach', 'admin']:
            return jsonify({'success': False, 'message': 'Only coaches and admins can create performance tests'}), 403
        
        data = request.get_json()
        required_fields = ['athlete_id', 'test_type']
        for field in required_fields:
            if field not in data:
                return jsonify({'success': False, 'message': f'Missing required field: {field}'}), 400
        
        # Check if athlete exists and coach has access
        athlete = Athlete.query.get(data['athlete_id'])
        if not athlete:
            return jsonify({'success': False, 'message': 'Athlete not found'}), 404
        
        if user.role == 'coach':
            team = Team.query.get(athlete.team_id)
            if not team or team.coach_id != current_user_id:
                return jsonify({'success': False, 'message': 'Unauthorized to test this athlete'}), 403
        
        # Parse test_date - convert string to date object
        test_date_str = data.get('test_date')
        if test_date_str:
            try:
                test_date = datetime.strptime(test_date_str, '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
        else:
            test_date = date.today()
        
        # Create new performance test
        performance_test = PerformanceTest(
            id=str(uuid.uuid4()),
            athlete_id=athlete.id,
            test_date=test_date,  # Now a date object
            term=data.get('term'),
            test_type=data['test_type'],
            
            # Anthropometric measurements
            height=data.get('height'),
            weight=data.get('weight'),
            body_fat_percentage=data.get('body_fat_percentage'),
            
            # Strength tests
            bench_press_1rm=data.get('bench_press_1rm'),
            squat_1rm=data.get('squat_1rm'),
            deadlift_1rm=data.get('deadlift_1rm'),
            pull_ups_max=data.get('pull_ups_max'),
            push_ups_1min=data.get('push_ups_1min'),
            sit_ups_2min=data.get('sit_ups_2min'),
            
            # Speed tests
            sprint_10m=data.get('sprint_10m'),
            sprint_20m=data.get('sprint_20m'),
            sprint_40m=data.get('sprint_40m'),
            sprint_5m=data.get('sprint_5m'),
            sprint_15m=data.get('sprint_15m'),
            
            # Agility tests
            agility_t_test=data.get('agility_t_test'),
            agility_505=data.get('agility_505'),
            illinois_agility=data.get('illinois_agility'),
            
            # Jump tests
            vertical_jump=data.get('vertical_jump'),
            broad_jump=data.get('broad_jump'),
            single_leg_jump_left=data.get('single_leg_jump_left'),
            single_leg_jump_right=data.get('single_leg_jump_right'),
            stiff_arm_jump=data.get('stiff_arm_jump'),
            cmj=data.get('cmj'),
            depth_drop_jump=data.get('depth_drop_jump'),
            
            # Endurance tests
            yo_yo_test=data.get('yo_yo_test'),
            bronco_test=data.get('bronco_test'),
            
            # Flexibility tests
            sit_and_reach=data.get('sit_and_reach'),
            knee_to_wall=data.get('knee_to_wall'),
            dorsiflexion_left=data.get('dorsiflexion_left'),
            dorsiflexion_right=data.get('dorsiflexion_right'),
            
            notes=data.get('notes')
        )
        
        db.session.add(performance_test)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Performance test recorded successfully',
            'test': performance_test.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"Error creating performance test: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/', methods=['GET'])
@jwt_required()
def get_performance_tests():
    """Get performance tests for the current user or their athletes"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        athlete_id = request.args.get('athlete_id')
        test_type = request.args.get('test_type')
        term = request.args.get('term', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', 50, type=int)
        
        tests = []
        
        if user.role == 'athlete':
            # Athlete can only see their own tests
            athlete = Athlete.query.filter_by(user_id=current_user_id).first()
            if athlete:
                query = PerformanceTest.query.filter_by(athlete_id=athlete.id)
                
                # Apply date filters
                if start_date:
                    try:
                        start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                        query = query.filter(PerformanceTest.test_date >= start_date_obj)
                    except ValueError:
                        return jsonify({'success': False, 'message': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
                if end_date:
                    try:
                        end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                        query = query.filter(PerformanceTest.test_date <= end_date_obj)
                    except ValueError:
                        return jsonify({'success': False, 'message': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
                
                tests = query.order_by(PerformanceTest.test_date.desc()).limit(limit).all()
                
        elif user.role == 'coach':
            # Coach can see tests for their athletes
            if athlete_id:
                # Check if coach has access to this athlete
                athlete = Athlete.query.get(athlete_id)
                if not athlete:
                    return jsonify({'success': False, 'message': 'Athlete not found'}), 404
                
                team = Team.query.get(athlete.team_id)
                if not team or team.coach_id != current_user_id:
                    return jsonify({'success': False, 'message': 'Unauthorized'}), 403
                
                query = PerformanceTest.query.filter_by(athlete_id=athlete_id)
            else:
                # Get all athletes coached by this user
                teams = Team.query.filter_by(coach_id=current_user_id).all()
                team_ids = [team.id for team in teams]
                athletes = Athlete.query.filter(Athlete.team_id.in_(team_ids)).all()
                athlete_ids = [athlete.id for athlete in athletes]
                
                query = PerformanceTest.query.filter(PerformanceTest.athlete_id.in_(athlete_ids))
            
            # Apply filters
            if test_type:
                query = query.filter_by(test_type=test_type)
            if term:
                query = query.filter_by(term=term)
            
            # Apply date filters
            if start_date:
                try:
                    start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                    query = query.filter(PerformanceTest.test_date >= start_date_obj)
                except ValueError:
                    return jsonify({'success': False, 'message': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
            if end_date:
                try:
                    end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                    query = query.filter(PerformanceTest.test_date <= end_date_obj)
                except ValueError:
                    return jsonify({'success': False, 'message': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
            
            tests = query.order_by(PerformanceTest.test_date.desc()).limit(limit).all()
            
        elif user.role == 'admin':
            # Admin can see all tests
            query = PerformanceTest.query
            
            if test_type:
                query = query.filter_by(test_type=test_type)
            if term:
                query = query.filter_by(term=term)
            
            # Apply date filters
            if start_date:
                try:
                    start_date_obj = datetime.strptime(start_date, '%Y-%m-%d').date()
                    query = query.filter(PerformanceTest.test_date >= start_date_obj)
                except ValueError:
                    return jsonify({'success': False, 'message': 'Invalid start_date format. Use YYYY-MM-DD'}), 400
            if end_date:
                try:
                    end_date_obj = datetime.strptime(end_date, '%Y-%m-%d').date()
                    query = query.filter(PerformanceTest.test_date <= end_date_obj)
                except ValueError:
                    return jsonify({'success': False, 'message': 'Invalid end_date format. Use YYYY-MM-DD'}), 400
            
            tests = query.order_by(PerformanceTest.test_date.desc()).limit(limit).all()
        
        return jsonify({
            'success': True,
            'tests': [test.to_dict() for test in tests],
            'count': len(tests)
        })
        
    except Exception as e:
        print(f"Error getting performance tests: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<test_id>', methods=['GET'])
@jwt_required()
def get_performance_test(test_id):
    """Get a specific performance test"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        test = PerformanceTest.query.get(test_id)
        if not test:
            return jsonify({'success': False, 'message': 'Performance test not found'}), 404
        
        # Check permissions
        can_view = False
        if user.role == 'admin':
            can_view = True
        elif user.role == 'coach':
            athlete = Athlete.query.get(test.athlete_id)
            if athlete:
                team = Team.query.get(athlete.team_id)
                if team and team.coach_id == current_user_id:
                    can_view = True
        elif user.role == 'athlete':
            athlete = Athlete.query.filter_by(user_id=current_user_id).first()
            if athlete and athlete.id == test.athlete_id:
                can_view = True
        
        if not can_view:
            return jsonify({'success': False, 'message': 'Unauthorized to view this test'}), 403
        
        return jsonify({
            'success': True,
            'test': test.to_dict()
        })
        
    except Exception as e:
        print(f"Error getting performance test: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<test_id>', methods=['PUT'])
@jwt_required()
def update_performance_test(test_id):
    """Update a performance test (coach/admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role not in ['coach', 'admin']:
            return jsonify({'success': False, 'message': 'Only coaches and admins can update performance tests'}), 403
        
        test = PerformanceTest.query.get(test_id)
        if not test:
            return jsonify({'success': False, 'message': 'Performance test not found'}), 404
        
        # Check permissions
        if user.role == 'coach':
            athlete = Athlete.query.get(test.athlete_id)
            if not athlete:
                return jsonify({'success': False, 'message': 'Athlete not found'}), 404
            
            team = Team.query.get(athlete.team_id)
            if not team or team.coach_id != current_user_id:
                return jsonify({'success': False, 'message': 'Unauthorized to update this test'}), 403
        
        data = request.get_json()
        
        # Update fields
        update_fields = [
            'term', 'test_type', 'height', 'weight', 'body_fat_percentage',
            'bench_press_1rm', 'squat_1rm', 'deadlift_1rm', 'pull_ups_max',
            'push_ups_1min', 'sit_ups_2min', 'sprint_10m', 'sprint_20m',
            'sprint_40m', 'sprint_5m', 'sprint_15m', 'agility_t_test', 'agility_505', 'illinois_agility',
            'vertical_jump', 'broad_jump', 'single_leg_jump_left',
            'single_leg_jump_right', 'stiff_arm_jump', 'cmj', 'depth_drop_jump',
            'yo_yo_test', 'bronco_test', 'sit_and_reach', 'knee_to_wall',
            'dorsiflexion_left', 'dorsiflexion_right', 'notes'
        ]
        
        for field in update_fields:
            if field in data:
                setattr(test, field, data[field])
        
        # Handle date separately to convert string to date object
        if 'test_date' in data and data['test_date']:
            try:
                test.test_date = datetime.strptime(data['test_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'success': False, 'message': 'Invalid date format. Use YYYY-MM-DD'}), 400
        
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Performance test updated successfully',
            'test': test.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error updating performance test: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/<test_id>', methods=['DELETE'])
@jwt_required()
def delete_performance_test(test_id):
    """Delete a performance test (coach/admin only)"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        if user.role not in ['coach', 'admin']:
            return jsonify({'success': False, 'message': 'Only coaches and admins can delete performance tests'}), 403
        
        test = PerformanceTest.query.get(test_id)
        if not test:
            return jsonify({'success': False, 'message': 'Performance test not found'}), 404
        
        # Check permissions
        if user.role == 'coach':
            athlete = Athlete.query.get(test.athlete_id)
            if not athlete:
                return jsonify({'success': False, 'message': 'Athlete not found'}), 404
            
            team = Team.query.get(athlete.team_id)
            if not team or team.coach_id != current_user_id:
                return jsonify({'success': False, 'message': 'Unauthorized to delete this test'}), 403
        
        db.session.delete(test)
        db.session.commit()
        
        return jsonify({
            'success': True,
            'message': 'Performance test deleted successfully'
        })
        
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting performance test: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/stats', methods=['GET'])
@jwt_required()
def get_performance_stats():
    """Get performance statistics for an athlete"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        athlete_id = request.args.get('athlete_id')
        test_type = request.args.get('test_type')
        metric = request.args.get('metric')  # Specific metric to analyze
        term = request.args.get('term', type=int)
        
        if not athlete_id:
            return jsonify({'success': False, 'message': 'Athlete ID is required'}), 400
        
        # Check permissions
        if user.role == 'athlete':
            athlete = Athlete.query.filter_by(user_id=current_user_id).first()
            if not athlete or athlete.id != athlete_id:
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        elif user.role == 'coach':
            athlete = Athlete.query.get(athlete_id)
            if not athlete:
                return jsonify({'success': False, 'message': 'Athlete not found'}), 404
            
            team = Team.query.get(athlete.team_id)
            if not team or team.coach_id != current_user_id:
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Get tests for the athlete
        query = PerformanceTest.query.filter_by(athlete_id=athlete_id)
        if test_type:
            query = query.filter_by(test_type=test_type)
        if term:
            query = query.filter_by(term=term)
        
        tests = query.order_by(PerformanceTest.test_date.asc()).all()
        
        if not tests:
            return jsonify({
                'success': True,
                'stats': {
                    'total_tests': 0,
                    'test_types': [],
                    'improvements': {},
                    'latest_values': {}
                },
                'trends': []
            })
        
        # Calculate statistics
        total_tests = len(tests)
        test_types = list(set(test.test_type for test in tests))
        
        # Get latest values for common metrics
        latest_values = {}
        team_average_values = {}
        if tests:
            latest = tests[-1]
            metrics = [
                ('height', 'cm'),
                ('weight', 'kg'),
                ('bench_press_1rm', 'kg'),
                ('squat_1rm', 'kg'),
                ('deadlift_1rm', 'kg'),
                ('vertical_jump', 'cm'),
                ('broad_jump', 'cm'),
                ('sprint_40m', 's')
            ]
            
            for metric_name, unit in metrics:
                value = getattr(latest, metric_name)
                if value:
                    latest_values[metric_name] = {'value': value, 'unit': unit}

        if user.role == 'coach':
            team_athlete_ids = [athlete.id for athlete in Athlete.query.filter_by(team_id=athlete.team_id).all()]
            team_query = PerformanceTest.query.filter(PerformanceTest.athlete_id.in_(team_athlete_ids))
            if term:
                team_query = team_query.filter_by(term=term)
            team_tests = team_query.all()
            for metric_name, unit in metrics:
                values = [getattr(test, metric_name) for test in team_tests if getattr(test, metric_name) is not None]
                if values:
                    team_average_values[metric_name] = {'value': round(sum(values) / len(values), 2), 'unit': unit}
        
        # Calculate improvements
        improvements = {}
        if len(tests) >= 2:
            first_test = tests[0]
            latest_test = tests[-1]
            
            improvement_metrics = [
                ('bench_press_1rm', 'kg'),
                ('squat_1rm', 'kg'),
                ('deadlift_1rm', 'kg'),
                ('vertical_jump', 'cm'),
                ('broad_jump', 'cm'),
                ('sprint_40m', 's')
            ]
            
            for metric_name, unit in improvement_metrics:
                first_value = getattr(first_test, metric_name)
                latest_value = getattr(latest_test, metric_name)
                
                if first_value and latest_value:
                    change = latest_value - first_value
                    percent_change = (change / first_value) * 100 if first_value != 0 else 0
                    
                    improvements[metric_name] = {
                        'first': first_value,
                        'latest': latest_value,
                        'change': round(change, 2),
                        'percent_change': round(percent_change, 1),
                        'unit': unit,
                        'trend': 'up' if change > 0 else 'down' if change < 0 else 'stable'
                    }
        
        # Get trends for specific metric if requested
        trends = []
        if metric:
            metric_tests = [test for test in tests if getattr(test, metric) is not None]
            if metric_tests:
                trends = [{
                    'date': test.test_date.isoformat(),
                    'value': getattr(test, metric),
                    'test_type': test.test_type
                } for test in metric_tests]
        
        return jsonify({
            'success': True,
            'stats': {
                'total_tests': total_tests,
                'test_types': test_types,
                'improvements': improvements,
                'latest_values': latest_values
                , 'team_average_values': team_average_values
            },
            'trends': trends
        })
        
    except Exception as e:
        print(f"Error in get_performance_stats: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500


@bp.route('/athlete-summary/<athlete_id>', methods=['GET'])
@jwt_required()
def get_athlete_performance_summary(athlete_id):
    """Get performance summary for a specific athlete"""
    try:
        current_user_id = get_jwt_identity()
        user = User.query.get(current_user_id)
        
        # Check permissions
        if user.role == 'athlete':
            athlete = Athlete.query.filter_by(user_id=current_user_id).first()
            if not athlete or athlete.id != athlete_id:
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        elif user.role == 'coach':
            athlete = Athlete.query.get(athlete_id)
            if not athlete:
                return jsonify({'success': False, 'message': 'Athlete not found'}), 404
            
            team = Team.query.get(athlete.team_id)
            if not team or team.coach_id != current_user_id:
                return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        elif user.role != 'admin':
            return jsonify({'success': False, 'message': 'Unauthorized'}), 403
        
        # Get all tests for the athlete
        tests = PerformanceTest.query.filter_by(athlete_id=athlete_id).order_by(PerformanceTest.test_date.desc()).all()
        
        if not tests:
            return jsonify({
                'success': True,
                'summary': {
                    'total_tests': 0,
                    'latest_test_date': None,
                    'performance_by_category': {},
                    'personal_bests': {}
                }
            })
        
        # Calculate performance by category
        categories = {
            'strength': ['bench_press_1rm', 'squat_1rm', 'deadlift_1rm', 'pull_ups_max', 'push_ups_1min'],
            'speed': ['sprint_10m', 'sprint_20m', 'sprint_40m'],
            'agility': ['agility_t_test', 'agility_505', 'illinois_agility'],
            'power': ['vertical_jump', 'broad_jump', 'single_leg_jump_left', 'single_leg_jump_right'],
            'endurance': ['yo_yo_test', 'bronco_test', 'sit_ups_2min'],
            'flexibility': ['sit_and_reach', 'dorsiflexion_left', 'dorsiflexion_right']
        }
        
        performance_by_category = {}
        personal_bests = {}
        
        for category, metrics in categories.items():
            category_tests = []
            for metric in metrics:
                # Get all non-null values for this metric
                values = [getattr(test, metric) for test in tests if getattr(test, metric) is not None]
                if values:
                    # Determine if higher is better (True) or lower is better (False)
                    # Fix: Don't use any() on a boolean, just use the boolean expression
                    higher_is_better = not ('sprint' in metric or 'agility' in metric or metric == 'bronco_test')
                    
                    if higher_is_better:
                        best_value = max(values)
                    else:
                        best_value = min(values)
                    
                    # Find the test with the best value
                    best_test = next(test for test in tests if getattr(test, metric) == best_value)
                    
                    personal_bests[metric] = {
                        'value': best_value,
                        'date': best_test.test_date.isoformat(),
                        'test_type': best_test.test_type,
                        'higher_is_better': higher_is_better
                    }
                    
                    # Calculate trend
                    if len(values) > 1:
                        first_value = values[0]
                        latest_value = values[-1]
                        if higher_is_better:
                            trend = 'improving' if latest_value > first_value else 'declining' if latest_value < first_value else 'stable'
                        else:
                            trend = 'improving' if latest_value < first_value else 'declining' if latest_value > first_value else 'stable'
                    else:
                        trend = 'stable'
                    
                    category_tests.append({
                        'metric': metric,
                        'best_value': best_value,
                        'latest_value': values[-1] if values else None,
                        'unit': get_unit_for_metric(metric),
                        'trend': trend
                    })
            
            if category_tests:
                # Calculate overall trend for category
                improving_count = sum(1 for m in category_tests if m['trend'] == 'improving')
                declining_count = sum(1 for m in category_tests if m['trend'] == 'declining')
                
                if improving_count > declining_count:
                    overall_trend = 'improving'
                elif declining_count > improving_count:
                    overall_trend = 'declining'
                else:
                    overall_trend = 'stable'
                
                performance_by_category[category] = {
                    'test_count': len(category_tests),
                    'metrics': category_tests,
                    'overall_trend': overall_trend
                }
        
        return jsonify({
            'success': True,
            'summary': {
                'total_tests': len(tests),
                'latest_test_date': tests[0].test_date.isoformat() if tests else None,
                'performance_by_category': performance_by_category,
                'personal_bests': personal_bests
            }
        })
        
    except Exception as e:
        print(f"Error in get_athlete_performance_summary: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'success': False, 'message': str(e)}), 500


def get_unit_for_metric(metric):
    """Helper function to get unit for a metric"""
    units = {
        'height': 'cm', 'weight': 'kg', 'body_fat_percentage': '%',
        'bench_press_1rm': 'kg', 'squat_1rm': 'kg', 'deadlift_1rm': 'kg',
        'pull_ups_max': 'reps', 'push_ups_1min': 'reps', 'sit_ups_2min': 'reps',
        'sprint_10m': 's', 'sprint_20m': 's', 'sprint_40m': 's',
        'agility_t_test': 's', 'agility_505': 's', 'illinois_agility': 's',
        'vertical_jump': 'cm', 'broad_jump': 'cm',
        'single_leg_jump_left': 'cm', 'single_leg_jump_right': 'cm',
        'yo_yo_test': 'm', 'bronco_test': 's',
        'sit_and_reach': 'cm', 'dorsiflexion_left': 'cm', 'dorsiflexion_right': 'cm'
    }
    return units.get(metric, '')