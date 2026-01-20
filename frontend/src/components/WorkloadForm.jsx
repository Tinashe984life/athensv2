import React, { useState, useEffect } from 'react';
import { workload } from '../services/workload';
import { athletes } from '../services/athletes';

const WorkloadForm = ({ user, athleteId = null, onSuccess, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [athletesList, setAthletesList] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(athleteId);
  const [selectedSport, setSelectedSport] = useState('');
  const [activeTab, setActiveTab] = useState('general');
  
  const [formData, setFormData] = useState({
    athlete_id: athleteId || '',
    date: new Date().toISOString().split('T')[0],
    session_type: 'training',
    session_name: '',
    duration_minutes: 60,
    perceived_exertion: 5,
    
    // General metrics (all sports)
    fatigue_level: '',
    muscle_soreness_post: '',
    motivation_post: '',
    notes: '',
    
    // Running/Sprinting metrics
    distance_km: '',
    average_hr: '',
    max_hr: '',
    sprints_count: '',
    high_intensity_distance: '',
    intervals_count: '',
    rest_ratio: '1:1',
    pace_min_km: '',
    
    // Strength training metrics
    strength_session_type: 'weights',
    total_volume_kg: '',
    sets_completed: '',
    reps_completed: '',
    max_load_kg: '',
    exercise_count: '',
    tempo_emphasis: 'normal',
    
    // Team sport metrics
    sport_type: 'soccer',
    game_minutes: '',
    position_played: '',
    impacts_count: '',
    decelerations_count: '',
    accelerations_count: '',
    total_distance: '',
    high_speed_distance: '',
    possession_time: '',
    shots_taken: '',
    passes_completed: '',
    tackles_made: '',
    
    // Basketball-specific
    points_scored: '',
    rebounds: '',
    assists: '',
    steals: '',
    blocks: '',
    turnovers: '',
    fouls: '',
    three_pointers_made: '',
    
    // Rugby-specific
    carries: '',
    meters_gained: '',
    clean_breaks: '',
    defenders_beaten: '',
    offloads: '',
    rucks_hit: '',
    tackles_missed: '',
    
    // Volleyball-specific
    attacks: '',
    kills: '',
    blocks_vb: '',
    digs: '',
    aces: '',
    errors: '',
    serve_receptions: '',
    
    // American Football-specific
    plays_participated: '',
    yards_gained: '',
    touchdowns: '',
    receptions: '',
    tackles_af: '',
    sacks: '',
    interceptions: '',
    
    // Swimming metrics
    swimming_distance_m: '',
    swimming_stroke: 'freestyle',
    swimming_pace_min_100m: '',
    swimming_laps_completed: '',
    swimming_intervals: '',
    swimming_rest_time: '',
    swimming_technique_focus: '',
    
    // Gymnastics metrics
    apparatus: 'floor',
    routines_practiced: '',
    elements_attempted: '',
    elements_completed: '',
    landings_stuck: '',
    execution_score: '',
    difficulty_score: '',
    
    // Tennis metrics
    sets_played: '',
    games_won: '',
    total_points: '',
    winners: '',
    unforced_errors: '',
    first_serve_percentage: '',
    aces_tennis: '',
    double_faults: '',
    
    // Cricket metrics
    overs_bowled: '',
    runs_conceded: '',
    wickets_taken: '',
    maidens_bowled: '',
    runs_scored: '',
    balls_faced: '',
    fours_hit: '',
    sixes_hit: '',
    
    // Jump metrics
    jumps_count: '',
    max_jump_height: '',
    landing_quality: '',
    jump_type: 'vertical',
  });

  useEffect(() => {
    loadAthletes();
  }, []);

  useEffect(() => {
    if (athleteId) {
      setFormData(prev => ({ ...prev, athlete_id: athleteId }));
      setSelectedAthlete(athleteId);
    }
  }, [athleteId]);

  const loadAthletes = async () => {
    try {
      const response = await athletes.getAll();
      if (response.data.success) {
        setAthletesList(response.data.athletes);
      }
    } catch (err) {
      console.error('Error loading athletes:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (name === 'athlete_id') {
      const athlete = athletesList.find(a => a.id === value);
      if (athlete && athlete.team?.sport) {
        setSelectedSport(athlete.team.sport.toLowerCase());
      }
    }
  };

  const handleSportTypeChange = (e) => {
    setSelectedSport(e.target.value);
    // Reset sport-specific fields when changing sport
    if (e.target.value !== selectedSport) {
      const resetFields = {};
      
      // Clear all sport-specific fields
      const sportFields = [
        'distance_km', 'sprints_count', 'high_intensity_distance', 'intervals_count', 'rest_ratio', 'pace_min_km',
        'total_volume_kg', 'sets_completed', 'reps_completed', 'max_load_kg', 'exercise_count', 'tempo_emphasis',
        'game_minutes', 'position_played', 'impacts_count', 'decelerations_count', 'accelerations_count', 'total_distance',
        'high_speed_distance', 'possession_time', 'shots_taken', 'passes_completed', 'tackles_made',
        'points_scored', 'rebounds', 'assists', 'steals', 'blocks', 'turnovers', 'fouls', 'three_pointers_made',
        'carries', 'meters_gained', 'clean_breaks', 'defenders_beaten', 'offloads', 'rucks_hit', 'tackles_missed',
        'attacks', 'kills', 'blocks_vb', 'digs', 'aces', 'errors', 'serve_receptions',
        'plays_participated', 'yards_gained', 'touchdowns', 'receptions', 'tackles_af', 'sacks', 'interceptions',
        'swimming_distance_m', 'swimming_pace_min_100m', 'swimming_laps_completed', 'swimming_intervals', 'swimming_rest_time', 'swimming_technique_focus',
        'routines_practiced', 'elements_attempted', 'elements_completed', 'landings_stuck', 'execution_score', 'difficulty_score',
        'sets_played', 'games_won', 'total_points', 'winners', 'unforced_errors', 'first_serve_percentage', 'aces_tennis', 'double_faults',
        'overs_bowled', 'runs_conceded', 'wickets_taken', 'maidens_bowled', 'runs_scored', 'balls_faced', 'fours_hit', 'sixes_hit',
        'jumps_count', 'max_jump_height', 'landing_quality', 'jump_type'
      ];
      
      sportFields.forEach(field => {
        resetFields[field] = '';
      });
      
      setFormData(prev => ({ ...prev, ...resetFields }));
      
      // Set appropriate sport_type for team sports
      if (['soccer', 'basketball', 'rugby', 'hockey', 'football', 'volleyball'].includes(e.target.value)) {
        setFormData(prev => ({ ...prev, sport_type: e.target.value }));
      } else if (e.target.value === 'gymnastics') {
        setFormData(prev => ({ ...prev, apparatus: 'floor' }));
      } else if (e.target.value === 'swimming') {
        setFormData(prev => ({ ...prev, swimming_stroke: 'freestyle' }));
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Prepare base data
      const submissionData = {
        athlete_id: formData.athlete_id,
        date: formData.date,
        session_type: formData.session_type,
        session_name: formData.session_name,
        duration_minutes: parseInt(formData.duration_minutes) || 0,
        perceived_exertion: parseInt(formData.perceived_exertion) || 0,
        sport_type: selectedSport,
        fatigue_level: formData.fatigue_level ? parseInt(formData.fatigue_level) : null,
        muscle_soreness_post: formData.muscle_soreness_post ? parseInt(formData.muscle_soreness_post) : null,
        motivation_post: formData.motivation_post ? parseInt(formData.motivation_post) : null,
        notes: formData.notes,
      };

      // Add sport-specific metrics
      switch(selectedSport) {
        case 'running':
        case 'track':
        case 'cross country':
          submissionData.distance_km = formData.distance_km ? parseFloat(formData.distance_km) : null;
          submissionData.average_hr = formData.average_hr ? parseFloat(formData.average_hr) : null;
          submissionData.max_hr = formData.max_hr ? parseFloat(formData.max_hr) : null;
          submissionData.sprints_count = formData.sprints_count ? parseInt(formData.sprints_count) : null;
          submissionData.high_intensity_distance = formData.high_intensity_distance ? parseFloat(formData.high_intensity_distance) : null;
          submissionData.intervals_count = formData.intervals_count ? parseInt(formData.intervals_count) : null;
          submissionData.rest_ratio = formData.rest_ratio;
          submissionData.pace_min_km = formData.pace_min_km ? parseFloat(formData.pace_min_km) : null;
          break;
          
        case 'strength':
        case 'weightlifting':
        case 'powerlifting':
          submissionData.strength_session_type = formData.strength_session_type;
          submissionData.total_volume_kg = formData.total_volume_kg ? parseFloat(formData.total_volume_kg) : null;
          submissionData.sets_completed = formData.sets_completed ? parseInt(formData.sets_completed) : null;
          submissionData.reps_completed = formData.reps_completed ? parseInt(formData.reps_completed) : null;
          submissionData.max_load_kg = formData.max_load_kg ? parseFloat(formData.max_load_kg) : null;
          submissionData.exercise_count = formData.exercise_count ? parseInt(formData.exercise_count) : null;
          submissionData.tempo_emphasis = formData.tempo_emphasis;
          break;
          
        case 'soccer':
          submissionData.game_minutes = formData.game_minutes ? parseInt(formData.game_minutes) : null;
          submissionData.position_played = formData.position_played;
          submissionData.impacts_count = formData.impacts_count ? parseInt(formData.impacts_count) : null;
          submissionData.decelerations_count = formData.decelerations_count ? parseInt(formData.decelerations_count) : null;
          submissionData.accelerations_count = formData.accelerations_count ? parseInt(formData.accelerations_count) : null;
          submissionData.total_distance = formData.total_distance ? parseFloat(formData.total_distance) : null;
          submissionData.high_speed_distance = formData.high_speed_distance ? parseFloat(formData.high_speed_distance) : null;
          submissionData.possession_time = formData.possession_time ? parseInt(formData.possession_time) : null;
          submissionData.shots_taken = formData.shots_taken ? parseInt(formData.shots_taken) : null;
          submissionData.passes_completed = formData.passes_completed ? parseInt(formData.passes_completed) : null;
          submissionData.tackles_made = formData.tackles_made ? parseInt(formData.tackles_made) : null;
          break;
          
        case 'basketball':
          submissionData.game_minutes = formData.game_minutes ? parseInt(formData.game_minutes) : null;
          submissionData.position_played = formData.position_played;
          submissionData.points_scored = formData.points_scored ? parseInt(formData.points_scored) : null;
          submissionData.rebounds = formData.rebounds ? parseInt(formData.rebounds) : null;
          submissionData.assists = formData.assists ? parseInt(formData.assists) : null;
          submissionData.steals = formData.steals ? parseInt(formData.steals) : null;
          submissionData.blocks = formData.blocks ? parseInt(formData.blocks) : null;
          submissionData.turnovers = formData.turnovers ? parseInt(formData.turnovers) : null;
          submissionData.fouls = formData.fouls ? parseInt(formData.fouls) : null;
          submissionData.three_pointers_made = formData.three_pointers_made ? parseInt(formData.three_pointers_made) : null;
          break;
          
        case 'rugby':
          submissionData.game_minutes = formData.game_minutes ? parseInt(formData.game_minutes) : null;
          submissionData.position_played = formData.position_played;
          submissionData.carries = formData.carries ? parseInt(formData.carries) : null;
          submissionData.meters_gained = formData.meters_gained ? parseFloat(formData.meters_gained) : null;
          submissionData.clean_breaks = formData.clean_breaks ? parseInt(formData.clean_breaks) : null;
          submissionData.defenders_beaten = formData.defenders_beaten ? parseInt(formData.defenders_beaten) : null;
          submissionData.offloads = formData.offloads ? parseInt(formData.offloads) : null;
          submissionData.rucks_hit = formData.rucks_hit ? parseInt(formData.rucks_hit) : null;
          submissionData.tackles_made = formData.tackles_made ? parseInt(formData.tackles_made) : null;
          submissionData.tackles_missed = formData.tackles_missed ? parseInt(formData.tackles_missed) : null;
          break;
          
        case 'volleyball':
          submissionData.game_minutes = formData.game_minutes ? parseInt(formData.game_minutes) : null;
          submissionData.position_played = formData.position_played;
          submissionData.attacks = formData.attacks ? parseInt(formData.attacks) : null;
          submissionData.kills = formData.kills ? parseInt(formData.kills) : null;
          submissionData.blocks_vb = formData.blocks_vb ? parseInt(formData.blocks_vb) : null;
          submissionData.digs = formData.digs ? parseInt(formData.digs) : null;
          submissionData.aces = formData.aces ? parseInt(formData.aces) : null;
          submissionData.errors = formData.errors ? parseInt(formData.errors) : null;
          submissionData.serve_receptions = formData.serve_receptions ? parseInt(formData.serve_receptions) : null;
          break;
          
        case 'football': // American Football
          submissionData.game_minutes = formData.game_minutes ? parseInt(formData.game_minutes) : null;
          submissionData.position_played = formData.position_played;
          submissionData.plays_participated = formData.plays_participated ? parseInt(formData.plays_participated) : null;
          submissionData.yards_gained = formData.yards_gained ? parseFloat(formData.yards_gained) : null;
          submissionData.touchdowns = formData.touchdowns ? parseInt(formData.touchdowns) : null;
          submissionData.receptions = formData.receptions ? parseInt(formData.receptions) : null;
          submissionData.tackles_af = formData.tackles_af ? parseInt(formData.tackles_af) : null;
          submissionData.sacks = formData.sacks ? parseInt(formData.sacks) : null;
          submissionData.interceptions = formData.interceptions ? parseInt(formData.interceptions) : null;
          break;
          
        case 'swimming':
          submissionData.swimming_distance_m = formData.swimming_distance_m ? parseInt(formData.swimming_distance_m) : null;
          submissionData.swimming_stroke = formData.swimming_stroke;
          submissionData.swimming_pace_min_100m = formData.swimming_pace_min_100m ? parseFloat(formData.swimming_pace_min_100m) : null;
          submissionData.swimming_laps_completed = formData.swimming_laps_completed ? parseInt(formData.swimming_laps_completed) : null;
          submissionData.swimming_intervals = formData.swimming_intervals ? parseInt(formData.swimming_intervals) : null;
          submissionData.swimming_rest_time = formData.swimming_rest_time ? parseInt(formData.swimming_rest_time) : null;
          submissionData.swimming_technique_focus = formData.swimming_technique_focus;
          break;
          
        case 'gymnastics':
          submissionData.apparatus = formData.apparatus;
          submissionData.routines_practiced = formData.routines_practiced ? parseInt(formData.routines_practiced) : null;
          submissionData.elements_attempted = formData.elements_attempted ? parseInt(formData.elements_attempted) : null;
          submissionData.elements_completed = formData.elements_completed ? parseInt(formData.elements_completed) : null;
          submissionData.landings_stuck = formData.landings_stuck ? parseInt(formData.landings_stuck) : null;
          submissionData.execution_score = formData.execution_score ? parseFloat(formData.execution_score) : null;
          submissionData.difficulty_score = formData.difficulty_score ? parseFloat(formData.difficulty_score) : null;
          break;
          
        case 'tennis':
          submissionData.sets_played = formData.sets_played ? parseInt(formData.sets_played) : null;
          submissionData.games_won = formData.games_won ? parseInt(formData.games_won) : null;
          submissionData.total_points = formData.total_points ? parseInt(formData.total_points) : null;
          submissionData.winners = formData.winners ? parseInt(formData.winners) : null;
          submissionData.unforced_errors = formData.unforced_errors ? parseInt(formData.unforced_errors) : null;
          submissionData.first_serve_percentage = formData.first_serve_percentage ? parseFloat(formData.first_serve_percentage) : null;
          submissionData.aces_tennis = formData.aces_tennis ? parseInt(formData.aces_tennis) : null;
          submissionData.double_faults = formData.double_faults ? parseInt(formData.double_faults) : null;
          break;
          
        case 'cricket':
          submissionData.overs_bowled = formData.overs_bowled ? parseFloat(formData.overs_bowled) : null;
          submissionData.runs_conceded = formData.runs_conceded ? parseInt(formData.runs_conceded) : null;
          submissionData.wickets_taken = formData.wickets_taken ? parseInt(formData.wickets_taken) : null;
          submissionData.maidens_bowled = formData.maidens_bowled ? parseInt(formData.maidens_bowled) : null;
          submissionData.runs_scored = formData.runs_scored ? parseInt(formData.runs_scored) : null;
          submissionData.balls_faced = formData.balls_faced ? parseInt(formData.balls_faced) : null;
          submissionData.fours_hit = formData.fours_hit ? parseInt(formData.fours_hit) : null;
          submissionData.sixes_hit = formData.sixes_hit ? parseInt(formData.sixes_hit) : null;
          break;
          
        case 'jumping':
          submissionData.jumps_count = formData.jumps_count ? parseInt(formData.jumps_count) : null;
          submissionData.max_jump_height = formData.max_jump_height ? parseFloat(formData.max_jump_height) : null;
          submissionData.landing_quality = formData.landing_quality;
          submissionData.jump_type = formData.jump_type;
          break;
      }

      const response = await workload.createWorkloadSession(submissionData);
      
      if (response.success) {
        if (onSuccess) {
          onSuccess(response.session);
          alert('Training session saved successfully!');
        }
        if (onClose) onClose();
        
        // Reset form
        const resetForm = {
          athlete_id: athleteId || '',
          date: new Date().toISOString().split('T')[0],
          session_type: 'training',
          session_name: '',
          duration_minutes: 60,
          perceived_exertion: 5,
          fatigue_level: '',
          muscle_soreness_post: '',
          motivation_post: '',
          notes: '',
        };
        
        // Clear sport-specific fields
        Object.keys(formData).forEach(key => {
          if (!(key in resetForm) && key !== 'athlete_id') {
            resetForm[key] = '';
          }
        });
        
        setFormData(resetForm);
      } else {
        alert(`Error: ${response.message || 'Failed to save session'}`);
      }
    } catch (err) {
      console.error('Error creating workload session:', err);
      alert('Error creating workload session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAthleteSelect = (e) => {
    const athleteId = e.target.value;
    setSelectedAthlete(athleteId);
    setFormData(prev => ({ ...prev, athlete_id: athleteId }));
    
    const athlete = athletesList.find(a => a.id === athleteId);
    if (athlete && athlete.team?.sport) {
      const sport = athlete.team.sport.toLowerCase();
      setSelectedSport(sport);
      
      if (['soccer', 'football', 'basketball', 'rugby', 'hockey', 'volleyball'].includes(sport)) {
        setFormData(prev => ({ ...prev, sport_type: sport }));
      }
    }
  };

  const renderAthleteSelector = () => {
    if (user.role === 'athlete') {
      const athlete = athletesList.find(a => a.user_id === user.id);
      if (athlete) {
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Athlete
            </label>
            <div className="bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3">
              {athlete.user.name} {athlete.user.surname}
              {athlete.team?.sport && (
                <span className="ml-2 text-xs text-slate-400">({athlete.team.sport})</span>
              )}
            </div>
            <input type="hidden" name="athlete_id" value={athlete.id} />
          </div>
        );
      }
    }

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Athlete *
        </label>
        <select
          name="athlete_id"
          value={selectedAthlete}
          onChange={handleAthleteSelect}
          className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
          required
        >
          <option value="">Select Athlete</option>
          {athletesList.map(athlete => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.user.name} {athlete.user.surname} - {athlete.team?.name || 'No Team'} {athlete.team?.sport && `(${athlete.team.sport})`}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderSportSpecificFields = () => {
    switch(selectedSport) {
      case 'running':
      case 'track':
      case 'cross country':
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-3">Running Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Distance (km)
                </label>
                <input
                  type="number"
                  name="distance_km"
                  value={formData.distance_km}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Number of Sprints
                </label>
                <input
                  type="number"
                  name="sprints_count"
                  value={formData.sprints_count}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  High Intensity Distance (m)
                </label>
                <input
                  type="number"
                  name="high_intensity_distance"
                  value={formData.high_intensity_distance}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Intervals/Reps
                </label>
                <input
                  type="number"
                  name="intervals_count"
                  value={formData.intervals_count}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rest Ratio (Work:Rest)
                </label>
                <select
                  name="rest_ratio"
                  value={formData.rest_ratio}
                  onChange={handleInputChange}
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                >
                  <option value="1:1">1:1</option>
                  <option value="1:2">1:2</option>
                  <option value="1:3">1:3</option>
                  <option value="2:1">2:1</option>
                  <option value="continuous">Continuous</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Average Pace (min/km)
                </label>
                <input
                  type="number"
                  name="pace_min_km"
                  value={formData.pace_min_km}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      case 'strength':
      case 'weightlifting':
      case 'powerlifting':
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-3">Strength Training Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Session Type
                </label>
                <select
                  name="strength_session_type"
                  value={formData.strength_session_type}
                  onChange={handleInputChange}
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                >
                  <option value="weights">Weights</option>
                  <option value="bodyweight">Bodyweight</option>
                  <option value="plyometrics">Plyometrics</option>
                  <option value="circuit">Circuit</option>
                  <option value="power">Power/Olympic</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tempo Emphasis
                </label>
                <select
                  name="tempo_emphasis"
                  value={formData.tempo_emphasis}
                  onChange={handleInputChange}
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                >
                  <option value="normal">Normal</option>
                  <option value="explosive">Explosive</option>
                  <option value="eccentric">Eccentric Focus</option>
                  <option value="tempo">Tempo Controlled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Total Volume (kg)
                </label>
                <input
                  type="number"
                  name="total_volume_kg"
                  value={formData.total_volume_kg}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Max Load (kg)
                </label>
                <input
                  type="number"
                  name="max_load_kg"
                  value={formData.max_load_kg}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Exercises Completed
                </label>
                <input
                  type="number"
                  name="exercise_count"
                  value={formData.exercise_count}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Sets Completed
                </label>
                <input
                  type="number"
                  name="sets_completed"
                  value={formData.sets_completed}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      case 'soccer':
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-3">Soccer Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Game Minutes
                </label>
                <input
                  type="number"
                  name="game_minutes"
                  value={formData.game_minutes}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Position
                </label>
                <input
                  type="text"
                  name="position_played"
                  value={formData.position_played}
                  onChange={handleInputChange}
                  placeholder="e.g., Forward, Midfielder"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Total Distance (km)
                </label>
                <input
                  type="number"
                  name="total_distance"
                  value={formData.total_distance}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  High Speed Distance (m)
                </label>
                <input
                  type="number"
                  name="high_speed_distance"
                  value={formData.high_speed_distance}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Sprints/Accelerations
                </label>
                <input
                  type="number"
                  name="accelerations_count"
                  value={formData.accelerations_count}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Passes Completed
                </label>
                <input
                  type="number"
                  name="passes_completed"
                  value={formData.passes_completed}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Shots Taken
                </label>
                <input
                  type="number"
                  name="shots_taken"
                  value={formData.shots_taken}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tackles Made
                </label>
                <input
                  type="number"
                  name="tackles_made"
                  value={formData.tackles_made}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      case 'basketball':
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-3">Basketball Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Game Minutes
                </label>
                <input
                  type="number"
                  name="game_minutes"
                  value={formData.game_minutes}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Position
                </label>
                <input
                  type="text"
                  name="position_played"
                  value={formData.position_played}
                  onChange={handleInputChange}
                  placeholder="e.g., Guard, Forward"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Points Scored
                </label>
                <input
                  type="number"
                  name="points_scored"
                  value={formData.points_scored}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rebounds
                </label>
                <input
                  type="number"
                  name="rebounds"
                  value={formData.rebounds}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Assists
                </label>
                <input
                  type="number"
                  name="assists"
                  value={formData.assists}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Steals
                </label>
                <input
                  type="number"
                  name="steals"
                  value={formData.steals}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Blocks
                </label>
                <input
                  type="number"
                  name="blocks"
                  value={formData.blocks}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  3-Pointers Made
                </label>
                <input
                  type="number"
                  name="three_pointers_made"
                  value={formData.three_pointers_made}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      case 'rugby':
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-3">Rugby Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Game Minutes
                </label>
                <input
                  type="number"
                  name="game_minutes"
                  value={formData.game_minutes}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Position
                </label>
                <input
                  type="text"
                  name="position_played"
                  value={formData.position_played}
                  onChange={handleInputChange}
                  placeholder="e.g., Forward, Back"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Carries
                </label>
                <input
                  type="number"
                  name="carries"
                  value={formData.carries}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Meters Gained
                </label>
                <input
                  type="number"
                  name="meters_gained"
                  value={formData.meters_gained}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Clean Breaks
                </label>
                <input
                  type="number"
                  name="clean_breaks"
                  value={formData.clean_breaks}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Defenders Beaten
                </label>
                <input
                  type="number"
                  name="defenders_beaten"
                  value={formData.defenders_beaten}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tackles Made
                </label>
                <input
                  type="number"
                  name="tackles_made"
                  value={formData.tackles_made}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rucks Hit
                </label>
                <input
                  type="number"
                  name="rucks_hit"
                  value={formData.rucks_hit}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      case 'volleyball':
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-3">Volleyball Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Game Minutes
                </label>
                <input
                  type="number"
                  name="game_minutes"
                  value={formData.game_minutes}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Position
                </label>
                <input
                  type="text"
                  name="position_played"
                  value={formData.position_played}
                  onChange={handleInputChange}
                  placeholder="e.g., Setter, Outside Hitter"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Attacks
                </label>
                <input
                  type="number"
                  name="attacks"
                  value={formData.attacks}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Kills
                </label>
                <input
                  type="number"
                  name="kills"
                  value={formData.kills}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Blocks
                </label>
                <input
                  type="number"
                  name="blocks_vb"
                  value={formData.blocks_vb}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Digs
                </label>
                <input
                  type="number"
                  name="digs"
                  value={formData.digs}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Aces
                </label>
                <input
                  type="number"
                  name="aces"
                  value={formData.aces}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Serve Receptions
                </label>
                <input
                  type="number"
                  name="serve_receptions"
                  value={formData.serve_receptions}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      case 'football': // American Football
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-3">Football Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Game Minutes
                </label>
                <input
                  type="number"
                  name="game_minutes"
                  value={formData.game_minutes}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Position
                </label>
                <input
                  type="text"
                  name="position_played"
                  value={formData.position_played}
                  onChange={handleInputChange}
                  placeholder="e.g., QB, RB, WR"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Plays Participated
                </label>
                <input
                  type="number"
                  name="plays_participated"
                  value={formData.plays_participated}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Yards Gained
                </label>
                <input
                  type="number"
                  name="yards_gained"
                  value={formData.yards_gained}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Touchdowns
                </label>
                <input
                  type="number"
                  name="touchdowns"
                  value={formData.touchdowns}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Receptions
                </label>
                <input
                  type="number"
                  name="receptions"
                  value={formData.receptions}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Tackles
                </label>
                <input
                  type="number"
                  name="tackles_af"
                  value={formData.tackles_af}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Sacks
                </label>
                <input
                  type="number"
                  name="sacks"
                  value={formData.sacks}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      case 'swimming':
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-3">Swimming Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Distance (m)
                </label>
                <input
                  type="number"
                  name="swimming_distance_m"
                  value={formData.swimming_distance_m}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Primary Stroke
                </label>
                <select
                  name="swimming_stroke"
                  value={formData.swimming_stroke}
                  onChange={handleInputChange}
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                >
                  <option value="freestyle">Freestyle</option>
                  <option value="backstroke">Backstroke</option>
                  <option value="breaststroke">Breaststroke</option>
                  <option value="butterfly">Butterfly</option>
                  <option value="im">Individual Medley</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Pace (min/100m)
                </label>
                <input
                  type="number"
                  name="swimming_pace_min_100m"
                  value={formData.swimming_pace_min_100m}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Intervals/Reps
                </label>
                <input
                  type="number"
                  name="swimming_intervals"
                  value={formData.swimming_intervals}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Rest Time (sec)
                </label>
                <input
                  type="number"
                  name="swimming_rest_time"
                  value={formData.swimming_rest_time}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Technique Focus
                </label>
                <select
                  name="swimming_technique_focus"
                  value={formData.swimming_technique_focus}
                  onChange={handleInputChange}
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                >
                  <option value="">None</option>
                  <option value="breathing">Breathing</option>
                  <option value="kick">Kick Technique</option>
                  <option value="pull">Pull Technique</option>
                  <option value="turn">Turns</option>
                  <option value="start">Starts</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'gymnastics':
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-3">Gymnastics Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Apparatus
                </label>
                <select
                  name="apparatus"
                  value={formData.apparatus}
                  onChange={handleInputChange}
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                >
                  <option value="floor">Floor</option>
                  <option value="vault">Vault</option>
                  <option value="pommel">Pommel Horse</option>
                  <option value="rings">Rings</option>
                  <option value="parallel">Parallel Bars</option>
                  <option value="horizontal">Horizontal Bar</option>
                  <option value="beam">Balance Beam</option>
                  <option value="uneven">Uneven Bars</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Routines Practiced
                </label>
                <input
                  type="number"
                  name="routines_practiced"
                  value={formData.routines_practiced}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Elements Attempted
                </label>
                <input
                  type="number"
                  name="elements_attempted"
                  value={formData.elements_attempted}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Elements Completed
                </label>
                <input
                  type="number"
                  name="elements_completed"
                  value={formData.elements_completed}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Landings Stuck
                </label>
                <input
                  type="number"
                  name="landings_stuck"
                  value={formData.landings_stuck}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Avg Execution Score
                </label>
                <input
                  type="number"
                  name="execution_score"
                  value={formData.execution_score}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  max="10"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      case 'tennis':
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-3">Tennis Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Sets Played
                </label>
                <input
                  type="number"
                  name="sets_played"
                  value={formData.sets_played}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Games Won
                </label>
                <input
                  type="number"
                  name="games_won"
                  value={formData.games_won}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Total Points
                </label>
                <input
                  type="number"
                  name="total_points"
                  value={formData.total_points}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Winners
                </label>
                <input
                  type="number"
                  name="winners"
                  value={formData.winners}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Unforced Errors
                </label>
                <input
                  type="number"
                  name="unforced_errors"
                  value={formData.unforced_errors}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  First Serve % (0-100)
                </label>
                <input
                  type="number"
                  name="first_serve_percentage"
                  value={formData.first_serve_percentage}
                  onChange={handleInputChange}
                  min="0"
                  max="100"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Aces
                </label>
                <input
                  type="number"
                  name="aces_tennis"
                  value={formData.aces_tennis}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Double Faults
                </label>
                <input
                  type="number"
                  name="double_faults"
                  value={formData.double_faults}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );

      case 'cricket':
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-3">Cricket Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Role
                </label>
                <select
                  name="position_played"
                  value={formData.position_played}
                  onChange={handleInputChange}
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                >
                  <option value="">Select Role</option>
                  <option value="batter">Batter</option>
                  <option value="bowler">Bowler</option>
                  <option value="all-rounder">All-Rounder</option>
                </select>
              </div>
              
              {/* Batting Metrics */}
              {formData.position_played === 'batter' || formData.position_played === 'all-rounder' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Runs Scored
                    </label>
                    <input
                      type="number"
                      name="runs_scored"
                      value={formData.runs_scored}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Balls Faced
                    </label>
                    <input
                      type="number"
                      name="balls_faced"
                      value={formData.balls_faced}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Fours Hit
                    </label>
                    <input
                      type="number"
                      name="fours_hit"
                      value={formData.fours_hit}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Sixes Hit
                    </label>
                    <input
                      type="number"
                      name="sixes_hit"
                      value={formData.sixes_hit}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                    />
                  </div>
                </>
              ) : null}
              
              {/* Bowling Metrics */}
              {formData.position_played === 'bowler' || formData.position_played === 'all-rounder' ? (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Overs Bowled
                    </label>
                    <input
                      type="number"
                      name="overs_bowled"
                      value={formData.overs_bowled}
                      onChange={handleInputChange}
                      step="0.1"
                      min="0"
                      className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Runs Conceded
                    </label>
                    <input
                      type="number"
                      name="runs_conceded"
                      value={formData.runs_conceded}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Wickets Taken
                    </label>
                    <input
                      type="number"
                      name="wickets_taken"
                      value={formData.wickets_taken}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Maidens Bowled
                    </label>
                    <input
                      type="number"
                      name="maidens_bowled"
                      value={formData.maidens_bowled}
                      onChange={handleInputChange}
                      min="0"
                      className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                    />
                  </div>
                </>
              ) : null}
            </div>
          </div>
        );

      case 'jumping':
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-3">Jumping Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Jump Type
                </label>
                <select
                  name="jump_type"
                  value={formData.jump_type}
                  onChange={handleInputChange}
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                >
                  <option value="vertical">Vertical Jump</option>
                  <option value="broad">Broad Jump</option>
                  <option value="depth">Depth Jump</option>
                  <option value="single-leg">Single Leg</option>
                  <option value="box">Box Jumps</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Number of Jumps
                </label>
                <input
                  type="number"
                  name="jumps_count"
                  value={formData.jumps_count}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Max Jump Height (cm)
                </label>
                <input
                  type="number"
                  name="max_jump_height"
                  value={formData.max_jump_height}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Landing Quality
                </label>
                <select
                  name="landing_quality"
                  value={formData.landing_quality}
                  onChange={handleInputChange}
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                >
                  <option value="">Select</option>
                  <option value="excellent">Excellent</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <h4 className="text-lg font-semibold text-white mb-3">General Training Metrics</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Total Distance (km)
                </label>
                <input
                  type="number"
                  name="distance_km"
                  value={formData.distance_km}
                  onChange={handleInputChange}
                  step="0.1"
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Number of Jumps
                </label>
                <input
                  type="number"
                  name="jumps_count"
                  value={formData.jumps_count}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  High Intensity Efforts
                </label>
                <input
                  type="number"
                  name="sprints_count"
                  value={formData.sprints_count}
                  onChange={handleInputChange}
                  min="0"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Skill/Drill Focus
                </label>
                <input
                  type="text"
                  name="session_name"
                  value={formData.session_name}
                  onChange={handleInputChange}
                  placeholder="e.g., Technical drills, Skills practice"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                />
              </div>
            </div>
          </div>
        );
    }
  };

  const renderSportSelector = () => {
    if (user.role === 'athlete' || selectedAthlete) {
      const athlete = athletesList.find(a => a.id === selectedAthlete);
      if (athlete && athlete.team?.sport) {
        return (
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Sport
            </label>
            <div className="bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3">
              {athlete.team.sport}
            </div>
          </div>
        );
      }
    }

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Sport Type
        </label>
        <select
          value={selectedSport}
          onChange={handleSportTypeChange}
          className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
        >
          <option value="">Select Sport</option>
          <option value="running">Running/Track</option>
          <option value="strength">Strength Training</option>
          <option value="soccer">Soccer</option>
          <option value="basketball">Basketball</option>
          <option value="rugby">Rugby</option>
          <option value="hockey">Hockey/Ice Hockey</option>
          <option value="football">American Football</option>
          <option value="volleyball">Volleyball</option>
          <option value="swimming">Swimming</option>
          <option value="gymnastics">Gymnastics</option>
          <option value="tennis">Tennis</option>
          <option value="cricket">Cricket</option>
          <option value="jumping">Jumping/Plyometrics</option>
          <option value="wrestling">Wrestling</option>
          <option value="martial-arts">Martial Arts</option>
          <option value="cycling">Cycling</option>
          <option value="rowing">Rowing</option>
          <option value="baseball">Baseball</option>
          <option value="softball">Softball</option>
          <option value="lacrosse">Lacrosse</option>
          <option value="other">Other</option>
        </select>
      </div>
    );
  };

  return (
    <div className="bg-brand-bg-dark border border-slate-800 rounded-xl p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Log Training Session</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white"
          >
            ✕
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit}>
        {renderAthleteSelector()}

        {/* Sport Selector */}
        {renderSportSelector()}

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-6 border-b border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
              activeTab === 'general'
                ? 'bg-brand-cyan/20 text-brand-cyan border-b-2 border-brand-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            General Info
          </button>
          {selectedSport && (
            <button
              type="button"
              onClick={() => setActiveTab('sport')}
              className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
                activeTab === 'sport'
                  ? 'bg-brand-cyan/20 text-brand-cyan border-b-2 border-brand-cyan'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {selectedSport.charAt(0).toUpperCase() + selectedSport.slice(1)} Metrics
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveTab('feedback')}
            className={`px-4 py-2 font-medium rounded-t-lg transition-colors ${
              activeTab === 'feedback'
                ? 'bg-brand-cyan/20 text-brand-cyan border-b-2 border-brand-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Post-Session Feedback
          </button>
        </div>

        {/* General Info Tab */}
        {activeTab === 'general' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleInputChange}
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Session Type *
                </label>
                <select
                  name="session_type"
                  value={formData.session_type}
                  onChange={handleInputChange}
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                  required
                >
                  <option value="training">Training</option>
                  <option value="match">Match/Game</option>
                  <option value="recovery">Recovery</option>
                  <option value="testing">Testing</option>
                  <option value="skills">Skills Practice</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Session Name
              </label>
              <input
                type="text"
                name="session_name"
                value={formData.session_name}
                onChange={handleInputChange}
                placeholder="e.g., Monday Strength Training, Friendly Match, Technical Drills"
                className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Duration (minutes) *
                </label>
                <input
                  type="number"
                  name="duration_minutes"
                  value={formData.duration_minutes}
                  onChange={handleInputChange}
                  min="0"
                  max="300"
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  RPE (Rate of Perceived Exertion) *
                  <span className="text-xs text-slate-500 ml-2">1-10 scale</span>
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    name="perceived_exertion"
                    value={formData.perceived_exertion}
                    onChange={handleInputChange}
                    min="1"
                    max="10"
                    step="1"
                    className="flex-1"
                  />
                  <span className="text-white font-semibold min-w-[2rem] text-center">
                    {formData.perceived_exertion}
                  </span>
                </div>
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>1 (Very Easy)</span>
                  <span>10 (Maximal)</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Sport-Specific Tab */}
        {activeTab === 'sport' && selectedSport && renderSportSpecificFields()}

        {/* Post-Session Feedback Tab */}
        {activeTab === 'feedback' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Fatigue Level (1-5)
                </label>
                <select
                  name="fatigue_level"
                  value={formData.fatigue_level}
                  onChange={handleInputChange}
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                >
                  <option value="">Select</option>
                  <option value="1">1 - Very Fresh</option>
                  <option value="2">2 - Fresh</option>
                  <option value="3">3 - Normal</option>
                  <option value="4">4 - Tired</option>
                  <option value="5">5 - Exhausted</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Muscle Soreness (1-5)
                </label>
                <select
                  name="muscle_soreness_post"
                  value={formData.muscle_soreness_post}
                  onChange={handleInputChange}
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                >
                  <option value="">Select</option>
                  <option value="1">1 - None</option>
                  <option value="2">2 - Mild</option>
                  <option value="3">3 - Moderate</option>
                  <option value="4">4 - High</option>
                  <option value="5">5 - Severe</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Motivation (1-5)
                </label>
                <select
                  name="motivation_post"
                  value={formData.motivation_post}
                  onChange={handleInputChange}
                  className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                >
                  <option value="">Select</option>
                  <option value="1">1 - Very Low</option>
                  <option value="2">2 - Low</option>
                  <option value="3">3 - Normal</option>
                  <option value="4">4 - High</option>
                  <option value="5">5 - Very High</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Notes
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows="4"
                placeholder="Additional notes about the session, technique focus, equipment used, weather conditions, etc."
                className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              />
            </div>
          </div>
        )}

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-slate-800">
          <div className="text-sm text-slate-400">
            {selectedSport && (
              <span>Recording for {selectedSport.charAt(0).toUpperCase() + selectedSport.slice(1)}</span>
            )}
          </div>
          
          <div className="flex space-x-3">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Training Session'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default WorkloadForm;