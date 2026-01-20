import React, { useState, useEffect } from 'react';
import { recovery } from '../services/recovery';
import { athletes } from '../services/athletes';

const PrehabRecommendationForm = ({ user, athleteId = null, onSuccess, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [athletesList, setAthletesList] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(athleteId);
  const [exerciseLibrary, setExerciseLibrary] = useState({});
  const [selectedExercises, setSelectedExercises] = useState([]);
  const [showLibrary, setShowLibrary] = useState(false);

  const [formData, setFormData] = useState({
    athlete_id: athleteId || '',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    recommendation_type: 'injury_prevention',
    body_parts: [],
    focus_area: 'strength',
    exercises: [],
    frequency_per_week: 3,
    estimated_duration_minutes: 30,
    status: 'active',
    notes: ''
  });

  useEffect(() => {
    loadAthletes();
    loadExerciseLibrary();
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

  const loadExerciseLibrary = async () => {
    try {
      const response = await recovery.getExerciseLibrary();
      if (response.data.success) {
        setExerciseLibrary(response.data.exercise_library);
      }
    } catch (err) {
      console.error('Error loading exercise library:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    
    if (type === 'select-multiple') {
      const options = e.target.options;
      const selectedValues = [];
      for (let i = 0; i < options.length; i++) {
        if (options[i].selected) {
          selectedValues.push(options[i].value);
        }
      }
      setFormData(prev => ({ ...prev, [name]: selectedValues }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleBodyPartToggle = (bodyPart) => {
    const currentParts = formData.body_parts || [];
    const newParts = currentParts.includes(bodyPart)
      ? currentParts.filter(part => part !== bodyPart)
      : [...currentParts, bodyPart];
    
    setFormData(prev => ({ ...prev, body_parts: newParts }));
  };

  const addExercise = (exercise) => {
    const exerciseWithDetails = {
      ...exercise,
      sets: 3,
      reps: '10-15',
      tempo: '2-0-2',
      rest: '60s',
      notes: ''
    };
    
    setSelectedExercises(prev => [...prev, exerciseWithDetails]);
    setShowLibrary(false);
  };

  const removeExercise = (index) => {
    setSelectedExercises(prev => prev.filter((_, i) => i !== index));
  };

  const updateExercise = (index, field, value) => {
    const updatedExercises = [...selectedExercises];
    updatedExercises[index] = {
      ...updatedExercises[index],
      [field]: value
    };
    setSelectedExercises(updatedExercises);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedExercises.length === 0) {
      alert('Please add at least one exercise to the plan.');
      return;
    }

    setLoading(true);
    
    try {
      const submissionData = {
        ...formData,
        athlete_id: selectedAthlete,
        exercises: selectedExercises,
        frequency_per_week: parseInt(formData.frequency_per_week) || 3,
        estimated_duration_minutes: parseInt(formData.estimated_duration_minutes) || 30,
        end_date: formData.end_date || null
      };

      const response = await recovery.createPrehabRecommendation(submissionData);
      
      if (response.success) {
        if (onSuccess) onSuccess(response.recommendation);
        if (onClose) onClose();
      }
    } catch (err) {
      console.error('Error creating prehab recommendation:', err);
      alert('Error creating prehab recommendation. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAthleteSelect = (e) => {
    const athleteId = e.target.value;
    setSelectedAthlete(athleteId);
    setFormData(prev => ({ ...prev, athlete_id: athleteId }));
  };

  const renderAthleteSelector = () => {
    if (user.role === 'athlete') {
      const athlete = athletesList.find(a => a.user_id === user.id);
      if (athlete) {
        return (
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Athlete
            </label>
            <div className="bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3">
              {athlete.user.name} {athlete.user.surname}
            </div>
            <input type="hidden" name="athlete_id" value={athlete.id} />
          </div>
        );
      }
    }

    return (
      <div className="mb-6">
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
              {athlete.user.name} {athlete.user.surname} - {athlete.team?.name || 'No Team'}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const bodyParts = [
    'Shoulders', 'Upper Back', 'Lower Back', 'Hips', 'Glutes', 'Hamstrings',
    'Quadriceps', 'Calves', 'Ankles', 'Core', 'Neck', 'Chest'
  ];

  return (
    <div className="bg-brand-bg-dark border border-slate-800 rounded-xl p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-white">Create Prehab/Injury Prevention Plan</h2>
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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Plan Type *
            </label>
            <select
              name="recommendation_type"
              value={formData.recommendation_type}
              onChange={handleInputChange}
              className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              required
            >
              <option value="injury_prevention">Injury Prevention</option>
              <option value="return_to_play">Return to Play</option>
              <option value="performance">Performance Enhancement</option>
              <option value="corrective">Corrective Exercise</option>
              <option value="maintenance">Maintenance</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Focus Area *
            </label>
            <select
              name="focus_area"
              value={formData.focus_area}
              onChange={handleInputChange}
              className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              required
            >
              <option value="strength">Strength</option>
              <option value="mobility">Mobility</option>
              <option value="stability">Stability</option>
              <option value="power">Power</option>
              <option value="endurance">Endurance</option>
              <option value="balance">Balance</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Start Date *
            </label>
            <input
              type="date"
              name="start_date"
              value={formData.start_date}
              onChange={handleInputChange}
              className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              End Date (Optional)
            </label>
            <input
              type="date"
              name="end_date"
              value={formData.end_date}
              onChange={handleInputChange}
              className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Frequency per Week *
            </label>
            <select
              name="frequency_per_week"
              value={formData.frequency_per_week}
              onChange={handleInputChange}
              className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              required
            >
              <option value="1">1 session/week</option>
              <option value="2">2 sessions/week</option>
              <option value="3">3 sessions/week</option>
              <option value="4">4 sessions/week</option>
              <option value="5">5 sessions/week</option>
              <option value="6">6 sessions/week</option>
              <option value="7">Daily</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Estimated Duration (minutes) *
            </label>
            <input
              type="number"
              name="estimated_duration_minutes"
              value={formData.estimated_duration_minutes}
              onChange={handleInputChange}
              min="5"
              max="120"
              className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              required
            />
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-3">
            Target Body Parts
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {bodyParts.map(part => (
              <label key={part} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={formData.body_parts?.includes(part)}
                  onChange={() => handleBodyPartToggle(part)}
                  className="w-4 h-4 text-brand-cyan bg-brand-bg-light border-slate-700 rounded focus:ring-brand-cyan focus:ring-2"
                />
                <span className="text-slate-300 text-sm">{part}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Exercises</h3>
            <button
              type="button"
              onClick={() => setShowLibrary(true)}
              className="px-4 py-2 bg-brand-cyan/20 text-brand-cyan hover:bg-brand-cyan/30 rounded-lg transition-colors"
            >
              + Add from Library
            </button>
          </div>

          {selectedExercises.length === 0 ? (
            <div className="bg-brand-bg-light border border-dashed border-slate-700 rounded-xl p-8 text-center">
              <div className="text-4xl mb-4">🏋️</div>
              <p className="text-slate-400 mb-4">No exercises added yet</p>
              <button
                type="button"
                onClick={() => setShowLibrary(true)}
                className="px-6 py-2 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
              >
                Browse Exercise Library
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {selectedExercises.map((exercise, index) => (
                <div key={index} className="bg-brand-bg-light border border-slate-700 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-white">{exercise.name}</h4>
                      <p className="text-sm text-slate-400">{exercise.description}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs px-2 py-1 bg-slate-800 rounded">{exercise.difficulty}</span>
                        <span className="text-xs px-2 py-1 bg-slate-800 rounded">{exercise.equipment}</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeExercise(index)}
                      className="text-slate-400 hover:text-red-400"
                    >
                      ✕
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Sets</label>
                      <input
                        type="number"
                        value={exercise.sets}
                        onChange={(e) => updateExercise(index, 'sets', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                        min="1"
                        max="10"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Reps</label>
                      <input
                        type="text"
                        value={exercise.reps}
                        onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                        placeholder="e.g., 10-15"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Tempo</label>
                      <input
                        type="text"
                        value={exercise.tempo}
                        onChange={(e) => updateExercise(index, 'tempo', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                        placeholder="e.g., 2-0-2"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Rest</label>
                      <input
                        type="text"
                        value={exercise.rest}
                        onChange={(e) => updateExercise(index, 'rest', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                        placeholder="e.g., 60s"
                      />
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <label className="block text-xs text-slate-400 mb-1">Notes</label>
                    <textarea
                      value={exercise.notes}
                      onChange={(e) => updateExercise(index, 'notes', e.target.value)}
                      rows="2"
                      className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                      placeholder="Execution cues, modifications, etc."
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Notes & Instructions
          </label>
          <textarea
            name="notes"
            value={formData.notes}
            onChange={handleInputChange}
            rows="4"
            placeholder="Additional instructions, progression criteria, special considerations..."
            className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
          />
        </div>

        <div className="flex justify-end space-x-3">
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
            disabled={loading || selectedExercises.length === 0}
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Creating Plan...' : 'Create Prehab Plan'}
          </button>
        </div>
      </form>

      {/* Exercise Library Modal */}
      {showLibrary && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-4xl mt-8 mb-8">
            <div className="bg-brand-bg-dark border border-slate-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-white">Exercise Library</h3>
                <button
                  onClick={() => setShowLibrary(false)}
                  className="text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {Object.entries(exerciseLibrary).map(([category, exercises]) => (
                  <div key={category}>
                    <h4 className="text-lg font-semibold text-white mb-3 capitalize">
                      {category.replace('_', ' ')} Exercises
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {exercises.map(exercise => (
                        <div
                          key={exercise.id}
                          className="bg-brand-bg-light border border-slate-700 rounded-xl p-4 hover:border-brand-cyan/50 transition-colors cursor-pointer"
                          onClick={() => addExercise(exercise)}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-semibold text-white">{exercise.name}</h5>
                            <span className="text-xs px-2 py-1 bg-slate-800 rounded text-slate-300 capitalize">
                              {exercise.difficulty}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 mb-3">{exercise.description}</p>
                          <div className="flex items-center justify-between text-xs text-slate-500">
                            <span>{exercise.equipment}</span>
                            <span>{exercise.sets} sets × {exercise.reps} reps</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t border-slate-800">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowLibrary(false)}
                    className="px-6 py-2 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                  >
                    Close Library
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrehabRecommendationForm;