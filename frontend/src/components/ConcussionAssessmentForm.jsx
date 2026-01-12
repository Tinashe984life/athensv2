import React, { useState } from 'react';
import { concussion } from '../services/concussion';

const ConcussionAssessmentForm = ({ injury, user, onSuccess, onClose }) => {
  const [formData, setFormData] = useState({
    assessment_date: new Date().toISOString().split('T')[0],
    headache: 0,
    pressure_in_head: 0,
    neck_pain: 0,
    nausea_vomiting: 0,
    dizziness: 0,
    blurred_vision: 0,
    balance_problems: 0,
    sensitivity_to_light: 0,
    sensitivity_to_noise: 0,
    feeling_slowed_down: 0,
    feeling_mental_fog: 0,
    difficulty_concentrating: 0,
    difficulty_remembering: 0,
    fatigue_low_energy: 0,
    confusion: 0,
    drowsiness: 0,
    trouble_falling_asleep: 0,
    more_emotional: 0,
    irritability: 0,
    sadness: 0,
    nervous_anxious: 0,
    feeling_like_in_a_fog: 0,
    orientation_score: 5,
    immediate_memory_score: 15,
    concentration_score: 5,
    balance_score: 0,
    tandem_gait_time: 0,
    clinical_notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('symptoms');

  const symptomLabels = [
    { key: 'headache', label: 'Headache' },
    { key: 'pressure_in_head', label: 'Pressure in head' },
    { key: 'neck_pain', label: 'Neck pain' },
    { key: 'nausea_vomiting', label: 'Nausea or vomiting' },
    { key: 'dizziness', label: 'Dizziness' },
    { key: 'blurred_vision', label: 'Blurred vision' },
    { key: 'balance_problems', label: 'Balance problems' },
    { key: 'sensitivity_to_light', label: 'Sensitivity to light' },
    { key: 'sensitivity_to_noise', label: 'Sensitivity to noise' },
    { key: 'feeling_slowed_down', label: 'Feeling slowed down' },
    { key: 'feeling_mental_fog', label: 'Feeling like "in a fog"' },
    { key: 'difficulty_concentrating', label: 'Difficulty concentrating' },
    { key: 'difficulty_remembering', label: 'Difficulty remembering' },
    { key: 'fatigue_low_energy', label: 'Fatigue or low energy' },
    { key: 'confusion', label: 'Confusion' },
    { key: 'drowsiness', label: 'Drowsiness' },
    { key: 'trouble_falling_asleep', label: 'Trouble falling asleep' },
    { key: 'more_emotional', label: 'More emotional' },
    { key: 'irritability', label: 'Irritability' },
    { key: 'sadness', label: 'Sadness' },
    { key: 'nervous_anxious', label: 'Nervous or anxious' },
    { key: 'feeling_like_in_a_fog', label: 'Feeling like "in a fog"' }
  ];

  const severityScale = [
    { value: 0, label: 'None' },
    { value: 1, label: 'Mild' },
    { value: 2, label: 'Moderate' },
    { value: 3, label: 'Quite a bit' },
    { value: 4, label: 'Severe' },
    { value: 5, label: 'Very severe' },
    { value: 6, label: 'Unbearable' }
  ];

  const calculateTotalScore = () => {
    let total = 0;
    symptomLabels.forEach(symptom => {
      total += formData[symptom.key] || 0;
    });
    return total;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value === '' ? 0 : parseInt(value)
    }));
  };

  const handleTextAreaChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSymptomChange = (symptomKey, value) => {
    setFormData(prev => ({
      ...prev,
      [symptomKey]: parseInt(value)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submissionData = {
        injury_id: injury.id,
        ...formData,
        total_symptom_score: calculateTotalScore()
      };

      const response = await concussion.createSymptomScore(submissionData);
      
      if (response.data.success) {
        if (onSuccess) {
          onSuccess(response.data.symptom_score);
        }
        if (onClose) onClose();
      }
    } catch (err) {
      console.error('Error saving assessment:', err);
      if (err.response?.data?.message) {
        setErrors({ general: err.response.data.message });
      } else {
        setErrors({ general: 'Failed to save assessment. Please try again.' });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderSymptomSlider = (symptomKey, label) => {
    const value = formData[symptomKey] || 0;
    return (
      <div className="space-y-2 mb-4">
        <div className="flex justify-between items-center">
          <label className="block text-sm font-medium text-slate-300">
            {label}
          </label>
          <span className="text-sm font-semibold text-white bg-slate-800 px-2 py-1 rounded">
            {severityScale[value].label}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max="6"
          step="1"
          value={value}
          onChange={(e) => handleSymptomChange(symptomKey, e.target.value)}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-cyan"
        />
        <div className="flex justify-between text-xs text-slate-500">
          <span>None</span>
          <span>Mild</span>
          <span>Moderate</span>
          <span>Quite a bit</span>
          <span>Severe</span>
          <span>Very severe</span>
          <span>Unbearable</span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">Concussion Symptom Assessment</h2>
            <p className="text-slate-400">SCAT6 Symptom Evaluation</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

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

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setActiveTab('symptoms')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'symptoms'
                ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Symptoms
          </button>
          <button
            onClick={() => setActiveTab('cognitive')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'cognitive'
                ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Cognitive
          </button>
          <button
            onClick={() => setActiveTab('balance')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'balance'
                ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Balance & Gait
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === 'notes'
                ? 'bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
            }`}
          >
            Clinical Notes
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Symptoms Tab */}
          {activeTab === 'symptoms' && (
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-6">Symptom Evaluation (0-6 scale)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {symptomLabels.map((symptom) => (
                  <div key={symptom.key}>
                    {renderSymptomSlider(symptom.key, symptom.label)}
                  </div>
                ))}
              </div>
              
              <div className="mt-8 p-4 bg-slate-800/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-400">Total Symptom Severity Score</p>
                    <p className="text-3xl font-bold text-white">{calculateTotalScore()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-400">Maximum possible</p>
                    <p className="text-xl text-slate-300">132</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Cognitive Tab */}
          {activeTab === 'cognitive' && (
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-6">Cognitive Assessment</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Orientation (0-5)
                  </label>
                  <input
                    type="number"
                    name="orientation_score"
                    value={formData.orientation_score}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                    min="0"
                    max="5"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Score based on: Month, date, day of week, year, time
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Immediate Memory (0-15)
                  </label>
                  <input
                    type="number"
                    name="immediate_memory_score"
                    value={formData.immediate_memory_score}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                    min="0"
                    max="15"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Score based on word recall (5 words, 3 trials)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Concentration (0-5)
                  </label>
                  <input
                    type="number"
                    name="concentration_score"
                    value={formData.concentration_score}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                    min="0"
                    max="5"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Score based on digits backward and months in reverse order
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Balance Tab */}
          {activeTab === 'balance' && (
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-6">Balance & Gait Assessment</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Balance Error Scoring System (BESS) Score (0-30)
                  </label>
                  <input
                    type="number"
                    name="balance_score"
                    value={formData.balance_score}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                    min="0"
                    max="30"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Lower score is better (errors counted across 3 stances)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Tandem Gait Test Time (seconds)
                  </label>
                  <input
                    type="number"
                    name="tandem_gait_time"
                    value={formData.tandem_gait_time}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                    min="0"
                    step="0.1"
                  />
                  <p className="text-xs text-slate-400 mt-2">
                    Time to complete tandem gait test (normal is under 14 seconds)
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Notes Tab */}
          {activeTab === 'notes' && (
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6 mb-6">
              <h3 className="text-xl font-bold text-white mb-6">Clinical Notes & Assessment Date</h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Assessment Date
                  </label>
                  <input
                    type="date"
                    name="assessment_date"
                    value={formData.assessment_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, assessment_date: e.target.value }))}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Clinical Notes
                  </label>
                  <textarea
                    value={formData.clinical_notes}
                    onChange={(e) => handleTextAreaChange('clinical_notes', e.target.value)}
                    rows="6"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan resize-none"
                    placeholder="Additional clinical observations, athlete's reported symptoms, physician recommendations, etc."
                  />
                </div>
              </div>
            </div>
          )}

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
                  Saving Assessment...
                </>
              ) : 'Save Symptom Assessment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ConcussionAssessmentForm;