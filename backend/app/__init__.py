from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_jwt_extended import JWTManager
import os
from dotenv import load_dotenv

load_dotenv()

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()

def create_app():
    app = Flask(__name__)
    
    # Configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL') or 'sqlite:///athens.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY') or 'jwt-secret-key-change-in-production'
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = 86400  # 24 hours
    app.config['BACKUP_DIR'] = os.environ.get('BACKUP_DIR')
    app.config['BACKUP_INTERVAL_HOURS'] = float(os.environ.get('BACKUP_INTERVAL_HOURS', '24') or 0)
    app.config['BACKUP_MAX_KEEP'] = int(os.environ.get('BACKUP_MAX_KEEP', '30'))
    app.config['SCHOOL_TIMEZONE'] = os.environ.get('SCHOOL_TIMEZONE', 'Africa/Johannesburg')
    app.config['WELLNESS_REMINDER_INTERVAL_SECONDS'] = int(os.environ.get('WELLNESS_REMINDER_INTERVAL_SECONDS', '900'))
    
    # Initialize extensions
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    CORS(app, supports_credentials=True)
    
    # Register blueprints
    from app.routes.health import bp as health_bp
    from app.routes.auth import bp as auth_bp
    from app.routes.athletes import bp as athletes_bp
    from app.routes.teams import bp as teams_bp
    from app.routes.wellness import bp as wellness_bp
    from app.routes.performance import bp as performance_bp 
    from app.routes.dashboard import bp as dashboard_bp
    from app.routes.injuries import bp as injuries_bp
    from app.routes.concussion import bp as concussion_bp
    from app.routes.workload import bp as workload_bp
    from app.routes.recovery import bp as recovery_bp
    from app.routes.admin import bp as admin_bp
    
    app.register_blueprint(health_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(athletes_bp)
    app.register_blueprint(teams_bp)
    app.register_blueprint(wellness_bp)
    app.register_blueprint(performance_bp)
    app.register_blueprint(dashboard_bp)
    app.register_blueprint(injuries_bp)
    app.register_blueprint(concussion_bp)
    app.register_blueprint(workload_bp)
    app.register_blueprint(recovery_bp)
    app.register_blueprint(admin_bp)

    with app.app_context():
        from app.services.bootstrap import ensure_super_admin
        try:
            ensure_super_admin()
        except Exception:
            pass

    if not os.environ.get('DISABLE_BACKGROUND_JOBS'):
        from app.services.scheduler import start_backup_scheduler, start_wellness_reminder_scheduler
        start_backup_scheduler(app)
        start_wellness_reminder_scheduler(app)
    
    return app