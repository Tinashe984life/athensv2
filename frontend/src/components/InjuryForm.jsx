import React, { useState, useEffect } from 'react';
import { injuries } from '../services/injuries';
import { athletes } from '../services/athletes';

const InjuryForm = ({ user, onSuccess, injuryToEdit = null, onClose }) => {
  const [formData, setFormData] = useState({
    athlete_id: '',
    injury_type: '',
    body_part: '',
    side: '',
    severity: 'mild',
    date_reported: new Date().toISOString().split('T')[0],
    date_occurred: '',
    injury_context: '',
    injury_context_other: '',
    mechanism: '',
    symptoms: '',
    diagnosis: '',
    treatment_plan: '',
    estimated_recovery_time: '',
    status: 'active',
    notes: '',
    // Add concussion-specific fields
    is_concussion: false,
    loss_of_consciousness: false,
    loc_duration: '',
    post_traumatic_amnesia: false,
    pta_duration: '',
    mechanism_of_concussion: '',
    suspected_concussion: false,
    referred_to_physician: false,
    physician_name: '',
    physician_contact: ''
  });

  const [coachAthletes, setCoachAthletes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});

  // Common injury types and body parts
  const injuryTypes = [
    'Muscle Strain', 'Ligament Sprain', 'Tendonitis', 'Fracture', 'Dislocation',
    'Concussion', 'Contusion', 'Laceration', 'Overuse Injury', 'Stress Fracture',
    'ACL Tear', 'MCL Tear', 'Meniscus Tear', 'Rotator Cuff Injury', 'Shin Splints',
    'Plantar Fasciitis', 'Hamstring Strain', 'Groin Strain', 'Ankle Sprain', 'Other'
  ];

  const bodyParts = [
    'Head', 'Neck', 'Shoulder', 'Upper Arm', 'Elbow', 'Forearm', 'Wrist', 'Hand',
    'Fingers', 'Upper Back', 'Lower Back', 'Chest', 'Abdomen', 'Hip', 'Thigh',
    'Knee', 'Lower Leg', 'Ankle', 'Foot', 'Toes'
  ];

  const severityLevels = [
    { value: 'mild', label: 'Mild', color: 'text-green-400' },
    { value: 'moderate', label: 'Moderate', color: 'text-amber-400' },
    { value: 'severe', label: 'Severe', color: 'text-red-400' }
  ];

  useEffect(() => {
    if (user.role === 'coach') {
      loadCoachAthletes();
    } else if (user.role === 'athlete') {
      loadAthleteData();
    }
  }, [user]);

  useEffect(() => {
    if (injuryToEdit) {
      setFormData({
        athlete_id: injuryToEdit.athlete_id,
        injury_type: injuryToEdit.injury_type || '',
        body_part: injuryToEdit.body_part || '',
        side: injuryToEdit.side || '',
        severity: injuryToEdit.severity || 'mild',
        date_reported: injuryToEdit.date_reported || new Date().toISOString().split('T')[0],
        date_occurred: injuryToEdit.date_occurred || '',
        injury_context: injuryToEdit.injury_context || '',
        injury_context_other: injuryToEdit.injury_context_other || '',
        mechanism: injuryToEdit.mechanism || '',
        symptoms: injuryToEdit.symptoms || '',
        diagnosis: injuryToEdit.diagnosis || '',
        treatment_plan: injuryToEdit.treatment_plan || '',
        estimated_recovery_time: injuryToEdit.estimated_recovery_time || '',
        status: injuryToEdit.status || 'active',
        notes: injuryToEdit.notes || '',
        // Add concussion-specific fields
        is_concussion: injuryToEdit.is_concussion || false,
        loss_of_consciousness: injuryToEdit.loss_of_consciousness || false,
        loc_duration: injuryToEdit.loc_duration || '',
        post_traumatic_amnesia: injuryToEdit.post_traumatic_amnesia || false,
        pta_duration: injuryToEdit.pta_duration || '',
        mechanism_of_concussion: injuryToEdit.mechanism_of_concussion || '',
        suspected_concussion: injuryToEdit.suspected_concussion || false,
        referred_to_physician: injuryToEdit.referred_to_physician || false,
        physician_name: injuryToEdit.physician_name || '',
        physician_contact: injuryToEdit.physician_contact || ''
      });
    }
  }, [injuryToEdit]);

  const loadCoachAthletes = async () => {
    try {
      const response = await athletes.getAll();
      if (response.data.success) {
        setCoachAthletes(response.data.athletes);
        if (response.data.athletes.length > 0 && !formData.athlete_id && !injuryToEdit) {
          setFormData(prev => ({ ...prev, athlete_id: response.data.athletes[0].id }));
        }
      }
    } catch (err) {
      console.error('Error loading athletes:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAthleteData = async () => {
    try {
      const response = await athletes.getAll();
      if (response.data.success) {
        const athlete = response.data.athletes.find(a => a.user_id === user.id);
        if (athlete) {
          setFormData(prev => ({ ...prev, athlete_id: athlete.id }));
        }
      }
    } catch (err) {
      console.error('Error loading athlete data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
    
    // Auto-set is_concussion if injury type contains "Concussion"
    if (name === 'injury_type' && value.toLowerCase().includes('concussion')) {
      setFormData(prev => ({
        ...prev,
        is_concussion: true
      }));
    }
  };

  const handleTextAreaChange = (name, value) => {
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.athlete_id) {
      newErrors.athlete_id = 'Please select an athlete';
    }
    
    if (!formData.injury_type) {
      newErrors.injury_type = 'Injury type is required';
    }
    
    if (!formData.body_part) {
      newErrors.body_part = 'Body part is required';
    }
    
    if (!formData.severity) {
      newErrors.severity = 'Severity is required';
    }
    
    if (!formData.date_reported) {
      newErrors.date_reported = 'Report date is required';
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
      if (injuryToEdit) {
        response = await injuries.update(injuryToEdit.id, formData);
      } else {
        response = await injuries.create(formData);
      }
      
      if (response.data.success) {
        if (onSuccess) {
          onSuccess(response.data.injury);
        }
        if (onClose) onClose();
      }
    } catch (err) {
      console.error('Error saving injury:', err);
      if (err.response?.data?.message) {
        setErrors({ general: err.response.data.message });
      } else {
        setErrors({ general: 'Failed to save injury record. Please try again.' });
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
    <div className="max-w-4xl mx-auto">
      <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-bold text-white">
              {injuryToEdit ? 'Edit Injury Record' : 'Log New Injury'}
            </h2>
            <p className="text-slate-400">
              {injuryToEdit 
                ? 'Update injury details and recovery status'
                : 'Record detailed information about an injury'
              }
            </p>
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

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Basic Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

              {/* Injury Type */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Injury Type *
                </label>
                <select
                  name="injury_type"
                  value={formData.injury_type}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-slate-800/50 border ${errors.injury_type ? 'border-red-500' : 'border-slate-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan`}
                >
                  <option value="">Select injury type</option>
                  {injuryTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
                {errors.injury_type && (
                  <p className="mt-2 text-sm text-red-400">{errors.injury_type}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Where did it happen? *</label>
                <select name="injury_context" value={formData.injury_context} onChange={handleChange} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white">
                  <option value="">Select context</option>
                  <option value="sport_training">During sport training</option>
                  <option value="sport_match">During sport match</option>
                  <option value="other">Other</option>
                </select>
              </div>
              {formData.injury_context === 'other' && (
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Where did it happen? *</label>
                  <input type="text" name="injury_context_other" value={formData.injury_context_other} onChange={handleChange} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white" required />
                </div>
              )}

              {/* Body Part */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Body Part *
                </label>
                <select
                  name="body_part"
                  value={formData.body_part}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-slate-800/50 border ${errors.body_part ? 'border-red-500' : 'border-slate-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan`}
                >
                  <option value="">Select body part</option>
                  {bodyParts.map((part) => (
                    <option key={part} value={part}>{part}</option>
                  ))}
                </select>
                {errors.body_part && (
                  <p className="mt-2 text-sm text-red-400">{errors.body_part}</p>
                )}
              </div>

              {/* Side */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Side
                </label>
                <select
                  name="side"
                  value={formData.side}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                >
                  <option value="">Select side</option>
                  <option value="left">Left</option>
                  <option value="right">Right</option>
                  <option value="both">Both</option>
                </select>
              </div>

              {/* Severity */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Severity *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {severityLevels.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => handleChange({ target: { name: 'severity', value: level.value } })}
                      className={`p-3 rounded-lg border-2 text-center transition-all ${
                        formData.severity === level.value
                          ? `border-${level.value === 'mild' ? 'green' : level.value === 'moderate' ? 'amber' : 'red'}-500 bg-${level.value === 'mild' ? 'green' : level.value === 'moderate' ? 'amber' : 'red'}-500/10`
                          : 'border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <span className={`font-semibold ${level.color}`}>
                        {level.label}
                      </span>
                    </button>
                  ))}
                </div>
                {errors.severity && (
                  <p className="mt-2 text-sm text-red-400">{errors.severity}</p>
                )}
              </div>

              {/* Dates */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Date Reported *
                </label>
                <input
                  type="date"
                  name="date_reported"
                  value={formData.date_reported}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-slate-800/50 border ${errors.date_reported ? 'border-red-500' : 'border-slate-700'} rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan`}
                />
                {errors.date_reported && (
                  <p className="mt-2 text-sm text-red-400">{errors.date_reported}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Date Occurred
                </label>
                <input
                  type="date"
                  name="date_occurred"
                  value={formData.date_occurred}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                />
              </div>
            </div>
          </div>

          {/* Concussion-Specific Information */}
          {formData.injury_type.toLowerCase().includes('concussion') && (
            <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-6">Concussion Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center text-sm font-medium text-slate-300 mb-2">
                    <input
                      type="checkbox"
                      name="is_concussion"
                      checked={formData.is_concussion}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4 text-brand-cyan bg-slate-800 border-slate-700 rounded focus:ring-brand-cyan focus:ring-2"
                    />
                    Confirmed Concussion
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center text-sm font-medium text-slate-300 mb-2">
                    <input
                      type="checkbox"
                      name="loss_of_consciousness"
                      checked={formData.loss_of_consciousness}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4 text-brand-cyan bg-slate-800 border-slate-700 rounded focus:ring-brand-cyan focus:ring-2"
                    />
                    Loss of Consciousness
                  </label>
                </div>
                
                {formData.loss_of_consciousness && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      LOC Duration (seconds)
                    </label>
                    <input
                      type="number"
                      name="loc_duration"
                      value={formData.loc_duration}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                      min="0"
                      placeholder="Duration in seconds"
                    />
                  </div>
                )}
                
                <div>
                  <label className="flex items-center text-sm font-medium text-slate-300 mb-2">
                    <input
                      type="checkbox"
                      name="post_traumatic_amnesia"
                      checked={formData.post_traumatic_amnesia}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4 text-brand-cyan bg-slate-800 border-slate-700 rounded focus:ring-brand-cyan focus:ring-2"
                    />
                    Post-Traumatic Amnesia
                  </label>
                </div>
                
                {formData.post_traumatic_amnesia && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      PTA Duration (minutes)
                    </label>
                    <input
                      type="number"
                      name="pta_duration"
                      value={formData.pta_duration}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                      min="0"
                      placeholder="Duration in minutes"
                    />
                  </div>
                )}
                
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Mechanism of Concussion
                  </label>
                  <select
                    name="mechanism_of_concussion"
                    value={formData.mechanism_of_concussion}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                  >
                    <option value="">Select mechanism</option>
                    <option value="head_to_head">Head-to-head contact</option>
                    <option value="head_to_body">Head-to-body contact</option>
                    <option value="head_to_ground">Head-to-ground contact</option>
                    <option value="head_to_object">Head-to-object contact</option>
                    <option value="whiplash">Whiplash (no direct head impact)</option>
                    <option value="blast">Blast injury</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="flex items-center text-sm font-medium text-slate-300 mb-2">
                    <input
                      type="checkbox"
                      name="suspected_concussion"
                      checked={formData.suspected_concussion}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4 text-brand-cyan bg-slate-800 border-slate-700 rounded focus:ring-brand-cyan focus:ring-2"
                    />
                    Suspected Concussion
                  </label>
                </div>
                
                <div>
                  <label className="flex items-center text-sm font-medium text-slate-300 mb-2">
                    <input
                      type="checkbox"
                      name="referred_to_physician"
                      checked={formData.referred_to_physician}
                      onChange={handleChange}
                      className="mr-2 w-4 h-4 text-brand-cyan bg-slate-800 border-slate-700 rounded focus:ring-brand-cyan focus:ring-2"
                    />
                    Referred to Physician
                  </label>
                </div>
                
                {formData.referred_to_physician && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Physician Name
                      </label>
                      <input
                        type="text"
                        name="physician_name"
                        value={formData.physician_name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                        placeholder="Dr. Smith"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Physician Contact
                      </label>
                      <input
                        type="text"
                        name="physician_contact"
                        value={formData.physician_contact}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                        placeholder="Phone or email"
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Injury Details */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Injury Details</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Mechanism of Injury
                </label>
                <select name="mechanism" value={formData.mechanism} onChange={handleChange} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white">
                  <option value="">Select mechanism</option>
                  <option value="contact">Contact</option>
                  <option value="non_contact">Non-contact movement</option>
                  <option value="overuse">Overuse</option>
                  <option value="fall">Fall</option>
                  <option value="collision">Collision</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Symptoms
                </label>
                <textarea
                  value={formData.symptoms}
                  onChange={(e) => handleTextAreaChange('symptoms', e.target.value)}
                  rows="3"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan resize-none"
                  placeholder="Describe the symptoms (pain level, location, when it occurs, etc.)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Diagnosis
                </label>
                <textarea
                  value={formData.diagnosis}
                  onChange={(e) => handleTextAreaChange('diagnosis', e.target.value)}
                  rows="3"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan resize-none"
                  placeholder="Medical diagnosis (if available)"
                />
              </div>
            </div>
          </div>

          {/* Treatment & Recovery */}
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-6">Treatment & Recovery</h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Treatment Plan
                </label>
                <textarea
                  value={formData.treatment_plan}
                  onChange={(e) => handleTextAreaChange('treatment_plan', e.target.value)}
                  rows="3"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan resize-none"
                  placeholder="Recommended treatment, therapy, rehabilitation plan"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Estimated Recovery Time (days)
                  </label>
                  <input
                    type="number"
                    name="estimated_recovery_time"
                    value={formData.estimated_recovery_time}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                    placeholder="e.g., 14"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                  >
                    <option value="active">Active</option>
                    <option value="recovered">Recovered</option>
                    <option value="chronic">Chronic</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Additional Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => handleTextAreaChange('notes', e.target.value)}
                  rows="4"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan resize-none"
                  placeholder="Any additional notes, restrictions, or important information..."
                />
              </div>
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
                  {injuryToEdit ? 'Updating...' : 'Saving...'}
                </>
              ) : (
                injuryToEdit ? 'Update Injury Record' : 'Save Injury Record'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InjuryForm;