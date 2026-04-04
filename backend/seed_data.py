#Wellness data for athletes last updated 12/01/2026
from app import create_app, db
from app.models import User, Team, Athlete, Coach, WellnessEntry, PerformanceTest, InjuryRecord
import uuid
from datetime import date, timedelta, datetime
import random

def seed_database():
    app = create_app()
    
    with app.app_context():
        print("🚀 Starting database seeding...")
        
        def ensure_admin_account(username, email, password, name, surname):
            admin_user = User.query.filter_by(username=username).first()
            if admin_user:
                print(f"ℹ️  Admin user already exists: {username}")
                return admin_user
            user_id = str(uuid.uuid4())
            admin_user = User(
                id=user_id,
                username=username,
                name=name,
                surname=surname,
                role='admin',
                email=email
            )
            admin_user.set_password(password)
            db.session.add(admin_user)
            print(f"✅ Admin user created: {username} / {password}")
            return admin_user

        # Check if data already exists to avoid duplicates
        existing_users = User.query.count()
        if existing_users > 0:
            print("⚠️  Database already has data. Ensuring admin accounts exist...")
            ensure_admin_account('admin', 'admin@athens.sports', 'admin123', 'System', 'Administrator')
            ensure_admin_account('admin2', 'admin2@athens.sports', 'admin123', 'System', 'Administrator 2')
            db.session.commit()
            print("✅ Admin seeding complete")
            print("📅 Existing data will remain unchanged.")
            return
        else:
            # Clear existing data (in reverse order due to foreign key constraints)
            print("🗑️  Clearing existing data...")
            WellnessEntry.query.delete()
            PerformanceTest.query.delete()
            Coach.query.delete()
            Athlete.query.delete()
            Team.query.delete()
            User.query.delete()
            
            db.session.commit()
            print("✅ Database cleared successfully")
            
            print("\n👑 Creating admin users...")
            ensure_admin_account('admin', 'admin@athens.sports', 'admin123', 'System', 'Administrator')
            ensure_admin_account('admin2', 'admin2@athens.sports', 'admin123', 'System', 'Administrator 2')
            
            # Create coach user
            print("\n👨‍🏫 Creating coach user...")
            coach_id = str(uuid.uuid4())
            coach_user = User(
                id=coach_id,
                username='coach',
                name='John',
                surname='Smith',
                role='coach',
                email='coach@athens.sports'
            )
            coach_user.set_password('password123')
            db.session.add(coach_user)
            print("✅ Coach user created: coach / password123")
            
            # Create coach profile
            coach_profile = Coach(
                id=str(uuid.uuid4()),
                user_id=coach_id,
                qualification='Level 3 Coach',
                years_experience=8,
                specialization='Strength & Conditioning',
                contact_number='+1234567890'
            )
            db.session.add(coach_profile)
            
            # Create team for coach
            print("\n🏆 Creating team...")
            team_id = f"TEAM-{uuid.uuid4().hex[:8].upper()}"
            team = Team(
                id=team_id,
                name='Varsity Basketball 2025',
                coach_id=coach_id,
                sport='Basketball',
                season='2025 Spring Season'
            )
            db.session.add(team)
            print(f"✅ Team created: Varsity Basketball 2025")
            
            # Create athlete users and profiles
            print("\n👥 Creating athletes...")
            athlete_data = [
                {
                    'name': 'Michael',
                    'surname': 'Johnson',
                    'jersey': 23,
                    'age': 18,
                    'height': 193.5,
                    'weight': 88.2,
                    'position': 'Point Guard',
                    'side': 'Right'
                },
                {
                    'name': 'Sarah',
                    'surname': 'Williams',
                    'jersey': 10,
                    'age': 17,
                    'height': 180.3,
                    'weight': 72.5,
                    'position': 'Shooting Guard',
                    'side': 'Left'
                },
                {
                    'name': 'David',
                    'surname': 'Chen',
                    'jersey': 32,
                    'age': 19,
                    'height': 201.0,
                    'weight': 95.8,
                    'position': 'Center',
                    'side': 'Right'
                },
                {
                    'name': 'Emma',
                    'surname': 'Garcia',
                    'jersey': 7,
                    'age': 18,
                    'height': 185.6,
                    'weight': 79.3,
                    'position': 'Power Forward',
                    'side': 'Ambidextrous'
                },
                {
                    'name': 'James',
                    'surname': 'Wilson',
                    'jersey': 15,
                    'age': 17,
                    'height': 190.2,
                    'weight': 86.7,
                    'position': 'Small Forward',
                    'side': 'Right'
                },
                {
                    'name': 'Olivia',
                    'surname': 'Martinez',
                    'jersey': 3,
                    'age': 18,
                    'height': 178.9,
                    'weight': 68.4,
                    'position': 'Shooting Guard',
                    'side': 'Right'
                },
                {
                    'name': 'Ethan',
                    'surname': 'Brown',
                    'jersey': 21,
                    'age': 19,
                    'height': 195.5,
                    'weight': 92.1,
                    'position': 'Power Forward',
                    'side': 'Left'
                },
                {
                    'name': 'Sophia',
                    'surname': 'Taylor',
                    'jersey': 5,
                    'age': 17,
                    'height': 183.2,
                    'weight': 74.8,
                    'position': 'Point Guard',
                    'side': 'Ambidextrous'
                },
                {
                    'name': 'Liam',
                    'surname': 'Anderson',
                    'jersey': 42,
                    'age': 18,
                    'height': 198.7,
                    'weight': 89.5,
                    'position': 'Center',
                    'side': 'Right'
                },
                {
                    'name': 'Ava',
                    'surname': 'Thomas',
                    'jersey': 12,
                    'age': 17,
                    'height': 176.8,
                    'weight': 66.3,
                    'position': 'Small Forward',
                    'side': 'Left'
                }
            ]
            
            athletes_created = []
            
            for i, data in enumerate(athlete_data):
                # Create user
                athlete_user_id = str(uuid.uuid4())
                username = f"{data['name'].lower()}.{data['surname'].lower()}"
                
                # Ensure unique username
                counter = 1
                original_username = username
                while User.query.filter_by(username=username).first():
                    username = f"{original_username}{counter}"
                    counter += 1
                
                athlete_user = User(
                    id=athlete_user_id,
                    username=username,
                    name=data['name'],
                    surname=data['surname'],
                    role='athlete',
                    email=f"{username}@athens.sports"
                )
                athlete_user.set_password('password123')
                db.session.add(athlete_user)
                
                # Create athlete profile
                athlete = Athlete(
                    id=f"ATH-{uuid.uuid4().hex[:8].upper()}",
                    user_id=athlete_user_id,
                    team_id=team_id,
                    jersey_number=data['jersey'],
                    age=data['age'],
                    height=data['height'],
                    weight=data['weight'],
                    position=data['position'],
                    dominant_side=data['side'],
                    bio_notes=f"Top performer in {data['position']} position. Shows great potential."
                )
                db.session.add(athlete)
                athletes_created.append(athlete)
                
                print(f"  ✓ {data['name']} {data['surname']} (#{data['jersey']}) - {username} / password123")
            
            db.session.commit()
            print(f"✅ {len(athletes_created)} athletes created successfully")
            
            # Create wellness entries for athletes (last 7 days, excluding today)
            print("\n💪 Creating wellness entries (last 7 days)...")
            wellness_entries_count = 0
            
            for athlete in athletes_created:
                for i in range(1, 7):  # Create entries for last 7 days (excluding today)
                    entry_date = date.today() - timedelta(days=i)
                    
                    # Check if entry already exists for this date
                    existing_entry = WellnessEntry.query.filter_by(
                        athlete_id=athlete.id,
                        date=entry_date
                    ).first()
                    
                    if existing_entry:
                        continue
                    
                    # Create realistic wellness data
                    sleep_hours = round(random.uniform(6.5, 9.0), 1)
                    sleep_quality = random.randint(3, 5)
                    stress_level = random.randint(1, 4)
                    muscle_soreness = random.randint(1, 4)
                    nutrition_quality = random.randint(3, 5)
                    mood = random.randint(3, 5)
                    energy_level = random.randint(3, 5)
                    motivation_level = random.randint(3, 5)
                    
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
                        previous_session_rpe=random.randint(4, 8) if i > 1 else None,
                        previous_session_duration=random.randint(45, 120) if i > 1 else None,
                        notes="Training well, feeling good." if i == 1 else "Regular training session." if i % 2 == 0 else None
                    )
                    
                    # Calculate readiness score
                    wellness_entry.readiness_score = wellness_entry.calculate_readiness_score()
                    db.session.add(wellness_entry)
                    wellness_entries_count += 1
            
            db.session.commit()
            print(f"✅ {wellness_entries_count} wellness entries created (last 7 days)")
            
            # Create performance tests for athletes
            print("\n📊 Creating performance tests...")
            test_types = ['strength', 'speed', 'agility', 'power', 'endurance', 'flexibility', 'comprehensive']
            performance_tests_count = 0
            
            # Test data templates by position
            position_benchmarks = {
                'Point Guard': {
                    'bench_press': (45, 85),
                    'squat': (70, 120),
                    'vertical_jump': (55, 75),
                    'sprint_40m': (5.2, 6.0)
                },
                'Shooting Guard': {
                    'bench_press': (50, 90),
                    'squat': (75, 130),
                    'vertical_jump': (60, 80),
                    'sprint_40m': (5.1, 5.9)
                },
                'Small Forward': {
                    'bench_press': (60, 100),
                    'squat': (90, 150),
                    'vertical_jump': (65, 85),
                    'sprint_40m': (5.0, 5.8)
                },
                'Power Forward': {
                    'bench_press': (70, 110),
                    'squat': (100, 160),
                    'vertical_jump': (70, 90),
                    'sprint_40m': (5.2, 6.0)
                },
                'Center': {
                    'bench_press': (80, 120),
                    'squat': (110, 170),
                    'vertical_jump': (75, 95),
                    'sprint_40m': (5.3, 6.1)
                }
            }
            
            for athlete in athletes_created:
                benchmarks = position_benchmarks.get(athlete.position, position_benchmarks['Point Guard'])
                
                for i in range(3):  # Create 3 tests per athlete at different times
                    test_date = date.today() - timedelta(days=i * 30)  # Spread out over 90 days
                    test_type = test_types[i % len(test_types)]
                    
                    # Check if test already exists for this date
                    existing_test = PerformanceTest.query.filter_by(
                        athlete_id=athlete.id,
                        test_date=test_date
                    ).first()
                    
                    if existing_test:
                        continue
                    
                    # Generate test data based on position and improvement over time
                    improvement_factor = 1.0 + (0.05 * i)  # 5% improvement per test
                    
                    performance_test = PerformanceTest(
                        id=str(uuid.uuid4()),
                        athlete_id=athlete.id,
                        test_date=test_date,
                        test_type=test_type,
                        
                        # Anthropometric measurements (for first test)
                        height=athlete.height if i == 0 else None,
                        weight=athlete.weight if i == 0 else None,
                        body_fat_percentage=round(random.uniform(8.0, 18.0), 1) if i == 0 else None,
                        
                        # Strength tests (if strength type or comprehensive)
                        bench_press_1rm=round(random.uniform(*benchmarks['bench_press']) * improvement_factor, 1) 
                        if test_type in ['strength', 'comprehensive'] else None,
                        
                        squat_1rm=round(random.uniform(*benchmarks['squat']) * improvement_factor, 1) 
                        if test_type in ['strength', 'comprehensive'] else None,
                        
                        deadlift_1rm=round(random.uniform(benchmarks['squat'][0] * 1.2, benchmarks['squat'][1] * 1.2) * improvement_factor, 1) 
                        if test_type in ['strength', 'comprehensive'] else None,
                        
                        pull_ups_max=random.randint(3, 20) 
                        if test_type in ['strength', 'comprehensive'] else None,
                        
                        push_ups_1min=random.randint(15, 45) 
                        if test_type in ['strength', 'comprehensive'] else None,
                        
                        sit_ups_2min=random.randint(30, 70) 
                        if test_type in ['strength', 'comprehensive'] else None,
                        
                        # Speed tests
                        sprint_10m=round(random.uniform(1.8, 2.3), 2) 
                        if test_type in ['speed', 'comprehensive'] else None,
                        
                        sprint_20m=round(random.uniform(3.1, 3.8), 2) 
                        if test_type in ['speed', 'comprehensive'] else None,
                        
                        sprint_40m=round(random.uniform(*benchmarks['sprint_40m']) * (1 - (0.02 * i)), 2) 
                        if test_type in ['speed', 'comprehensive'] else None,
                        
                        # Agility tests
                        agility_t_test=round(random.uniform(9.5, 11.5) * (1 - (0.01 * i)), 2) 
                        if test_type in ['agility', 'comprehensive'] else None,
                        
                        agility_505=round(random.uniform(2.2, 2.8), 2) 
                        if test_type in ['agility', 'comprehensive'] else None,
                        
                        illinois_agility=round(random.uniform(16.0, 19.0) * (1 - (0.01 * i)), 2) 
                        if test_type in ['agility', 'comprehensive'] else None,
                        
                        # Power tests
                        vertical_jump=round(random.uniform(*benchmarks['vertical_jump']) * improvement_factor, 1) 
                        if test_type in ['power', 'comprehensive'] else None,
                        
                        broad_jump=round(random.uniform(220, 320) * improvement_factor, 1) 
                        if test_type in ['power', 'comprehensive'] else None,
                        
                        single_leg_jump_left=round(random.uniform(140, 220) * improvement_factor, 1) 
                        if test_type in ['power', 'comprehensive'] else None,
                        
                        single_leg_jump_right=round(random.uniform(140, 220) * improvement_factor, 1) 
                        if test_type in ['power', 'comprehensive'] else None,
                        
                        # Endurance tests
                        yo_yo_test=random.randint(1000, 2400) 
                        if test_type in ['endurance', 'comprehensive'] else None,
                        
                        bronco_test=round(random.uniform(450, 550), 1) 
                        if test_type in ['endurance', 'comprehensive'] else None,
                        
                        # Flexibility tests
                        sit_and_reach=round(random.uniform(18.0, 32.0), 1) 
                        if test_type in ['flexibility', 'comprehensive'] else None,
                        
                        dorsiflexion_left=round(random.uniform(8.0, 15.0), 1) 
                        if test_type in ['flexibility', 'comprehensive'] else None,
                        
                        dorsiflexion_right=round(random.uniform(8.0, 15.0), 1) 
                        if test_type in ['flexibility', 'comprehensive'] else None,
                        
                        notes=f"{test_type.capitalize()} assessment completed on {test_date.strftime('%B %d, %Y')}. "
                              f"Showing {int((improvement_factor - 1) * 100)}% improvement from baseline."
                    )
                    
                    db.session.add(performance_test)
                    performance_tests_count += 1
            
            db.session.commit()
            print(f"✅ {performance_tests_count} performance tests created successfully")
        
        
        print("\n📅 Adding TODAY'S wellness checks for all athletes...")
        
        # Get today's date
        today = date.today()
        
        # Find James Wilson (the athlete with concussion)
        james_wilson = None
        for athlete in Athlete.query.all():
            if athlete.user and athlete.user.name == 'James' and athlete.user.surname == 'Wilson':
                james_wilson = athlete
                break
        
        # Create concussion for James Wilson if it doesn't exist
        if james_wilson:
            existing_concussion = InjuryRecord.query.filter_by(
                athlete_id=james_wilson.id,
                is_concussion=True
            ).first()
            
            if not existing_concussion:
                print("\n🩹 Creating concussion record for James Wilson...")
                concussion_date = date(2026, 12, 1)  # December 1, 2026
                
                concussion = InjuryRecord(
                    id=str(uuid.uuid4()),
                    athlete_id=james_wilson.id,
                    injury_type='Concussion',
                    body_part='Head',
                    side='Right',
                    severity='mild',
                    date_reported=today,
                    date_occurred=concussion_date,
                    mechanism='Head-to-ground contact during practice',
                    symptoms='Headache, dizziness, mild confusion',
                    diagnosis='Mild Traumatic Brain Injury (Concussion)',
                    treatment_plan='Complete rest, no screen time, gradual return-to-play protocol',
                    estimated_recovery_time=1,  # 1 day recovery (as per instructions)
                    status='active',
                    notes='Player hit head on floor during defensive drill. No loss of consciousness.',
                    
                    # Concussion-specific fields
                    is_concussion=True,
                    loss_of_consciousness=False,
                    loc_duration=None,
                    post_traumatic_amnesia=False,
                    pta_duration=None,
                    mechanism_of_concussion='head_to_ground',
                    suspected_concussion=False,
                    referred_to_physician=True,
                    physician_name='Dr. Sarah Johnson',
                    physician_contact='sarah.johnson@sportsmed.com',
                    
                    # RTP protocol fields
                    rtp_protocol_started=True,
                    rtp_start_date=concussion_date,
                    rtp_stage=2,  # Currently at Stage 2
                    rtp_stage_start_date=today - timedelta(days=1),
                    rtp_completed_date=None,
                    rtp_medical_clearance=False,
                    rtp_medical_clearance_date=None,
                    rtp_medical_clearance_by=None
                )
                
                db.session.add(concussion)
                print(f"✅ Concussion created for James Wilson (mild, head-to-ground, 1-day recovery)")
        
        # Add today's wellness checks for all athletes
        print("\n💪 Creating today's wellness checks...")
        todays_wellness_count = 0
        
        for athlete in Athlete.query.all():
            # Check if today's wellness entry already exists
            existing_today_entry = WellnessEntry.query.filter_by(
                athlete_id=athlete.id,
                date=today
            ).first()
            
            if existing_today_entry:
                print(f"  ⏭️  Today's wellness already exists for {athlete.user.name} {athlete.user.surname}")
                continue
            
            # Determine if this is James Wilson (with concussion)
            is_james_wilson = athlete.user and athlete.user.name == 'James' and athlete.user.surname == 'Wilson'
            
            # Generate wellness data
            if is_james_wilson:
                # James Wilson (with concussion) - poor wellness scores
                sleep_hours = round(random.uniform(4.5, 6.0), 1)  # Poor sleep
                sleep_quality = random.randint(1, 2)  # Very poor sleep quality
                stress_level = random.randint(4, 5)  # High stress
                muscle_soreness = random.randint(4, 5)  # High soreness
                nutrition_quality = random.randint(2, 3)  # Poor nutrition
                mood = random.randint(1, 2)  # Poor mood
                energy_level = random.randint(1, 2)  # Low energy
                motivation_level = random.randint(1, 2)  # Low motivation
                notes = "Recovering from concussion. Experiencing headaches and dizziness. Following rest protocol."
                previous_session_rpe = None  # No training due to concussion
                previous_session_duration = None
            else:
                # Normal athletes - good wellness scores
                sleep_hours = round(random.uniform(7.0, 9.0), 1)
                sleep_quality = random.randint(4, 5)
                stress_level = random.randint(1, 3)
                muscle_soreness = random.randint(1, 3)
                nutrition_quality = random.randint(4, 5)
                mood = random.randint(4, 5)
                energy_level = random.randint(4, 5)
                motivation_level = random.randint(4, 5)
                notes = "Feeling good, ready for practice."
                previous_session_rpe = random.randint(5, 7) if random.random() > 0.3 else None
                previous_session_duration = random.randint(60, 90) if previous_session_rpe else None
            
            # Create today's wellness entry
            wellness_entry = WellnessEntry(
                id=str(uuid.uuid4()),
                athlete_id=athlete.id,
                date=today,
                sleep_hours=sleep_hours,
                sleep_quality=sleep_quality,
                stress_level=stress_level,
                muscle_soreness=muscle_soreness,
                nutrition_quality=nutrition_quality,
                mood=mood,
                energy_level=energy_level,
                motivation_level=motivation_level,
                previous_session_rpe=previous_session_rpe,
                previous_session_duration=previous_session_duration,
                notes=notes
            )
            
            # Calculate readiness score
            wellness_entry.readiness_score = wellness_entry.calculate_readiness_score()
            db.session.add(wellness_entry)
            todays_wellness_count += 1
            
            # Show James Wilson's poor scores
            if is_james_wilson:
                print(f"  ⚠️  {athlete.user.name} {athlete.user.surname} (Concussion): Readiness Score {wellness_entry.readiness_score}/10")
            else:
                print(f"  ✓ {athlete.user.name} {athlete.user.surname}: Readiness Score {wellness_entry.readiness_score}/10")
        
        db.session.commit()
        print(f"\n✅ Added {todays_wellness_count} today's wellness checks")
        
        # ============================================================================
        # SUMMARY
        # ============================================================================
        print("\n" + "="*50)
        print("🎉 DATABASE SEEDING COMPLETE!")
        print("="*50)
        
        # Get counts for summary
        total_athletes = Athlete.query.count()
        total_teams = Team.query.count()
        total_wellness = WellnessEntry.query.count()
        today_wellness = WellnessEntry.query.filter_by(date=today).count()
        concussions = InjuryRecord.query.filter_by(is_concussion=True).count()
        
        print("\n📊 Current Database Status:")
        print(f"  • {User.query.filter_by(role='admin').count()} Admin user(s)")
        print(f"  • {User.query.filter_by(role='coach').count()} Coach user(s)")
        print(f"  • {total_teams} Team(s)")
        print(f"  • {total_athletes} Athlete user(s)")
        print(f"  • {total_wellness} Total wellness entries")
        print(f"  • {today_wellness} Today's wellness checks")
        print(f"  • {concussions} Concussion record(s)")
        
        print("\n🎮 Test Credentials:")
        print("  Admin:     admin / admin123")
        print("  Coach:     coach / password123")
        print("  Athletes:  firstname.lastname / password123")
        print("             (e.g., michael.johnson / password123)")
        
        print("\n⚠️  Special Note:")
        print("  • James Wilson has a mild concussion (logged Dec 1)")
        print("  • His wellness scores reflect concussion symptoms")
        print("  • He is currently at RTP Stage 2")
        
        print("\n🔗 Features Now Available:")
        print("  ✓ User authentication & roles")
        print("  ✓ Athlete & team management")
        print("  ✓ Daily wellness tracking (with today's data)")
        print("  ✓ Performance test recording")
        print("  ✓ Injury & concussion management")
        print("  ✓ Analytics & dashboards")
        
        print("\n🚀 Ready to use Athens Sports SAAS!")

if __name__ == '__main__':
    seed_database()