# seed_backdated_data.py
# Generate 30 days of backdated wellness data for all athletes (March 10 - April 8, 2026)

from app import create_app, db
from app.models import User, Athlete, WellnessEntry, InjuryRecord, WorkloadSession, RecoverySession
from app.services.bootstrap import ensure_super_admin
import uuid
from datetime import date, timedelta
import random
import json

def seed_super_admin():
    """Ensure the super admin account exists."""
    app = create_app()
    with app.app_context():
        user, created = ensure_super_admin()
        if created:
            print(f"✅ Super admin created: {user.username}")
        else:
            print(f"ℹ️  Super admin already exists: {user.username}")


def seed_backdated_data():
    app = create_app()
    
    with app.app_context():
        ensure_super_admin()
        print("=" * 70)
        print("📅 GENERATING 30 DAYS OF BACKDATED WELLNESS DATA")
        print("=" * 70)
        
        # Target date range
        end_date = date(2026, 4, 8)
        start_date = end_date - timedelta(days=29)  # 30 days total including end_date
        
        print(f"📆 Date Range: {start_date} to {end_date}")
        print(f"📊 Total Days: {(end_date - start_date).days + 1} days")
        
        # Get all athletes
        athletes = Athlete.query.all()
        print(f"\n👥 Found {len(athletes)} athletes to process")
        
        # Find James Wilson (the athlete with concussion from seed_data.py)
        james_wilson = None
        for athlete in athletes:
            if athlete.user and athlete.user.name == 'James' and athlete.user.surname == 'Wilson':
                james_wilson = athlete
                print(f"🔍 Found James Wilson - will create concussion-affected wellness data")
                break
        
        # Track counts
        wellness_created = 0
        wellness_skipped = 0
        workload_created = 0
        recovery_created = 0
        
        # ================================================================
        # Define realistic data patterns for each position
        # ================================================================
        
        position_wellness_profiles = {
            'Point Guard': {
                'baseline_readiness': 7.5,
                'variability': 0.15,
                'injury_prone_days': [12, 25],  # Days into the period when they might have minor issues
                'recovery_priority': ['stretching', 'hydration']
            },
            'Shooting Guard': {
                'baseline_readiness': 7.8,
                'variability': 0.12,
                'injury_prone_days': [8, 20],
                'recovery_priority': ['ice_bath', 'massage']
            },
            'Small Forward': {
                'baseline_readiness': 7.3,
                'variability': 0.18,
                'injury_prone_days': [5, 15, 28],
                'recovery_priority': ['compression', 'stretching']
            },
            'Power Forward': {
                'baseline_readiness': 7.0,
                'variability': 0.20,
                'injury_prone_days': [7, 18, 30],
                'recovery_priority': ['joint_recovery', 'ice_bath']
            },
            'Center': {
                'baseline_readiness': 6.8,
                'variability': 0.22,
                'injury_prone_days': [4, 14, 22, 29],
                'recovery_priority': ['massage', 'compression', 'ice_bath']
            }
        }
        
        # Create date list
        date_list = []
        current_date = start_date
        while current_date <= end_date:
            date_list.append(current_date)
            current_date += timedelta(days=1)
        
        print(f"\n📅 Processing {len(date_list)} dates...")
        print("-" * 70)
        
        # ================================================================
        # Generate data for each athlete
        # ================================================================
        
        for athlete_idx, athlete in enumerate(athletes):
            print(f"\n🏃 [{athlete_idx + 1}/{len(athletes)}] {athlete.user.name} {athlete.user.surname} (#{athlete.jersey_number}) - {athlete.position}")
            
            # Get position profile
            profile = position_wellness_profiles.get(athlete.position, position_wellness_profiles['Point Guard'])
            
            # Generate a random performance trend for this athlete
            trend_type = random.choice(['improving', 'stable', 'declining', 'volatile'])
            trend_factor = 1.0
            
            # Track consecutive low readiness days for flag simulation
            consecutive_low_days = 0
            
            for date_idx, entry_date in enumerate(date_list):
                # Calculate day of week (0=Monday, 6=Sunday)
                day_of_week = entry_date.weekday()
                is_weekend = day_of_week >= 5
                is_game_day = day_of_week in [2, 5]  # Wednesdays and Saturdays are game days
                is_practice_day = day_of_week in [0, 1, 3, 4] and not is_game_day and not is_weekend
                
                # Check if wellness entry already exists
                existing_wellness = WellnessEntry.query.filter_by(
                    athlete_id=athlete.id,
                    date=entry_date
                ).first()
                
                if existing_wellness:
                    wellness_skipped += 1
                    continue
                
                # ============================================================
                # Determine if athlete is James Wilson (concussion case)
                # ============================================================
                is_james = (james_wilson and athlete.id == james_wilson.id)
                
                # ============================================================
                # WELLNESS DATA GENERATION
                # ============================================================
                
                if is_james:
                    # James Wilson's concussion recovery pattern
                    # Concussion occurred on March 20, 2026 (mid-period)
                    concussion_date = date(2026, 3, 20)
                    days_since_concussion = (entry_date - concussion_date).days
                    
                    if days_since_concussion < 0:
                        # Before concussion - normal athlete
                        sleep_hours = round(random.uniform(7.0, 8.5), 1)
                        sleep_quality = random.randint(3, 5)
                        stress_level = random.randint(1, 3)
                        muscle_soreness = random.randint(1, 3)
                        nutrition_quality = random.randint(3, 5)
                        mood = random.randint(3, 5)
                        energy_level = random.randint(3, 5)
                        motivation_level = random.randint(3, 5)
                        notes = "Regular training. Feeling good."
                        
                    elif days_since_concussion < 3:
                        # Acute phase - very poor wellness
                        recovery_factor = 1 - (days_since_concussion / 10)
                        sleep_hours = round(random.uniform(4.0, 5.5), 1)
                        sleep_quality = 1
                        stress_level = random.randint(4, 5)
                        muscle_soreness = random.randint(4, 5)
                        nutrition_quality = random.randint(1, 2)
                        mood = random.randint(1, 2)
                        energy_level = random.randint(1, 2)
                        motivation_level = random.randint(1, 2)
                        notes = "Concussion symptoms: headache, dizziness, light sensitivity. Complete rest."
                        
                    elif days_since_concussion < 7:
                        # Recovery phase - gradually improving
                        recovery_factor = 0.3 + (days_since_concussion - 3) * 0.15
                        sleep_hours = round(random.uniform(5.5, 7.0), 1)
                        sleep_quality = random.randint(2, 3)
                        stress_level = random.randint(3, 4)
                        muscle_soreness = random.randint(3, 4)
                        nutrition_quality = random.randint(2, 3)
                        mood = random.randint(2, 3)
                        energy_level = random.randint(2, 3)
                        motivation_level = random.randint(2, 3)
                        notes = "Still recovering from concussion. Some symptoms remain. Light activity only."
                        
                    elif days_since_concussion < 14:
                        # Late recovery - nearly normal
                        recovery_factor = 0.7 + (days_since_concussion - 7) * 0.05
                        sleep_hours = round(random.uniform(6.5, 8.0), 1)
                        sleep_quality = random.randint(3, 4)
                        stress_level = random.randint(2, 3)
                        muscle_soreness = random.randint(2, 3)
                        nutrition_quality = random.randint(3, 4)
                        mood = random.randint(3, 4)
                        energy_level = random.randint(3, 4)
                        motivation_level = random.randint(3, 4)
                        notes = "Returning to normal. Gradual return to play protocol."
                        
                    else:
                        # Fully recovered
                        sleep_hours = round(random.uniform(7.0, 8.5), 1)
                        sleep_quality = random.randint(4, 5)
                        stress_level = random.randint(1, 2)
                        muscle_soreness = random.randint(1, 2)
                        nutrition_quality = random.randint(4, 5)
                        mood = random.randint(4, 5)
                        energy_level = random.randint(4, 5)
                        motivation_level = random.randint(4, 5)
                        notes = "Fully recovered from concussion. Back to full training."
                
                else:
                    # Normal athlete - generate realistic wellness based on day type and trend
                    
                    # Apply trend factor (simulates improving/declining form)
                    if trend_type == 'improving':
                        trend_factor = 0.8 + (date_idx / len(date_list)) * 0.4
                    elif trend_type == 'declining':
                        trend_factor = 1.2 - (date_idx / len(date_list)) * 0.4
                    elif trend_type == 'volatile':
                        trend_factor = 0.9 + random.random() * 0.6
                    else:  # stable
                        trend_factor = 1.0
                    
                    # Base values by day type
                    if is_game_day:
                        # Game day - usually well-rested, some pre-game nerves
                        sleep_hours = round(random.uniform(7.5, 9.0), 1)
                        sleep_quality = random.randint(4, 5)
                        stress_level = random.randint(2, 4)  # Some nerves
                        muscle_soreness = random.randint(1, 3)
                        nutrition_quality = random.randint(4, 5)
                        mood = random.randint(4, 5)
                        energy_level = random.randint(4, 5)
                        motivation_level = 5  # Max motivation for game day
                        notes = "Game day! Feeling ready to compete."
                        
                    elif is_practice_day:
                        # Practice day - normal variation
                        sleep_hours = round(random.uniform(6.5, 8.5), 1)
                        sleep_quality = random.randint(3, 5)
                        stress_level = random.randint(1, 3)
                        muscle_soreness = random.randint(2, 4)  # Sore from previous training
                        nutrition_quality = random.randint(3, 5)
                        mood = random.randint(3, 5)
                        energy_level = random.randint(3, 5)
                        motivation_level = random.randint(3, 5)
                        notes = "Good practice session." if random.random() > 0.5 else "Tough practice, feeling tired."
                        
                    else:  # Weekend/rest day
                        sleep_hours = round(random.uniform(8.0, 10.0), 1)  # Sleep in
                        sleep_quality = random.randint(4, 5)
                        stress_level = random.randint(1, 2)
                        muscle_soreness = random.randint(1, 2)
                        nutrition_quality = random.randint(3, 5)
                        mood = random.randint(4, 5)
                        energy_level = random.randint(4, 5)
                        motivation_level = random.randint(3, 5)
                        notes = "Rest day. Recovering well." if random.random() > 0.3 else "Active recovery today."
                    
                    # Apply trend factor to adjust values
                    if trend_type != 'stable':
                        # Adjust readiness-related values
                        if trend_type == 'improving':
                            if date_idx > len(date_list) * 0.7:
                                # Later in period - better scores
                                sleep_quality = min(5, sleep_quality + 1)
                                mood = min(5, mood + 1)
                                energy_level = min(5, energy_level + 1)
                                muscle_soreness = max(1, muscle_soreness - 1)
                        elif trend_type == 'declining':
                            if date_idx > len(date_list) * 0.5:
                                # Later in period - worse scores
                                sleep_quality = max(1, sleep_quality - 1)
                                mood = max(1, mood - 1)
                                energy_level = max(1, energy_level - 1)
                                muscle_soreness = min(5, muscle_soreness + 1)
                    
                    # Check if this day is an injury-prone day for this position
                    day_number = date_idx + 1
                    if day_number in profile['injury_prone_days'] and random.random() < 0.4:
                        # Simulate minor injury/issue
                        muscle_soreness = min(5, muscle_soreness + 2)
                        stress_level = min(5, stress_level + 1)
                        mood = max(1, mood - 1)
                        notes = f"Feeling some {athlete.position.lower()} strain. Taking it easy today."
                    
                    # Check for consecutive low readiness
                    current_readiness_raw = (sleep_quality + (6 - stress_level) + (6 - muscle_soreness) + 
                                            nutrition_quality + mood + energy_level + motivation_level) / 7
                    
                    if current_readiness_raw < 3.5:
                        consecutive_low_days += 1
                        if consecutive_low_days >= 3:
                            notes += " Need to monitor - multiple days of low readiness."
                    else:
                        consecutive_low_days = 0
                
                # Create wellness entry
                wellness_entry = WellnessEntry(
                    id=str(uuid.uuid4()),
                    athlete_id=athlete.id,
                    date=entry_date,
                    sleep_hours=sleep_hours,
                    sleep_quality=sleep_quality,
                    stress_level=stress_level,
                    muscle_soreness=muscle_soreness,
                    nutrition_quality=nutrition_quality,
                    mood=mood,
                    energy_level=energy_level,
                    motivation_level=motivation_level,
                    previous_session_rpe=random.randint(4, 8) if is_practice_day and random.random() > 0.3 else None,
                    previous_session_duration=random.randint(45, 90) if is_practice_day and random.random() > 0.3 else None,
                    notes=notes
                )
                
                # Calculate readiness score
                wellness_entry.readiness_score = wellness_entry.calculate_readiness_score()
                db.session.add(wellness_entry)
                wellness_created += 1
            
            # Print summary for this athlete
            print(f"  ✅ Created {len(date_list)} wellness entries")
            print(f"     Trend: {trend_type} | Avg Readiness: ~{profile['baseline_readiness']:.1f}/10")
        
        # ================================================================
        # Create Workload Sessions (training/match data)
        # ================================================================
        
        print("\n" + "=" * 70)
        print("💪 CREATING WORKLOAD SESSIONS")
        print("=" * 70)
        
        for athlete_idx, athlete in enumerate(athletes):
            print(f"\n🏃 Processing workload for: {athlete.user.name} {athlete.user.surname}")
            
            is_james = (james_wilson and athlete.id == james_wilson.id)
            sessions_created = 0
            
            for entry_date in date_list:
                day_of_week = entry_date.weekday()
                is_weekend = day_of_week >= 5
                is_game_day = day_of_week in [2, 5]  # Wednesdays and Saturdays
                is_practice_day = day_of_week in [0, 1, 3, 4] and not is_game_day and not is_weekend
                
                # Check if workload already exists
                existing_workload = WorkloadSession.query.filter_by(
                    athlete_id=athlete.id,
                    date=entry_date
                ).first()
                
                if existing_workload:
                    continue
                
                # Skip if James Wilson is in acute concussion phase
                if is_james:
                    concussion_date = date(2026, 3, 20)
                    days_since_concussion = (entry_date - concussion_date).days
                    if 0 <= days_since_concussion < 7:
                        continue  # No training during acute concussion
                
                # Create workload session only for training/practice/game days
                if is_game_day:
                    session_type = 'match'
                    session_name = 'Competition Game'
                    duration_minutes = random.randint(32, 40)  # Basketball game length
                    perceived_exertion = random.randint(7, 9)
                    distance_km = round(random.uniform(3.5, 5.5), 1)
                    notes = "Full game. Good effort from the team."
                    
                elif is_practice_day:
                    session_type = 'training'
                    session_name = random.choice(['Team Practice', 'Shooting Practice', 'Conditioning', 'Tactical Session', 'Strength Training'])
                    duration_minutes = random.randint(60, 120)
                    perceived_exertion = random.randint(5, 8)
                    distance_km = round(random.uniform(2.0, 4.0), 1)
                    notes = random.choice([
                        "Focused on defensive drills today.",
                        "High intensity conditioning session.",
                        "Light practice, focusing on recovery.",
                        "Good energy at practice.",
                        "Worked on set plays and transitions."
                    ])
                else:
                    # Weekend - light or no training
                    if random.random() < 0.3:  # 30% chance of light workout on weekend
                        session_type = 'training'
                        session_name = 'Active Recovery'
                        duration_minutes = random.randint(30, 60)
                        perceived_exertion = random.randint(3, 5)
                        distance_km = round(random.uniform(1.0, 2.5), 1)
                        notes = "Light recovery session."
                    else:
                        continue  # No session
                
                # Calculate workload score
                workload_score = perceived_exertion * duration_minutes
                
                workload_session = WorkloadSession(
                    id=str(uuid.uuid4()),
                    athlete_id=athlete.id,
                    date=entry_date,
                    session_type=session_type,
                    session_name=session_name,
                    duration_minutes=duration_minutes,
                    perceived_exertion=perceived_exertion,
                    workload_score=workload_score,
                    distance_km=distance_km,
                    average_hr=round(random.uniform(120, 160), 1) if session_type == 'match' else round(random.uniform(110, 145), 1),
                    max_hr=round(random.uniform(170, 195), 1) if session_type == 'match' else round(random.uniform(155, 185), 1),
                    sprints_count=random.randint(10, 35) if session_type == 'match' else random.randint(5, 20),
                    high_intensity_distance=round(random.uniform(0.5, 1.5), 1) if session_type == 'match' else round(random.uniform(0.3, 1.0), 1),
                    fatigue_level=random.randint(3, 5),
                    muscle_soreness_post=random.randint(2, 4),
                    motivation_post=random.randint(3, 5),
                    notes=notes
                )
                
                db.session.add(workload_session)
                sessions_created += 1
                workload_created += 1
            
            print(f"  ✅ Created {sessions_created} workload sessions")
        
        # ================================================================
        # Create Recovery Sessions
        # ================================================================
        
        print("\n" + "=" * 70)
        print("🧘 CREATING RECOVERY SESSIONS")
        print("=" * 70)
        
        prehab_exercises_library = {
            'injury_prevention': [
                {"name": "Nordic Hamstring Curls", "sets": 3, "reps": 8, "notes": "Control eccentric phase"},
                {"name": "Copenhagen Adduction", "sets": 3, "reps": 10, "notes": "Hold for 2 seconds"},
                {"name": "Single Leg Romanian Deadlift", "sets": 3, "reps": 10, "notes": "Use light weight"},
                {"name": "Glute Bridges", "sets": 3, "reps": 15, "notes": "Squeeze at top"}
            ],
            'performance': [
                {"name": "Box Jumps", "sets": 4, "reps": 6, "notes": "Focus on explosive power"},
                {"name": "Medicine Ball Throws", "sets": 3, "reps": 8, "notes": "Use 4-6kg ball"},
                {"name": "Agility Ladder Drills", "sets": 5, "reps": 1, "notes": "Various patterns"},
                {"name": "Plyometric Push-ups", "sets": 3, "reps": 8, "notes": "Explosive movement"}
            ],
            'recovery': [
                {"name": "Foam Rolling", "sets": 1, "reps": 1, "notes": "Full body, 10 minutes"},
                {"name": "Static Stretching", "sets": 1, "reps": 1, "notes": "Hold each stretch 30 seconds"},
                {"name": "Ice Bath", "sets": 1, "reps": 1, "notes": "10-15 minutes at 10-15°C"},
                {"name": "Compression Therapy", "sets": 1, "reps": 1, "notes": "20 minutes"}
            ]
        }
        
        for athlete_idx, athlete in enumerate(athletes):
            print(f"\n🏃 Processing recovery for: {athlete.user.name} {athlete.user.surname}")
            
            is_james = (james_wilson and athlete.id == james_wilson.id)
            recovery_created_count = 0
            
            for entry_date in date_list:
                day_of_week = entry_date.weekday()
                is_game_day = day_of_week in [2, 5]
                is_practice_day = day_of_week in [0, 1, 3, 4] and not is_game_day
                
                # Check if recovery already exists
                existing_recovery = RecoverySession.query.filter_by(
                    athlete_id=athlete.id,
                    date=entry_date
                ).first()
                
                if existing_recovery:
                    continue
                
                # Create recovery session after games or hard practices
                should_create = False
                recovery_type = None
                
                if is_game_day:
                    # Always create recovery after games
                    should_create = True
                    recovery_type = 'passive'
                    session_name = 'Post-Game Recovery'
                    duration_minutes = random.randint(20, 45)
                    
                elif is_practice_day and random.random() < 0.4:
                    # 40% chance of recovery after practice
                    should_create = True
                    recovery_type = random.choice(['active', 'passive', 'prehab'])
                    if recovery_type == 'active':
                        session_name = 'Active Recovery Session'
                        duration_minutes = random.randint(30, 60)
                    elif recovery_type == 'passive':
                        session_name = 'Passive Recovery'
                        duration_minutes = random.randint(15, 30)
                    else:
                        session_name = 'Prehab Session'
                        duration_minutes = random.randint(20, 40)
                
                elif not is_game_day and not is_practice_day and random.random() < 0.3:
                    # Weekend recovery
                    should_create = True
                    recovery_type = 'active'
                    session_name = 'Weekend Recovery'
                    duration_minutes = random.randint(30, 90)
                
                if should_create:
                    # Select prehab exercises if it's a prehab session
                    prehab_exercises = []
                    if recovery_type == 'prehab':
                        focus = random.choice(['injury_prevention', 'performance', 'recovery'])
                        exercises = prehab_exercises_library[focus]
                        prehab_exercises = random.sample(exercises, min(3, len(exercises)))
                    
                    recovery_session = RecoverySession(
                        id=str(uuid.uuid4()),
                        athlete_id=athlete.id,
                        date=entry_date,
                        recovery_type=recovery_type,
                        session_name=session_name,
                        duration_minutes=duration_minutes,
                        stretching=random.choice([True, False]) if recovery_type != 'passive' else False,
                        foam_rolling=random.choice([True, False]),
                        massage=random.choice([True, False]),
                        ice_bath=is_game_day or random.random() < 0.3,
                        compression=random.choice([True, False]),
                        sleep_quality=random.randint(3, 5),
                        nutrition_quality=random.randint(3, 5),
                        hydration_status=random.randint(3, 5),
                        prehab_exercises=json.dumps(prehab_exercises) if prehab_exercises else None,
                        perceived_recovery=random.randint(6, 9),
                        readiness_improvement=random.randint(1, 3),
                        notes=f"Recovery session focused on {recovery_type} recovery."
                    )
                    
                    db.session.add(recovery_session)
                    recovery_created_count += 1
                    recovery_created += 1
            
            print(f"  ✅ Created {recovery_created_count} recovery sessions")
        
        # ================================================================
        # COMMIT ALL CHANGES
        # ================================================================
        
        db.session.commit()
        
        # ================================================================
        # SUMMARY
        # ================================================================
        
        print("\n" + "=" * 70)
        print("🎉 BACKDATED DATA GENERATION COMPLETE!")
        print("=" * 70)
        
        print("\n📊 Generation Summary:")
        print(f"  • Wellness Entries Created: {wellness_created}")
        print(f"  • Wellness Entries Skipped (already existed): {wellness_skipped}")
        print(f"  • Workload Sessions Created: {workload_created}")
        print(f"  • Recovery Sessions Created: {recovery_created}")
        
        print("\n📅 Date Range Summary:")
        print(f"  • Start Date: {start_date}")
        print(f"  • End Date: {end_date}")
        print(f"  • Total Days: {(end_date - start_date).days + 1}")
        
        print("\n👥 Athletes Processed:")
        for athlete in athletes:
            wellness_count = WellnessEntry.query.filter(
                WellnessEntry.athlete_id == athlete.id,
                WellnessEntry.date >= start_date,
                WellnessEntry.date <= end_date
            ).count()
            workload_count = WorkloadSession.query.filter(
                WorkloadSession.athlete_id == athlete.id,
                WorkloadSession.date >= start_date,
                WorkloadSession.date <= end_date
            ).count()
            recovery_count = RecoverySession.query.filter(
                RecoverySession.athlete_id == athlete.id,
                RecoverySession.date >= start_date,
                RecoverySession.date <= end_date
            ).count()
            
            status = "⚠️ CONCUSSION" if (james_wilson and athlete.id == james_wilson.id) else "✓"
            print(f"  {status} {athlete.user.name} {athlete.user.surname}: {wellness_count} wellness, {workload_count} workload, {recovery_count} recovery")
        
        print("\n💡 Data Features:")
        print("  ✓ Daily wellness entries for 30 days")
        print("  ✓ Workload sessions (training & matches)")
        print("  ✓ Recovery sessions with prehab exercises")
        print("  ✓ Realistic patterns by position and day type")
        print("  ✓ Concussion recovery timeline for James Wilson")
        print("  ✓ Game day vs practice day variations")
        print("  ✓ Injury-prone day simulations")
        print("  ✓ Performance trends (improving/declining/stable/volatile)")
        
        print("\n🚀 Ready for testing and analysis!")

if __name__ == '__main__':
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == '--admin-only':
        seed_super_admin()
    else:
        seed_backdated_data()