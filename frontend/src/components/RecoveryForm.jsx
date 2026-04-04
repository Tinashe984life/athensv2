import React, { useState, useEffect } from 'react';
import { recovery } from '../services/recovery';
import { athletes } from '../services/athletes';
import { injuries } from '../services/injuries';

const RecoveryForm = ({ user, athleteId = null, injuryId = null, onSuccess, onClose }) => {
  const [loading, setLoading] = useState(false);
  const [loadingInjuries, setLoadingInjuries] = useState(false);
  const [athletesList, setAthletesList] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(athleteId);
  const [athleteInjuries, setAthleteInjuries] = useState([]);
  const [showExerciseLibrary, setShowExerciseLibrary] = useState(false);
  const [exerciseLibrary, setExerciseLibrary] = useState([]);
  const [selectedExercises, setSelectedExercises] = useState([]);
  
  const [formData, setFormData] = useState({
    athlete_id: athleteId || '',
    date: new Date().toISOString().split('T')[0],
    recovery_type: 'active',
    session_name: '',
    duration_minutes: 30,
    stretching: false,
    foam_rolling: false,
    massage: false,
    ice_bath: false,
    compression: false,
    sleep_quality: '',
    nutrition_quality: '',
    hydration_status: '',
    perceived_recovery: 5,
    readiness_improvement: '',
    notes: '',
    
    // Injury-specific fields
    linked_injury_id: injuryId || '',
    body_parts_focused: '',
    recovery_focus: 'general', // 'injury_recovery', 'performance', 'prevention'
    
    // Prehab exercises
    prehab_exercises: []
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

  useEffect(() => {
    if (injuryId) {
      setFormData(prev => ({ ...prev, linked_injury_id: injuryId }));
    }
  }, [injuryId]);

  useEffect(() => {
    if (selectedAthlete) {
      loadAthleteInjuries(selectedAthlete);
    }
  }, [selectedAthlete]);

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

  const loadAthleteInjuries = async (athleteId) => {
    try {
      setLoadingInjuries(true);
      const response = await injuries.getAll({
        athlete_id: athleteId,
        status: 'active'
      });
      
      if (response.data.success) {
        setAthleteInjuries(response.data.injuries);
        
        // If there's only one active injury, auto-select it
        if (response.data.injuries.length === 1 && !formData.linked_injury_id) {
          setFormData(prev => ({ 
            ...prev, 
            linked_injury_id: response.data.injuries[0].id,
            body_parts_focused: response.data.injuries[0].body_part
          }));
        }
      }
    } catch (err) {
      console.error('Error loading athlete injuries:', err);
    } finally {
      setLoadingInjuries(false);
    }
  };

  const loadExerciseLibrary = async () => {
    try {
      const response = await recovery.getExerciseLibrary();
      if (response.success) {
        setExerciseLibrary(response.exercise_library);
      }
    } catch (err) {
      console.error('Error loading exercise library:', err);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // If selecting an injury, auto-fill body part
    if (name === 'linked_injury_id' && value) {
      const selectedInjury = athleteInjuries.find(injury => injury.id === value);
      if (selectedInjury) {
        setFormData(prev => ({
          ...prev,
          body_parts_focused: selectedInjury.body_part
        }));
      }
    }
  };

  const handleExerciseSelect = (exercise) => {
    if (selectedExercises.some(e => e.id === exercise.id)) {
      // Remove if already selected
      setSelectedExercises(prev => prev.filter(e => e.id !== exercise.id));
    } else {
      // Add exercise with default sets/reps
      setSelectedExercises(prev => [...prev, {
        ...exercise,
        sets: 3,
        reps: '10-12',
        notes: ''
      }]);
    }
  };

  const handleExerciseUpdate = (exerciseId, field, value) => {
    setSelectedExercises(prev => 
      prev.map(exercise => 
        exercise.id === exerciseId 
          ? { ...exercise, [field]: value }
          : exercise
      )
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const submissionData = {
        ...formData,
        duration_minutes: parseInt(formData.duration_minutes) || 0,
        sleep_quality: formData.sleep_quality ? parseInt(formData.sleep_quality) : null,
        nutrition_quality: formData.nutrition_quality ? parseInt(formData.nutrition_quality) : null,
        hydration_status: formData.hydration_status ? parseInt(formData.hydration_status) : null,
        perceived_recovery: parseInt(formData.perceived_recovery) || 0,
        readiness_improvement: formData.readiness_improvement ? parseInt(formData.readiness_improvement) : null,
      };

      // Add selected exercises if any
      if (selectedExercises.length > 0) {
        submissionData.prehab_exercises = selectedExercises.map(exercise => ({
          name: exercise.name,
          description: exercise.description,
          sets: exercise.sets,
          reps: exercise.reps,
          equipment: exercise.equipment,
          notes: exercise.notes
        }));
      } else {
        delete submissionData.prehab_exercises;
      }

      const response = await recovery.createRecoverySession(submissionData);
      
      if (response.success) {
        if (onSuccess) onSuccess(response.session);
        if (onClose) onClose();
        
        // Reset form
        setFormData({
          athlete_id: athleteId || '',
          date: new Date().toISOString().split('T')[0],
          recovery_type: 'active',
          session_name: '',
          duration_minutes: 30,
          stretching: false,
          foam_rolling: false,
          massage: false,
          ice_bath: false,
          compression: false,
          sleep_quality: '',
          nutrition_quality: '',
          hydration_status: '',
          perceived_recovery: 5,
          readiness_improvement: '',
          notes: '',
          linked_injury_id: injuryId || '',
          body_parts_focused: '',
          recovery_focus: 'general',
          prehab_exercises: []
        });
        setSelectedExercises([]);
      }
    } catch (err) {
      console.error('Error creating recovery session:', err);
      alert('Error creating recovery session. Please try again.');
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
              {athlete.user.name} {athlete.user.surname} - {athlete.team?.name || 'No Team'}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderInjurySelector = () => {
    if (!selectedAthlete) return null;

    if (loadingInjuries) {
      return (
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Link to Injury
          </label>
          <div className="bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-center">
            <span className="text-slate-400">Loading injuries...</span>
          </div>
        </div>
      );
    }

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Link to Injury (Optional)
        </label>
        <select
          name="linked_injury_id"
          value={formData.linked_injury_id}
          onChange={handleInputChange}
          className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
        >
          <option value="">No specific injury (General Recovery)</option>
          <option value="prevention">Injury Prevention (No specific injury)</option>
          {athleteInjuries.map(injury => (
            <option key={injury.id} value={injury.id}>
              {injury.injury_type} - {injury.body_part} ({injury.severity})
            </option>
          ))}
        </select>
        
        {formData.linked_injury_id && formData.linked_injury_id !== 'prevention' && (
          <div className="mt-2 p-3 bg-slate-800/50 rounded-lg">
            <p className="text-sm text-slate-400">Focused on: {formData.body_parts_focused}</p>
            {athleteInjuries.find(i => i.id === formData.linked_injury_id)?.treatment_plan && (
              <p className="text-xs text-slate-500 mt-1">
                Treatment plan includes: {athleteInjuries.find(i => i.id === formData.linked_injury_id).treatment_plan.substring(0, 100)}...
              </p>
            )}
          </div>
        )}

        {athleteInjuries.length === 0 && (
          <p className="text-xs text-slate-500 mt-2">
            No active injuries found for this athlete. Consider logging an injury first or select "Injury Prevention".
          </p>
        )}
      </div>
    );
  };

  const renderExerciseLibraryModal = () => {
    if (!showExerciseLibrary) return null;

    const categories = Object.keys(exerciseLibrary);

    return (
      <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 overflow-y-auto">
        <div className="bg-brand-bg-dark border border-slate-800 rounded-2xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Prehab Exercise Library</h3>
            <button
              onClick={() => setShowExerciseLibrary(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>

          <div className="space-y-6">
            {categories.map(category => (
              <div key={category} className="border border-slate-800 rounded-xl p-4">
                <h4 className="text-lg font-semibold text-white mb-3 capitalize">
                  {category.replace('_', ' ')} Exercises
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {exerciseLibrary[category]?.map(exercise => {
                    const isSelected = selectedExercises.some(e => e.id === exercise.id);
                    return (
                      <div
                        key={exercise.id}
                        className={`border rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected 
                            ? 'border-brand-cyan bg-brand-cyan/10' 
                            : 'border-slate-700 hover:border-slate-600'
                        }`}
                        onClick={() => handleExerciseSelect(exercise)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <h5 className="font-medium text-white">{exercise.name}</h5>
                          {isSelected && (
                            <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">Selected</span>
                          )}
                        </div>
                        <p className="text-sm text-slate-400 mb-2">{exercise.description}</p>
                        <div className="flex justify-between text-xs text-slate-500">
                          <span>Sets: {exercise.sets}</span>
                          <span>Reps: {exercise.reps}</span>
                          <span>{exercise.equipment}</span>
                        </div>
                        {isSelected && (
                          <div className="mt-3 pt-3 border-t border-slate-700">
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-slate-400">Sets</label>
                                <input
                                  type="number"
                                  min="1"
                                  max="10"
                                  value={selectedExercises.find(e => e.id === exercise.id)?.sets || exercise.sets}
                                  onChange={(e) => handleExerciseUpdate(exercise.id, 'sets', e.target.value)}
                                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-slate-400">Reps</label>
                                <input
                                  type="text"
                                  value={selectedExercises.find(e => e.id === exercise.id)?.reps || exercise.reps}
                                  onChange={(e) => handleExerciseUpdate(exercise.id, 'reps', e.target.value)}
                                  className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                                />
                              </div>
                            </div>
                            <div className="mt-2">
                              <label className="text-xs text-slate-400">Notes</label>
                              <textarea
                                value={selectedExercises.find(e => e.id === exercise.id)?.notes || ''}
                                onChange={(e) => handleExerciseUpdate(exercise.id, 'notes', e.target.value)}
                                rows="2"
                                className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white text-sm"
                                placeholder="Exercise-specific notes..."
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center mt-6 pt-6 border-t border-slate-800">
            <div className="text-sm text-slate-400">
              {selectedExercises.length > 0 && (
                <span>{selectedExercises.length} exercise(s) selected</span>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={() => setShowExerciseLibrary(false)}
                className="px-4 py-2 border border-slate-700 text-slate-300 hover:text-white rounded-lg"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setShowExerciseLibrary(false)}
                className="px-4 py-2 bg-brand-cyan text-white rounded-lg hover:opacity-90"
              >
                Save Selection
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSelectedExercises = () => {
    if (selectedExercises.length === 0) return null;

    return (
      <div className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <label className="block text-sm font-medium text-slate-300">
            Selected Prehab Exercises
          </label>
          <button
            type="button"
            onClick={() => setShowExerciseLibrary(true)}
            className="text-sm text-brand-cyan hover:text-brand-cyan/80"
          >
            Edit Selection
          </button>
        </div>
        <div className="space-y-2">
          {selectedExercises.map((exercise, index) => (
            <div key={index} className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-white">{exercise.name}</h4>
                  <p className="text-xs text-slate-400">{exercise.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedExercises(prev => prev.filter((_, i) => i !== index))}
                  className="text-slate-500 hover:text-red-400"
                >
                  ✕
                </button>
              </div>
              <div className="flex items-center space-x-4 mt-2 text-sm text-slate-300">
                <span>Sets: {exercise.sets}</span>
                <span>Reps: {exercise.reps}</span>
                <span>Equipment: {exercise.equipment}</span>
              </div>
              {exercise.notes && (
                <p className="text-xs text-slate-500 mt-2">Notes: {exercise.notes}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="bg-brand-bg-dark border border-slate-800 rounded-xl p-6 max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Log Recovery Session</h2>
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
          {renderInjurySelector()}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                Recovery Type *
              </label>
              <select
                name="recovery_type"
                value={formData.recovery_type}
                onChange={handleInputChange}
                className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                required
              >
                <option value="active">Active Recovery</option>
                <option value="passive">Passive Recovery</option>
                <option value="prehab">Prehab/Injury Prevention</option>
                <option value="regeneration">Regeneration</option>
                <option value="rehabilitation">Rehabilitation</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Session Name
              </label>
              <input
                type="text"
                name="session_name"
                value={formData.session_name}
                onChange={handleInputChange}
                placeholder="e.g., Light Jog, Shoulder Rehab Session"
                className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              />
            </div>

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
                max="180"
                className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                required
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-3">
              Recovery Modalities
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                { name: 'stretching', label: 'Stretching', icon: '🤸' },
                { name: 'foam_rolling', label: 'Foam Rolling', icon: '🧘' },
                { name: 'massage', label: 'Massage', icon: '💆' },
                { name: 'ice_bath', label: 'Ice Bath', icon: '🧊' },
                { name: 'compression', label: 'Compression', icon: '🩹' }
              ].map(modality => (
                <label key={modality.name} className={`flex flex-col items-center p-3 border rounded-lg cursor-pointer transition-all ${
                  formData[modality.name] 
                    ? 'border-brand-cyan bg-brand-cyan/10' 
                    : 'border-slate-700 hover:border-slate-600'
                }`}>
                  <input
                    type="checkbox"
                    name={modality.name}
                    checked={formData[modality.name]}
                    onChange={handleInputChange}
                    className="hidden"
                  />
                  <span className="text-2xl mb-1">{modality.icon}</span>
                  <span className="text-slate-300 text-xs text-center">{modality.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Prehab Exercise Selection */}
          {(formData.recovery_type === 'prehab' || formData.recovery_type === 'rehabilitation') && (
            <div className="mb-4">
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-medium text-slate-300">
                  Prehab Exercises
                </label>
                <button
                  type="button"
                  onClick={() => setShowExerciseLibrary(true)}
                  className="px-3 py-1 text-sm bg-brand-cyan/20 text-brand-cyan rounded-lg hover:bg-brand-cyan/30"
                >
                  Browse Exercises
                </button>
              </div>
              {selectedExercises.length === 0 ? (
                <div className="bg-slate-800/30 border border-slate-700 rounded-lg p-6 text-center">
                  <p className="text-slate-400 mb-2">No exercises selected</p>
                  <p className="text-xs text-slate-500">
                    Click "Browse Exercises" to add prehab exercises for injury prevention or rehabilitation.
                  </p>
                </div>
              ) : (
                renderSelectedExercises()
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Sleep Quality (1-5)
              </label>
              <select
                name="sleep_quality"
                value={formData.sleep_quality}
                onChange={handleInputChange}
                className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              >
                <option value="">Select</option>
                <option value="1">1 - Very Poor</option>
                <option value="2">2 - Poor</option>
                <option value="3">3 - Average</option>
                <option value="4">4 - Good</option>
                <option value="5">5 - Excellent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Nutrition Quality (1-5)
              </label>
              <select
                name="nutrition_quality"
                value={formData.nutrition_quality}
                onChange={handleInputChange}
                className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              >
                <option value="">Select</option>
                <option value="1">1 - Very Poor</option>
                <option value="2">2 - Poor</option>
                <option value="3">3 - Average</option>
                <option value="4">4 - Good</option>
                <option value="5">5 - Excellent</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Hydration Status (1-5)
              </label>
              <select
                name="hydration_status"
                value={formData.hydration_status}
                onChange={handleInputChange}
                className="w-full bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
              >
                <option value="">Select</option>
                <option value="1">1 - Very Dehydrated</option>
                <option value="2">2 - Dehydrated</option>
                <option value="3">3 - Average</option>
                <option value="4">4 - Well Hydrated</option>
                <option value="5">5 - Optimally Hydrated</option>
              </select>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Perceived Recovery (1-10)
              <span className="text-xs text-slate-500 ml-2">How recovered do you feel?</span>
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                name="perceived_recovery"
                value={formData.perceived_recovery}
                onChange={handleInputChange}
                min="1"
                max="10"
                step="1"
                className="flex-1"
              />
              <span className="text-white font-semibold min-w-[2rem] text-center">
                {formData.perceived_recovery}
              </span>
            </div>
            <div className="flex justify-between text-xs text-slate-500 mt-1">
              <span>1 (Not Recovered)</span>
              <span>10 (Fully Recovered)</span>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
              placeholder="Additional notes about the recovery session, specific exercises, pain levels, etc."
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
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Recovery Session'}
            </button>
          </div>
        </form>
      </div>

      {renderExerciseLibraryModal()}
    </>
  );
};

export default RecoveryForm;