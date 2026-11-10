# HER-PACE

School sport & PE performance tracking for primary and high schools.

HER-PACE helps PE teachers and coaches log sessions, record performance test results and manage sports teams, while students view their own progress and manage their profiles.

## Features

- **PE session logging** - teachers log class PE lessons (duration, intensity, telemetry, notes) for one or many students at once.
- **Team management** - coaches create teams per sport department, build rosters and log training sessions and matches.
- **Performance tracking** - record sport-specific test results and visualise trends per student over time.
- **Sports & metrics catalog** - ships with Physical Education, Football (Soccer), Rugby, Cricket, Hockey, Swimming, Netball, Basketball and Athletics, each with standard coach metrics. Coaches and admins can add new sports and metrics.
- **Student accounts** - students sign up, view their performance and edit their own profiles.
- **Role-based access** - admins and teachers/coaches have school-wide access to student profiles; students see their own data.
- **Modern UI** - white-first theme with dark mode and per-account accent colour customisation.

## Tech stack

| Layer    | Stack                                               |
|----------|-----------------------------------------------------|
| Frontend | React 19, Vite, Tailwind CSS, Recharts              |
| Backend  | Flask, SQLAlchemy, Flask-Migrate, JWT (SQLite)      |
| Deploy   | Docker (gunicorn serving API + built frontend)      |

## Local development

### Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
flask --app run.py db upgrade
python run.py                # serves on http://localhost:5000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                  # serves on http://localhost:3000 (proxies /api to :5000)
```

## Production build

```bash
docker build -t her-pace .
docker run -p 8080:8080 her-pace
```

Or manually: `cd frontend && npm run build`, then run the backend - it serves `frontend/dist` automatically.

## Roles

| Role     | Access                                                            |
|----------|-------------------------------------------------------------------|
| Admin    | Everything: users, exports, sports, all students and teams        |
| Coach    | All student profiles, own teams, sessions, results, sports/metrics |
| Student  | Own profile (editable), own sessions and results                  |
