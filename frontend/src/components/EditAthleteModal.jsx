import React, { useState, useEffect } from 'react';

const EditAthleteModal = ({ athlete, teams, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    name: '',
    surname: '',
    jersey_number: '',
    age: '',
    height: '',
    weight: '',
    position: '',
    summer_sporting_code: '',
    winter_sporting_code: '',
    bleep_score: '',
    sport_attendance: '',
    gym_attendance: '',
    dominant_side: '',
    bio_notes: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (athlete) {
      setFormData({
        name: athlete.user?.name || '',
        surname: athlete.user?.surname || '',
        jersey_number: athlete.jersey_number || '',
        age: athlete.age || '',
        height: athlete.height || '',
        weight: athlete.weight || '',
        position: athlete.position || '',
        summer_sporting_code: athlete.summer_sporting_code || '',
        winter_sporting_code: athlete.winter_sporting_code || '',
        bleep_score: athlete.bleep_score || '',
        sport_attendance: athlete.sport_attendance || '',
        gym_attendance: athlete.gym_attendance || '',
        dominant_side: athlete.dominant_side || '',
        bio_notes: athlete.bio_notes || ''
      });
    }
  }, [athlete]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'First name is required';
    if (!formData.surname.trim()) newErrors.surname = 'Last name is required';
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    // Convert numeric fields
    const submitData = {
      name: formData.name,
      surname: formData.surname,
      jersey_number: formData.jersey_number ? parseInt(formData.jersey_number) : null,
      age: formData.age ? parseInt(formData.age) : null,
      height: formData.height ? parseFloat(formData.height) : null,
      weight: formData.weight ? parseFloat(formData.weight) : null,
      position: formData.position || null,
      summer_sporting_code: formData.summer_sporting_code || null,
      winter_sporting_code: formData.winter_sporting_code || null,
      bleep_score: formData.bleep_score ? parseFloat(formData.bleep_score) : null,
      sport_attendance: formData.sport_attendance ? parseFloat(formData.sport_attendance) : null,
      gym_attendance: formData.gym_attendance ? parseFloat(formData.gym_attendance) : null,
      dominant_side: formData.dominant_side || null,
      bio_notes: formData.bio_notes || null,
    };

    try {
      await onSubmit(athlete.id, submitData);
    } catch (error) {
      console.error('Error updating athlete:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!athlete) return null;

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <div className="bg-brand-bg-light border border-brand-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <div className="h-10 w-1 bg-gradient-to-b from-brand-cyan to-brand-cyan-dark rounded-full mr-3"></div>
              <div>
                <h2 className="text-2xl font-bold text-white">Edit Athlete</h2>
                <p className="text-slate-400">
                  {athlete.user?.name} {athlete.user?.surname}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Name Fields */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-slate-800/50 border ${errors.name ? 'border-red-500' : 'border-slate-700'} rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan`}
                  placeholder="John"
                  required
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-400">{errors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="surname"
                  value={formData.surname}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 bg-slate-800/50 border ${errors.surname ? 'border-red-500' : 'border-slate-700'} rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan`}
                  placeholder="Doe"
                  required
                />
                {errors.surname && (
                  <p className="mt-2 text-sm text-red-400">{errors.surname}</p>
                )}
              </div>

              {/* Jersey Number */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Jersey Number
                </label>
                <input
                  type="number"
                  name="jersey_number"
                  value={formData.jersey_number}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                  placeholder="23"
                  min="0"
                  max="99"
                />
              </div>

              {/* Age */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Age
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                  placeholder="18"
                  min="12"
                  max="50"
                />
              </div>

              {/* Height */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Height (cm)
                </label>
                <input
                  type="number"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                  placeholder="180"
                  step="0.1"
                  min="100"
                  max="250"
                />
              </div>

              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                  placeholder="75"
                  step="0.1"
                  min="30"
                  max="200"
                />
              </div>

              {/* Position */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Position
                </label>
                <select
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                >
                  <option value="">Select position</option>
                  <option value="Forward">Forward</option>
                  <option value="Midfielder">Midfielder</option>
                  <option value="Defender">Defender</option>
                  <option value="Goalkeeper">Goalkeeper</option>
                  <option value="Point Guard">Point Guard</option>
                  <option value="Shooting Guard">Shooting Guard</option>
                  <option value="Small Forward">Small Forward</option>
                  <option value="Power Forward">Power Forward</option>
                  <option value="Center">Center</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              {/* Dominant Side */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Dominant Side
                </label>
                <select
                  name="dominant_side"
                  value={formData.dominant_side}
                  onChange={handleChange}
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                >
                  <option value="">Select side</option>
                  <option value="Left">Left</option>
                  <option value="Right">Right</option>
                  <option value="Ambidextrous">Ambidextrous</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Summer Sporting Code</label>
                <input type="text" name="summer_sporting_code" value={formData.summer_sporting_code} onChange={handleChange} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Winter Sporting Code</label>
                <input type="text" name="winter_sporting_code" value={formData.winter_sporting_code} onChange={handleChange} className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Bleep Score</label>
                <input type="number" name="bleep_score" value={formData.bleep_score} onChange={handleChange} min="0" step="0.1" className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Sport Attendance (%)</label>
                <input type="number" name="sport_attendance" value={formData.sport_attendance} onChange={handleChange} min="0" max="100" step="0.1" className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Gym Attendance (%)</label>
                <input type="number" name="gym_attendance" value={formData.gym_attendance} onChange={handleChange} min="0" max="100" step="0.1" className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white" />
              </div>

              {/* Bio Notes */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Bio Notes
                </label>
                <textarea
                  name="bio_notes"
                  value={formData.bio_notes}
                  onChange={handleChange}
                  rows="4"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan resize-none"
                  placeholder="Any additional notes about the athlete..."
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-6 py-3 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark hover:from-brand-cyan-dark hover:to-brand-cyan text-white rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Updating...
                  </>
                ) : 'Update Athlete'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default EditAthleteModal;