import React, { useState, useEffect } from 'react';
import { performance } from '../services/performance';
import { athletes } from '../services/athletes';

const PerformanceTestForm = ({ user, onSuccess }) => {
  const [formData, setFormData] = useState({
    athlete_id: '',
    test_date: new Date().toISOString().split('T')[0],
    test_type: 'strength',
    notes: ''
  });

  const [coachAthletes, setCoachAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeCategory, setActiveCategory] = useState('anthropometric');

  // Test type categories
  const testCategories = [
    { id: 'anthropometric', label: 'Anthropometric', icon: '📏' },
    { id: 'strength', label: 'Strength', icon: '💪' },
    { id: 'speed', label: 'Speed', icon: '⚡' },
    { id: 'agility', label: 'Agility', icon: '🔄' },
    { id: 'power', label: 'Power', icon: '🚀' },
    { id: 'endurance', label: 'Endurance', icon: '🏃' },
    { id: 'flexibility', label: 'Flexibility', icon: '🧘' }
  ];

  // Field definitions for each category
  const categoryFields = {
    anthropometric: [
      { name: 'height', label: 'Height (cm)', type: 'number', step: '0.1', min: '100', max: '250' },
      { name: 'weight', label: 'Weight (kg)', type: 'number', step: '0.1', min: '30', max: '200' },
      { name: 'body_fat_percentage', label: 'Body Fat %', type: 'number', step: '0.1', min: '3', max: '50' }
    ],
    strength: [
      { name: 'bench_press_1rm', label: 'Bench Press 1RM (kg)', type: 'number', step: '0.5', min: '0' },
      { name: 'squat_1rm', label: 'Squat 1RM (kg)', type: 'number', step: '0.5', min: '0' },
      { name: 'deadlift_1rm', label: 'Deadlift 1RM (kg)', type: 'number', step: '0.5', min: '0' },
      { name: 'pull_ups_max', label: 'Max Pull-ups', type: 'number', min: '0', max: '100' },
      { name: 'push_ups_1min', label: 'Push-ups (1min)', type: 'number', min: '0', max: '100' },
      { name: 'sit_ups_2min', label: 'Sit-ups (2min)', type: 'number', min: '0', max: '200' }
    ],
    speed: [
      { name: 'sprint_10m', label: '10m Sprint (s)', type: 'number', step: '0.01', min: '1', max: '5' },
      { name: 'sprint_20m', label: '20m Sprint (s)', type: 'number', step: '0.01', min: '2', max: '10' },
      { name: 'sprint_40m', label: '40m Sprint (s)', type: 'number', step: '0.01', min: '4', max: '15' }
    ],
    agility: [
      { name: 'agility_t_test', label: 'T-Test (s)', type: 'number', step: '0.01', min: '5', max: '20' },
      { name: 'agility_505', label: '5-0-5 Agility (s)', type: 'number', step: '0.01', min: '1', max: '10' },
      { name: 'illinois_agility', label: 'Illinois Agility (s)', type: 'number', step: '0.01', min: '10', max: '30' }
    ],
    power: [
      { name: 'vertical_jump', label: 'Vertical Jump (cm)', type: 'number', step: '0.1', min: '0', max: '150' },
      { name: 'broad_jump', label: 'Broad Jump (cm)', type: 'number', step: '0.1', min: '0', max: '400' },
      { name: 'single_leg_jump_left', label: 'Single Leg Jump Left (cm)', type: 'number', step: '0.1', min: '0', max: '300' },
      { name: 'single_leg_jump_right', label: 'Single Leg Jump Right (cm)', type: 'number', step: '0.1', min: '0', max: '300' }
    ],
    endurance: [
      { name: 'yo_yo_test', label: 'Yo-Yo Test (m)', type: 'number', min: '0', max: '5000' },
      { name: 'bronco_test', label: 'Bronco Test (s)', type: 'number', step: '0.1', min: '0', max: '600' }
    ],
    flexibility: [
      { name: 'sit_and_reach', label: 'Sit & Reach (cm)', type: 'number', step: '0.1', min: '-30', max: '50' },
      { name: 'dorsiflexion_left', label: 'Dorsiflexion Left (cm)', type: 'number', step: '0.1', min: '0', max: '20' },
      { name: 'dorsiflexion_right', label: 'Dorsiflexion Right (cm)', type: 'number', step: '0.1', min: '0', max: '20' }
    ]
  };

  useEffect(() => {
    if (user.role === 'coach') {
      loadCoachAthletes();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadCoachAthletes = async () => {
    try {
      const response = await athletes.getAll();
      if (response.data.success) {
        setCoachAthletes(response.data.athletes);
        if (response.data.athletes.length > 0) {
          setFormData(prev => ({
            ...prev,
            athlete_id: response.data.athletes[0].id
          }));
        }
      }
    } catch (err) {
      console.error('Error loading athletes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleNumericChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? '' : parseFloat(value)
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.athlete_id) {
      newErrors.athlete_id = 'Please select an athlete';
    }
    
    if (!formData.test_date) {
      newErrors.test_date = 'Test date is required';
    }
    
    if (!formData.test_type) {
      newErrors.test_type = 'Test type is required';
    }
    
    // Check if at least one measurement is provided
    const hasMeasurement = Object.keys(formData).some(key => 
      key !== 'athlete_id' && 
      key !== 'test_date' && 
      key !== 'test_type' && 
      key !== 'notes' &&
      formData[key] !== '' &&
      formData[key] !== null
    );
    
    if (!hasMeasurement) {
      newErrors.general = 'Please enter at least one measurement';
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
      // Prepare data - convert empty strings to null for numeric fields
      const submitData = { ...formData };
      Object.keys(submitData).forEach(key => {
        if (submitData[key] === '') {
          submitData[key] = null;
        }
      });

      const response = await performance.createTest(submitData);
      
      if (response.data.success) {
        if (onSuccess) {
          onSuccess(response.data.test);
        }
        alert('Performance test recorded successfully!');
        // Reset form
        setFormData({
          athlete_id: coachAthletes.length > 0 ? coachAthletes[0].id : '',
          test_date: new Date().toISOString().split('T')[0],
          test_type: 'strength',
          notes: ''
        });
        setActiveCategory('anthropometric');
      }
    } catch (err) {
      console.error('Error recording performance test:', err);
      if (err.response?.data?.message) {
        setErrors({ general: err.response.data.message });
      } else {
        setErrors({ general: 'Failed to record performance test. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8 text-center">
        <h2 className="text-3xl font-bold text-white mb-3">Record Performance Test</h2>
        <p className="text-slate-400">
          Enter athlete performance metrics across different categories
        </p>
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
          {/* Basic Information */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center">
              <span className="mr-3">📋</span> Test Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Athlete Selection (Coach only) */}
              {user.role === 'coach' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Athlete *
                  </label>
                  <select
                    name="athlete_id"
                    value={formData.athlete_id}
                    onChange={handleChange}
                    className={`w-full px-4 py-3 bg-slate-800/50 border ${errors.athlete_id ? 'border-red-500' : 'border-slate-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan`}
                  >
                    <option value="">Select athlete</option>
                    {coachAthletes.map((athlete) => (
                      <option key={athlete.id} value={athlete.id}>
                        {athlete.user?.name} {athlete.user?.surname} 
                        {athlete.jersey_number && ` (#${athlete.jersey_number})`}
                      </option>
                    ))}
                  </select>
                  {errors.athlete_id && (
                    <p className="mt-2 text-sm text-red-400">{errors.athlete_id}</p>
                  )}
                </div>
              )}

              {/* Test Date */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Test Date *
                </label>
                <input
                  type="date"
                  name="test_date"
                  value={formData.test_date}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-slate-800/50 border ${errors.test_date ? 'border-red-500' : 'border-slate-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan`}
                />
                {errors.test_date && (
                  <p className="mt-2 text-sm text-red-400">{errors.test_date}</p>
                )}
              </div>

              {/* Test Type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Test Type *
                </label>
                <select
                  name="test_type"
                  value={formData.test_type}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-slate-800/50 border ${errors.test_type ? 'border-red-500' : 'border-slate-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan`}
                >
                  <option value="strength">Strength Assessment</option>
                  <option value="speed">Speed Test</option>
                  <option value="agility">Agility Test</option>
                  <option value="power">Power Test</option>
                  <option value="endurance">Endurance Test</option>
                  <option value="flexibility">Flexibility Test</option>
                  <option value="comprehensive">Comprehensive Assessment</option>
                </select>
                {errors.test_type && (
                  <p className="mt-2 text-sm text-red-400">{errors.test_type}</p>
                )}
              </div>
            </div>
          </div>

          {/* Category Navigation */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Test Categories</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-3">
              {testCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategory(category.id)}
                  className={`flex flex-col items-center justify-center p-4 rounded-xl transition-all ${
                    activeCategory === category.id
                      ? 'bg-gradient-to-br from-brand-cyan to-brand-cyan-dark text-white'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  <span className="text-2xl mb-2">{category.icon}</span>
                  <span className="text-sm font-medium">{category.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Active Category Fields */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
            <div className="flex items-center mb-6">
              <span className="text-2xl mr-3">
                {testCategories.find(c => c.id === activeCategory)?.icon}
              </span>
              <h3 className="text-xl font-bold text-white">
                {testCategories.find(c => c.id === activeCategory)?.label} Measurements
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categoryFields[activeCategory].map((field) => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {field.label}
                  </label>
                  <input
                    type={field.type}
                    name={field.name}
                    value={formData[field.name] || ''}
                    onChange={(e) => handleNumericChange(field.name, e.target.value)}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                    placeholder={`Enter ${field.label.toLowerCase()}`}
                    step={field.step}
                    min={field.min}
                    max={field.max}
                  />
                </div>
              ))}
            </div>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-400">
                Enter measurements for {activeCategory} tests. Leave blank if not tested.
              </p>
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
                value={formData.notes}
                onChange={handleChange}
                rows="4"
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan resize-none"
                placeholder="Any additional notes about the test conditions, athlete performance, or observations..."
              />
            </div>
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
                  Recording Test...
                </>
              ) : 'Record Performance Test'}
            </button>
          </div>
        </form>
      </div>

      {/* Quick Guide */}
      <div className="mt-8 bg-brand-bg-light border border-brand-border rounded-xl p-6">
        <h4 className="text-lg font-bold text-white mb-4">Performance Test Guide</h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-sm font-medium text-white mb-2">Strength Tests</p>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• 1RM = One Rep Max</li>
              <li>• Use proper spotters</li>
              <li>• Record in kilograms</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-white mb-2">Speed & Agility</p>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Record in seconds</li>
              <li>• Use electronic timing</li>
              <li>• Standardize conditions</li>
            </ul>
          </div>
          <div>
            <p className="text-sm font-medium text-white mb-2">Best Practices</p>
            <ul className="text-sm text-slate-400 space-y-1">
              <li>• Test at same time of day</li>
              <li>• Ensure proper warm-up</li>
              <li>• Record environmental conditions</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceTestForm;