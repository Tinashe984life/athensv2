from app import db
from datetime import datetime, date
import bcrypt
import uuid

class User(db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.String(50), primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True)
    password_hash = db.Column(db.String(128), nullable=False)
    name = db.Column(db.String(100), nullable=False)
    surname = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False)  # 'admin', 'coach', 'athlete'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    team = db.relationship('Team', backref='coach', uselist=False, foreign_keys='Team.coach_id')
    athlete_profile = db.relationship('Athlete', backref='user', uselist=False)
    coach_profile = db.relationship('Coach', backref='user', uselist=False)
    
    def set_password(self, password):
        self.password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.password_hash.encode('utf-8'))
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'name': self.name,
            'surname': self.surname,
            'role': self.role,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class Team(db.Model):
    __tablename__ = 'teams'
    
    id = db.Column(db.String(50), primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    coach_id = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=False)
    sport = db.Column(db.String(50), nullable=True)
    season = db.Column(db.String(50), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    athletes = db.relationship('Athlete', backref='team', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'coach_id': self.coach_id,
            'sport': self.sport,
            'season': self.season,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'athlete_count': len(self.athletes)
        }

class Athlete(db.Model):
    __tablename__ = 'athletes'
    
    id = db.Column(db.String(50), primary_key=True)
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), unique=True, nullable=False)
    team_id = db.Column(db.String(50), db.ForeignKey('teams.id'), nullable=False)
    jersey_number = db.Column(db.Integer, nullable=True)
    age = db.Column(db.Integer, nullable=True)
    date_of_birth = db.Column(db.Date, nullable=True)
    height = db.Column(db.Float, nullable=True)  # in cm
    weight = db.Column(db.Float, nullable=True)  # in kg
    position = db.Column(db.String(50), nullable=True)
    dominant_side = db.Column(db.String(10), nullable=True)  # left, right, ambidextrous
    photo_url = db.Column(db.String(500), nullable=True)
    bio_notes = db.Column(db.Text, nullable=True)
    injury_history = db.Column(db.Text, nullable=True)
    medical_notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    wellness_entries = db.relationship('WellnessEntry', backref='athlete', lazy=True, order_by='desc(WellnessEntry.date)')
    performance_tests = db.relationship('PerformanceTest', backref='athlete', lazy=True, order_by='desc(PerformanceTest.test_date)')
    injuries = db.relationship('InjuryRecord', backref='athlete', lazy=True, order_by='desc(InjuryRecord.date_reported)')
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'team_id': self.team_id,
            'jersey_number': self.jersey_number,
            'age': self.age,
            'date_of_birth': self.date_of_birth.isoformat() if self.date_of_birth else None,
            'height': self.height,
            'weight': self.weight,
            'position': self.position,
            'dominant_side': self.dominant_side,
            'photo_url': self.photo_url,
            'bio_notes': self.bio_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'user': self.user.to_dict() if self.user else None
        }
    
    def calculate_age(self):
        if self.date_of_birth:
            today = date.today()
            return today.year - self.date_of_birth.year - ((today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day))
        return None

class Coach(db.Model):
    __tablename__ = 'coaches'
    
    id = db.Column(db.String(50), primary_key=True)
    user_id = db.Column(db.String(50), db.ForeignKey('users.id'), unique=True, nullable=False)
    qualification = db.Column(db.String(100), nullable=True)
    years_experience = db.Column(db.Integer, nullable=True)
    specialization = db.Column(db.String(100), nullable=True)
    contact_number = db.Column(db.String(20), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'qualification': self.qualification,
            'years_experience': self.years_experience,
            'specialization': self.specialization,
            'contact_number': self.contact_number,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'user': self.user.to_dict() if self.user else None
        }

# Add these models for future phases (preparing ahead)
class WellnessEntry(db.Model):
    __tablename__ = 'wellness_entries'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    athlete_id = db.Column(db.String(50), db.ForeignKey('athletes.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    sleep_hours = db.Column(db.Float, nullable=True)  # hours
    sleep_quality = db.Column(db.Integer, nullable=True)  # 1-5 scale
    stress_level = db.Column(db.Integer, nullable=True)  # 1-5 scale
    muscle_soreness = db.Column(db.Integer, nullable=True)  # 1-5 scale
    nutrition_quality = db.Column(db.Integer, nullable=True)  # 1-5 scale
    mood = db.Column(db.Integer, nullable=True)  # 1-5 scale
    readiness_score = db.Column(db.Integer, nullable=True)  # 1-10 scale
    energy_level = db.Column(db.Integer, nullable=True)  # 1-5 scale
    motivation_level = db.Column(db.Integer, nullable=True)  # 1-5 scale
    previous_session_rpe = db.Column(db.Integer, nullable=True)  # RPE 1-10
    previous_session_duration = db.Column(db.Integer, nullable=True)  # minutes
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def calculate_readiness_score(self):
        # Simple readiness calculation
        scores = [
            self.sleep_quality,
            self.stress_level,
            self.muscle_soreness,
            self.nutrition_quality,
            self.mood,
            self.energy_level,
            self.motivation_level
        ]
        valid_scores = [s for s in scores if s is not None]
        if valid_scores:
            # Invert stress and soreness (lower is better)
            adjusted_scores = []
            for i, score in enumerate(valid_scores):
                if i in [1, 2]:  # stress and soreness indices
                    adjusted_scores.append(6 - score)  # invert 1-5 scale
                else:
                    adjusted_scores.append(score)
            avg_score = sum(adjusted_scores) / len(adjusted_scores)
            return round(avg_score * 2)  # Convert to 1-10 scale
        return None
    
    def to_dict(self):
        return {
            'id': self.id,
            'athlete_id': self.athlete_id,
            'date': self.date.isoformat() if self.date else None,
            'sleep_hours': self.sleep_hours,
            'sleep_quality': self.sleep_quality,
            'stress_level': self.stress_level,
            'muscle_soreness': self.muscle_soreness,
            'nutrition_quality': self.nutrition_quality,
            'mood': self.mood,
            'readiness_score': self.readiness_score or self.calculate_readiness_score(),
            'energy_level': self.energy_level,
            'motivation_level': self.motivation_level,
            'previous_session_rpe': self.previous_session_rpe,
            'previous_session_duration': self.previous_session_duration,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class PerformanceTest(db.Model):
    __tablename__ = 'performance_tests'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    athlete_id = db.Column(db.String(50), db.ForeignKey('athletes.id'), nullable=False)
    test_date = db.Column(db.Date, nullable=False, default=date.today)
    test_type = db.Column(db.String(50), nullable=False)  # 'strength', 'speed', 'agility', 'endurance', 'flexibility'
    
    # Anthropometric measurements
    height = db.Column(db.Float, nullable=True)  # cm
    weight = db.Column(db.Float, nullable=True)  # kg
    body_fat_percentage = db.Column(db.Float, nullable=True)
    
    # Strength tests
    bench_press_1rm = db.Column(db.Float, nullable=True)  # kg
    squat_1rm = db.Column(db.Float, nullable=True)  # kg
    deadlift_1rm = db.Column(db.Float, nullable=True)  # kg
    pull_ups_max = db.Column(db.Integer, nullable=True)
    push_ups_1min = db.Column(db.Integer, nullable=True)
    sit_ups_2min = db.Column(db.Integer, nullable=True)
    
    # Speed tests
    sprint_10m = db.Column(db.Float, nullable=True)  # seconds
    sprint_20m = db.Column(db.Float, nullable=True)  # seconds
    sprint_40m = db.Column(db.Float, nullable=True)  # seconds
    
    # Agility tests
    agility_t_test = db.Column(db.Float, nullable=True)  # seconds
    agility_505 = db.Column(db.Float, nullable=True)  # seconds
    illinois_agility = db.Column(db.Float, nullable=True)  # seconds
    
    # Jump tests
    vertical_jump = db.Column(db.Float, nullable=True)  # cm
    broad_jump = db.Column(db.Float, nullable=True)  # cm
    single_leg_jump_left = db.Column(db.Float, nullable=True)  # cm
    single_leg_jump_right = db.Column(db.Float, nullable=True)  # cm
    
    # Endurance tests
    yo_yo_test = db.Column(db.Float, nullable=True)  # distance
    bronco_test = db.Column(db.Float, nullable=True)  # time
    
    # Flexibility tests
    sit_and_reach = db.Column(db.Float, nullable=True)  # cm
    dorsiflexion_left = db.Column(db.Float, nullable=True)  # cm
    dorsiflexion_right = db.Column(db.Float, nullable=True)  # cm
    
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id': self.id,
            'athlete_id': self.athlete_id,
            'test_date': self.test_date.isoformat() if self.test_date else None,
            'test_type': self.test_type,
            'height': self.height,
            'weight': self.weight,
            'body_fat_percentage': self.body_fat_percentage,
            'bench_press_1rm': self.bench_press_1rm,
            'squat_1rm': self.squat_1rm,
            'deadlift_1rm': self.deadlift_1rm,
            'pull_ups_max': self.pull_ups_max,
            'push_ups_1min': self.push_ups_1min,
            'sit_ups_2min': self.sit_ups_2min,
            'sprint_10m': self.sprint_10m,
            'sprint_20m': self.sprint_20m,
            'sprint_40m': self.sprint_40m,
            'agility_t_test': self.agility_t_test,
            'agility_505': self.agility_505,
            'illinois_agility': self.illinois_agility,
            'vertical_jump': self.vertical_jump,
            'broad_jump': self.broad_jump,
            'single_leg_jump_left': self.single_leg_jump_left,
            'single_leg_jump_right': self.single_leg_jump_right,
            'yo_yo_test': self.yo_yo_test,
            'bronco_test': self.bronco_test,
            'sit_and_reach': self.sit_and_reach,
            'dorsiflexion_left': self.dorsiflexion_left,
            'dorsiflexion_right': self.dorsiflexion_right,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }

class InjuryRecord(db.Model):
    __tablename__ = 'injury_records'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    athlete_id = db.Column(db.String(50), db.ForeignKey('athletes.id'), nullable=False)
    injury_type = db.Column(db.String(100), nullable=False)
    body_part = db.Column(db.String(100), nullable=False)
    side = db.Column(db.String(10), nullable=True)
    severity = db.Column(db.String(20), nullable=False)
    date_reported = db.Column(db.Date, nullable=False, default=date.today)
    date_occurred = db.Column(db.Date, nullable=True)
    mechanism = db.Column(db.Text, nullable=True)
    symptoms = db.Column(db.Text, nullable=True)
    diagnosis = db.Column(db.Text, nullable=True)
    treatment_plan = db.Column(db.Text, nullable=True)
    estimated_recovery_time = db.Column(db.Integer, nullable=True)
    status = db.Column(db.String(20), nullable=False, default='active')
    clearance_date = db.Column(db.Date, nullable=True)
    clearance_notes = db.Column(db.Text, nullable=True)
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # CONCUSSION-SPECIFIC FIELDS
    is_concussion = db.Column(db.Boolean, default=False)
    loss_of_consciousness = db.Column(db.Boolean, default=False)
    loc_duration = db.Column(db.Integer, nullable=True)  # seconds
    post_traumatic_amnesia = db.Column(db.Boolean, default=False)
    pta_duration = db.Column(db.Integer, nullable=True)  # minutes
    mechanism_of_concussion = db.Column(db.String(100), nullable=True)
    suspected_concussion = db.Column(db.Boolean, default=False)
    referred_to_physician = db.Column(db.Boolean, default=False)
    physician_name = db.Column(db.String(100), nullable=True)
    physician_contact = db.Column(db.String(100), nullable=True)
    
    # Return-to-play protocol fields
    rtp_protocol_started = db.Column(db.Boolean, default=False)
    rtp_start_date = db.Column(db.Date, nullable=True)
    rtp_stage = db.Column(db.Integer, nullable=True)  # 1-6 stages
    rtp_stage_start_date = db.Column(db.Date, nullable=True)
    rtp_completed_date = db.Column(db.Date, nullable=True)
    rtp_medical_clearance = db.Column(db.Boolean, default=False)
    rtp_medical_clearance_date = db.Column(db.Date, nullable=True)
    rtp_medical_clearance_by = db.Column(db.String(100), nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'athlete_id': self.athlete_id,
            'injury_type': self.injury_type,
            'body_part': self.body_part,
            'side': self.side,
            'severity': self.severity,
            'date_reported': self.date_reported.isoformat() if self.date_reported else None,
            'date_occurred': self.date_occurred.isoformat() if self.date_occurred else None,
            'mechanism': self.mechanism,
            'symptoms': self.symptoms,
            'diagnosis': self.diagnosis,
            'treatment_plan': self.treatment_plan,
            'estimated_recovery_time': self.estimated_recovery_time,
            'status': self.status,
            'clearance_date': self.clearance_date.isoformat() if self.clearance_date else None,
            'clearance_notes': self.clearance_notes,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            # Concussion-specific fields
            'is_concussion': self.is_concussion,
            'loss_of_consciousness': self.loss_of_consciousness,
            'loc_duration': self.loc_duration,
            'post_traumatic_amnesia': self.post_traumatic_amnesia,
            'pta_duration': self.pta_duration,
            'mechanism_of_concussion': self.mechanism_of_concussion,
            'suspected_concussion': self.suspected_concussion,
            'referred_to_physician': self.referred_to_physician,
            'physician_name': self.physician_name,
            'physician_contact': self.physician_contact,
            'rtp_protocol_started': self.rtp_protocol_started,
            'rtp_start_date': self.rtp_start_date.isoformat() if self.rtp_start_date else None,
            'rtp_stage': self.rtp_stage,
            'rtp_stage_start_date': self.rtp_stage_start_date.isoformat() if self.rtp_stage_start_date else None,
            'rtp_completed_date': self.rtp_completed_date.isoformat() if self.rtp_completed_date else None,
            'rtp_medical_clearance': self.rtp_medical_clearance,
            'rtp_medical_clearance_date': self.rtp_medical_clearance_date.isoformat() if self.rtp_medical_clearance_date else None,
            'rtp_medical_clearance_by': self.rtp_medical_clearance_by
        }
    
class ConcussionSymptomScore(db.Model):
    __tablename__ = 'concussion_symptom_scores'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    injury_id = db.Column(db.String(50), db.ForeignKey('injury_records.id'), nullable=False)
    assessment_date = db.Column(db.Date, nullable=False, default=date.today)
    assessed_by = db.Column(db.String(100), nullable=True)
    
    # SCAT6 Symptom Evaluation (22 symptoms, 0-6 scale)
    headache = db.Column(db.Integer, nullable=True)  # 0-6
    pressure_in_head = db.Column(db.Integer, nullable=True)
    neck_pain = db.Column(db.Integer, nullable=True)
    nausea_vomiting = db.Column(db.Integer, nullable=True)
    dizziness = db.Column(db.Integer, nullable=True)
    blurred_vision = db.Column(db.Integer, nullable=True)
    balance_problems = db.Column(db.Integer, nullable=True)
    sensitivity_to_light = db.Column(db.Integer, nullable=True)
    sensitivity_to_noise = db.Column(db.Integer, nullable=True)
    feeling_slowed_down = db.Column(db.Integer, nullable=True)
    feeling_mental_fog = db.Column(db.Integer, nullable=True)
    difficulty_concentrating = db.Column(db.Integer, nullable=True)
    difficulty_remembering = db.Column(db.Integer, nullable=True)
    fatigue_low_energy = db.Column(db.Integer, nullable=True)
    confusion = db.Column(db.Integer, nullable=True)
    drowsiness = db.Column(db.Integer, nullable=True)
    trouble_falling_asleep = db.Column(db.Integer, nullable=True)
    more_emotional = db.Column(db.Integer, nullable=True)
    irritability = db.Column(db.Integer, nullable=True)
    sadness = db.Column(db.Integer, nullable=True)
    nervous_anxious = db.Column(db.Integer, nullable=True)
    feeling_like_in_a_fog = db.Column(db.Integer, nullable=True)
    
    # Total symptom severity score
    total_symptom_score = db.Column(db.Integer, nullable=True)
    
    # Cognitive screening
    orientation_score = db.Column(db.Integer, nullable=True)  # 0-5
    immediate_memory_score = db.Column(db.Integer, nullable=True)  # 0-15
    concentration_score = db.Column(db.Integer, nullable=True)  # 0-5
    
    # Balance assessment (BESS)
    balance_score = db.Column(db.Integer, nullable=True)  # 0-30 (lower is better)
    
    # Tandem gait test
    tandem_gait_time = db.Column(db.Float, nullable=True)  # seconds
    
    # Clinical notes
    clinical_notes = db.Column(db.Text, nullable=True)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationship
    injury = db.relationship('InjuryRecord', backref='symptom_scores', lazy=True)
    
    def calculate_total_score(self):
        """Calculate total symptom severity score"""
        symptoms = [
            self.headache, self.pressure_in_head, self.neck_pain,
            self.nausea_vomiting, self.dizziness, self.blurred_vision,
            self.balance_problems, self.sensitivity_to_light,
            self.sensitivity_to_noise, self.feeling_slowed_down,
            self.feeling_mental_fog, self.difficulty_concentrating,
            self.difficulty_remembering, self.fatigue_low_energy,
            self.confusion, self.drowsiness, self.trouble_falling_asleep,
            self.more_emotional, self.irritability, self.sadness,
            self.nervous_anxious, self.feeling_like_in_a_fog
        ]
        
        valid_scores = [s for s in symptoms if s is not None]
        return sum(valid_scores) if valid_scores else 0
    
    def to_dict(self):
        return {
            'id': self.id,
            'injury_id': self.injury_id,
            'assessment_date': self.assessment_date.isoformat() if self.assessment_date else None,
            'assessed_by': self.assessed_by,
            
            # Symptom scores
            'headache': self.headache,
            'pressure_in_head': self.pressure_in_head,
            'neck_pain': self.neck_pain,
            'nausea_vomiting': self.nausea_vomiting,
            'dizziness': self.dizziness,
            'blurred_vision': self.blurred_vision,
            'balance_problems': self.balance_problems,
            'sensitivity_to_light': self.sensitivity_to_light,
            'sensitivity_to_noise': self.sensitivity_to_noise,
            'feeling_slowed_down': self.feeling_slowed_down,
            'feeling_mental_fog': self.feeling_mental_fog,
            'difficulty_concentrating': self.difficulty_concentrating,
            'difficulty_remembering': self.difficulty_remembering,
            'fatigue_low_energy': self.fatigue_low_energy,
            'confusion': self.confusion,
            'drowsiness': self.drowsiness,
            'trouble_falling_asleep': self.trouble_falling_asleep,
            'more_emotional': self.more_emotional,
            'irritability': self.irritability,
            'sadness': self.sadness,
            'nervous_anxious': self.nervous_anxious,
            'feeling_like_in_a_fog': self.feeling_like_in_a_fog,
            
            'total_symptom_score': self.total_symptom_score or self.calculate_total_score(),
            
            # Cognitive scores
            'orientation_score': self.orientation_score,
            'immediate_memory_score': self.immediate_memory_score,
            'concentration_score': self.concentration_score,
            
            # Balance and gait
            'balance_score': self.balance_score,
            'tandem_gait_time': self.tandem_gait_time,
            
            'clinical_notes': self.clinical_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
class WorkloadSession(db.Model):
    __tablename__ = 'workload_sessions'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    athlete_id = db.Column(db.String(50), db.ForeignKey('athletes.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    
    # Session details
    session_type = db.Column(db.String(50), nullable=False)  # 'training', 'match', 'recovery'
    session_name = db.Column(db.String(100), nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=False)
    perceived_exertion = db.Column(db.Integer, nullable=False)  # RPE 1-10
    workload_score = db.Column(db.Float, nullable=True)  # RPE * Duration
    
    # Session metrics (optional)
    distance_km = db.Column(db.Float, nullable=True)
    average_hr = db.Column(db.Float, nullable=True)  # average heart rate
    max_hr = db.Column(db.Float, nullable=True)
    sprints_count = db.Column(db.Integer, nullable=True)
    high_intensity_distance = db.Column(db.Float, nullable=True)
    
    # Wellness after session
    fatigue_level = db.Column(db.Integer, nullable=True)  # 1-5
    muscle_soreness_post = db.Column(db.Integer, nullable=True)  # 1-5
    motivation_post = db.Column(db.Integer, nullable=True)  # 1-5
    
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    athlete = db.relationship('Athlete', backref='workload_sessions', lazy=True)
    
    def calculate_workload_score(self):
        """Calculate workload as RPE * Duration"""
        if self.perceived_exertion and self.duration_minutes:
            return self.perceived_exertion * self.duration_minutes
        return None
    
    def to_dict(self):
        return {
            'id': self.id,
            'athlete_id': self.athlete_id,
            'date': self.date.isoformat() if self.date else None,
            'session_type': self.session_type,
            'session_name': self.session_name,
            'duration_minutes': self.duration_minutes,
            'perceived_exertion': self.perceived_exertion,
            'workload_score': self.workload_score or self.calculate_workload_score(),
            'distance_km': self.distance_km,
            'average_hr': self.average_hr,
            'max_hr': self.max_hr,
            'sprints_count': self.sprints_count,
            'high_intensity_distance': self.high_intensity_distance,
            'fatigue_level': self.fatigue_level,
            'muscle_soreness_post': self.muscle_soreness_post,
            'motivation_post': self.motivation_post,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'athlete_name': f"{self.athlete.user.name} {self.athlete.user.surname}" if self.athlete and self.athlete.user else None
        }


class RecoverySession(db.Model):
    __tablename__ = 'recovery_sessions'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    athlete_id = db.Column(db.String(50), db.ForeignKey('athletes.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    
    # Recovery activity details
    recovery_type = db.Column(db.String(50), nullable=False)  # 'active', 'passive', 'prehab'
    session_name = db.Column(db.String(100), nullable=True)
    duration_minutes = db.Column(db.Integer, nullable=False)
    
    # Recovery modalities
    stretching = db.Column(db.Boolean, default=False)
    foam_rolling = db.Column(db.Boolean, default=False)
    massage = db.Column(db.Boolean, default=False)
    ice_bath = db.Column(db.Boolean, default=False)
    compression = db.Column(db.Boolean, default=False)
    sleep_quality = db.Column(db.Integer, nullable=True)  # 1-5
    nutrition_quality = db.Column(db.Integer, nullable=True)  # 1-5
    hydration_status = db.Column(db.Integer, nullable=True)  # 1-5
    
    # Prehab exercises (JSON string for multiple exercises)
    prehab_exercises = db.Column(db.Text, nullable=True)  # JSON string
    
    # Recovery effectiveness
    perceived_recovery = db.Column(db.Integer, nullable=True)  # 1-10
    readiness_improvement = db.Column(db.Integer, nullable=True)  # 1-5
    
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    athlete = db.relationship('Athlete', backref='recovery_sessions', lazy=True)
    
    def to_dict(self):
        import json
        prehab_exercises = []
        if self.prehab_exercises:
            try:
                prehab_exercises = json.loads(self.prehab_exercises)
            except:
                prehab_exercises = []
        
        return {
            'id': self.id,
            'athlete_id': self.athlete_id,
            'date': self.date.isoformat() if self.date else None,
            'recovery_type': self.recovery_type,
            'session_name': self.session_name,
            'duration_minutes': self.duration_minutes,
            'stretching': self.stretching,
            'foam_rolling': self.foam_rolling,
            'massage': self.massage,
            'ice_bath': self.ice_bath,
            'compression': self.compression,
            'sleep_quality': self.sleep_quality,
            'nutrition_quality': self.nutrition_quality,
            'hydration_status': self.hydration_status,
            'prehab_exercises': prehab_exercises,
            'perceived_recovery': self.perceived_recovery,
            'readiness_improvement': self.readiness_improvement,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'athlete_name': f"{self.athlete.user.name} {self.athlete.user.surname}" if self.athlete and self.athlete.user else None
        }


class PrehabRecommendation(db.Model):
    __tablename__ = 'prehab_recommendations'
    
    id = db.Column(db.String(50), primary_key=True, default=lambda: str(uuid.uuid4()))
    athlete_id = db.Column(db.String(50), db.ForeignKey('athletes.id'), nullable=False)
    created_by = db.Column(db.String(50), db.ForeignKey('users.id'), nullable=True)
    
    # Recommendation details
    recommendation_date = db.Column(db.Date, nullable=False, default=date.today)
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=True)
    
    # Recommendation type and focus
    recommendation_type = db.Column(db.String(50), nullable=False)  # 'injury_prevention', 'performance', 'recovery'
    body_parts = db.Column(db.String(200), nullable=True)  # comma-separated
    focus_area = db.Column(db.String(100), nullable=True)  # 'strength', 'mobility', 'stability', 'endurance'
    
    # Exercises (JSON string for multiple exercises with sets/reps)
    exercises = db.Column(db.Text, nullable=False)
    
    # Frequency and duration
    frequency_per_week = db.Column(db.Integer, nullable=True)
    estimated_duration_minutes = db.Column(db.Integer, nullable=True)
    
    # Status
    status = db.Column(db.String(20), nullable=False, default='active')  # 'active', 'completed', 'suspended'
    compliance_rate = db.Column(db.Float, nullable=True)  # 0-100%
    
    # Tracking
    notes = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    athlete = db.relationship('Athlete', backref='prehab_recommendations', lazy=True)
    creator = db.relationship('User', backref='created_recommendations', lazy=True)
    
    def to_dict(self):
        import json
        exercises = []
        if self.exercises:
            try:
                exercises = json.loads(self.exercises)
            except:
                exercises = []
        
        return {
            'id': self.id,
            'athlete_id': self.athlete_id,
            'created_by': self.created_by,
            'recommendation_date': self.recommendation_date.isoformat() if self.recommendation_date else None,
            'start_date': self.start_date.isoformat() if self.start_date else None,
            'end_date': self.end_date.isoformat() if self.end_date else None,
            'recommendation_type': self.recommendation_type,
            'body_parts': self.body_parts.split(',') if self.body_parts else [],
            'focus_area': self.focus_area,
            'exercises': exercises,
            'frequency_per_week': self.frequency_per_week,
            'estimated_duration_minutes': self.estimated_duration_minutes,
            'status': self.status,
            'compliance_rate': self.compliance_rate,
            'notes': self.notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'athlete_name': f"{self.athlete.user.name} {self.athlete.user.surname}" if self.athlete and self.athlete.user else None,
            'created_by_name': f"{self.creator.name} {self.creator.surname}" if self.creator else None
        }