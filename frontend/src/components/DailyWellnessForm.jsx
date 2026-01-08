import React, { useState, useEffect } from 'react';
import { wellness } from '../services/wellness';

const DailyWellnessForm = ({ user, onSuccess }) => {
  const [formData, setFormData] = useState({
    sleep_hours: '',
    sleep_quality: '',
    stress_level: '',
    muscle_soreness: '',
    nutrition_quality: '',
    mood: '',
    energy_level: '',
    motivation_level: '',
    previous_session_rpe: '',
    previous_session_duration: '',
    notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [todayEntry, setTodayEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkTodaySubmission();
  }, []);

  const checkTodaySubmission = async () => {
    try {
      setLoading(true);
      const response = await wellness.getToday();
      if (response.data.success) {
        setHasSubmittedToday(response.data.has_submitted);
        setTodayEntry(response.data.entry);
        if (response.data.entry) {
          // Pre-fill form with existing entry for editing
          setFormData({
            sleep_hours: response.data.entry.sleep_hours || '',
            sleep_quality: response.data.entry.sleep_quality || '',
            stress_level: response.data.entry.stress_level || '',
            muscle_soreness: response.data.entry.muscle_soreness || '',
            nutrition_quality: response.data.entry.nutrition_quality || '',
            mood: response.data.entry.mood || '',
            energy_level: response.data.entry.energy_level || '',
            motivation_level: response.data.entry.motivation_level || '',
            previous_session_rpe: response.data.entry.previous_session_rpe || '',
            previous_session_duration: response.data.entry.previous_session_duration || '',
            notes: response.data.entry.notes || ''
          });
        }
      }
    } catch (err) {
      console.error('Error checking today\'s submission:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? null : value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSliderChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: parseInt(value)
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Required fields
    const requiredFields = ['sleep_hours', 'sleep_quality', 'stress_level', 'muscle_soreness', 
                           'nutrition_quality', 'mood', 'energy_level', 'motivation_level'];
    
    for (const field of requiredFields) {
      if (formData[field] === '' || formData[field] === null) {
        newErrors[field] = 'This field is required';
      }
    }

    // Validate ranges
    if (formData.sleep_hours && (formData.sleep_hours < 0 || formData.sleep_hours > 24)) {
      newErrors.sleep_hours = 'Sleep hours must be between 0 and 24';
    }

    const scaleFields = ['sleep_quality', 'stress_level', 'muscle_soreness', 'nutrition_quality', 
                        'mood', 'energy_level', 'motivation_level'];
    
    for (const field of scaleFields) {
      if (formData[field] && (formData[field] < 1 || formData[field] > 5)) {
        newErrors[field] = 'Value must be between 1 and 5';
      }
    }

    if (formData.previous_session_rpe && (formData.previous_session_rpe < 1 || formData.previous_session_rpe > 10)) {
      newErrors.previous_session_rpe = 'RPE must be between 1 and 10';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      let response;
      if (hasSubmittedToday && todayEntry) {
        // Update existing entry
        response = await wellness.updateEntry(todayEntry.id, formData);
      } else {
        // Create new entry
        response = await wellness.submitDailyCheck(formData);
      }
      
      if (response.data.success) {
        setHasSubmittedToday(true);
        setTodayEntry(response.data.entry);
        if (onSuccess) {
          onSuccess(response.data.entry);
        }
        alert(hasSubmittedToday ? 'Wellness check updated!' : 'Wellness check submitted successfully!');
      }
    } catch (err) {
      console.error('Error submitting wellness check:', err);
      if (err.response?.data?.message) {
        setErrors({ general: err.response.data.message });
      } else {
        setErrors({ general: 'Failed to submit wellness check. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSlider = (label, name, min, max, step = 1) => {
    const value = formData[name] || min;
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-slate-300">
            {label}
          </label>
          <span className="text-sm font-semibold text-white bg-slate-800 px-2 py-1 rounded">
            {value}
          </span>
        </div>
        <input
          type="range"
          name={name}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => handleSliderChange(name, e.target.value)}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-cyan"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>{min}</span>
          <span>{max}</span>
        </div>
        {errors[name] && (
          <p className="text-sm text-red-400 mt-1">{errors[name]}</p>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-3">
          {hasSubmittedToday ? 'Update Today\'s Wellness Check' : 'Daily Wellness Check'}
        </h2>
        <p className="text-slate-400">
          {hasSubmittedToday 
            ? 'Update your wellness metrics for today'
            : 'Submit your daily wellness metrics to track your readiness'
          }
        </p>
        <div className="mt-4 inline-flex items-center px-4 py-2 bg-slate-800 rounded-lg">
          <span className="text-slate-400 mr-2">Date:</span>
          <span className="text-white font-semibold">{new Date().toLocaleDateString()}</span>
        </div>
      </div>

      {/* Form */}
      <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-8">
        {errors.general && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              {errors.general}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Sleep Section */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <span className="mr-3">😴</span> Sleep Quality
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Sleep Hours *
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="sleep_hours"
                    value={formData.sleep_hours}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                    placeholder="7.5"
                    step="0.5"
                    min="0"
                    max="24"
                    required
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                    hours
                  </div>
                </div>
                {errors.sleep_hours && (
                  <p className="mt-2 text-sm text-red-400">{errors.sleep_hours}</p>
                )}
              </div>
              <div>
                {renderSlider('Sleep Quality (1-5) *', 'sleep_quality', 1, 5)}
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>Poor</span>
                  <span>Excellent</span>
                </div>
              </div>
            </div>
          </div>

          {/* Physical & Mental State */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <span className="mr-3">💪</span> Physical & Mental State
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {renderSlider('Stress Level (1-5) *', 'stress_level', 1, 5)}
              {renderSlider('Muscle Soreness (1-5) *', 'muscle_soreness', 1, 5)}
              {renderSlider('Nutrition Quality (1-5) *', 'nutrition_quality', 1, 5)}
              {renderSlider('Mood (1-5) *', 'mood', 1, 5)}
              {renderSlider('Energy Level (1-5) *', 'energy_level', 1, 5)}
              {renderSlider('Motivation Level (1-5) *', 'motivation_level', 1, 5)}
            </div>
          </div>

          {/* Previous Session */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <span className="mr-3">🏋️</span> Previous Training Session
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                {renderSlider('Session RPE (1-10)', 'previous_session_rpe', 1, 10)}
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>Very Light</span>
                  <span>Maximum Effort</span>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Session Duration (minutes)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    name="previous_session_duration"
                    value={formData.previous_session_duration}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                    placeholder="60"
                    min="0"
                    max="300"
                  />
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400">
                    min
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <span className="mr-3">📝</span> Additional Notes
            </h3>
            <div>
              <textarea
                name="notes"
                value={formData.notes || ''}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan resize-none"
                placeholder="Any additional notes about how you're feeling, injuries, or other relevant information..."
              />
            </div>
          </div>

          {/* Readiness Preview */}
          <div className="bg-gradient-to-r from-brand-bg-light to-brand-bg-light/80 border border-brand-border rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Readiness Score Preview</h3>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-slate-400 text-sm">Estimated Readiness</p>
                <p className="text-4xl font-bold text-white">
                  {(() => {
                    // Simple readiness calculation (same as backend)
                    const scores = [
                      formData.sleep_quality,
                      formData.stress_level,
                      formData.muscle_soreness,
                      formData.nutrition_quality,
                      formData.mood,
                      formData.energy_level,
                      formData.motivation_level
                    ].filter(s => s !== null && s !== '');
                    
                    if (scores.length === 0) return '--';
                    
                    const adjustedScores = scores.map((score, i) => {
                      if ([1, 2].includes(i)) return 6 - score; // Invert stress and soreness
                      return score;
                    });
                    
                    const avgScore = adjustedScores.reduce((a, b) => a + b, 0) / adjustedScores.length;
                    return Math.round(avgScore * 2);
                  })()}/10
                </p>
              </div>
              <div className="w-24 h-24 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-full flex items-center justify-center">
                <span className="text-2xl font-bold text-white">💪</span>
              </div>
            </div>
            <p className="text-slate-400 text-sm mt-4">
              This score helps coaches monitor your readiness for training.
            </p>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center pt-6">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-8 py-4 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark hover:from-brand-cyan-dark hover:to-brand-cyan text-white font-bold rounded-xl transition-all duration-200 text-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {hasSubmittedToday ? 'Updating...' : 'Submitting...'}
                </>
              ) : (
                <>
                  {hasSubmittedToday ? 'Update Wellness Check' : 'Submit Daily Wellness Check'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Legend */}
      <div className="mt-8 bg-brand-bg-light border border-brand-border rounded-xl p-6">
        <h4 className="text-lg font-bold text-white mb-4">Wellness Scale Guide</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-sm font-medium text-white mb-2">1 - Very Low</p>
            <p className="text-sm text-slate-400">Poor sleep, high stress, significant soreness, etc.</p>
          </div>
          <div>
            <p className="text-sm font-medium text-white mb-2">3 - Average</p>
            <p className="text-sm text-slate-400">Normal levels, typical day, moderate recovery needed</p>
          </div>
          <div>
            <p className="text-sm font-medium text-white mb-2">5 - Excellent</p>
            <p className="text-sm text-slate-400">Great sleep, low stress, well recovered, ready to perform</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DailyWellnessForm;