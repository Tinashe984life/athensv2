import sys
import os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app import create_app, db
from app.models import User, Team

app = create_app()

with app.app_context():
    # Check if tables exist
    print("Checking database tables...")
    print("Tables created:", list(db.metadata.tables.keys()))
    
    # Count users
    user_count = User.query.count()
    print(f"Total users in database: {user_count}")
    
    # Create a test coach if none exists
    if user_count == 0:
        print("\nCreating test coach...")
        coach = User(
            id="test-coach-001",
            username="coach",
            name="Test",
            surname="Coach",
            role="coach",
            email="coach@example.com"
        )
        coach.set_password("password123")
        
        team = Team(
            id="TEAM-TEST-001",
            name="Test Team",
            coach_id="test-coach-001"
        )
        
        db.session.add(coach)
        db.session.add(team)
        db.session.commit()
        print("Test coach created: username='coach', password='password123'")
    
    print("\nSetup complete!")