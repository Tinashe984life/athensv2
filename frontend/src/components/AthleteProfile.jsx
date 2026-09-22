import React, { useState, useEffect } from 'react';
import { athletes } from '../services/athletes';
import RecoveryForm from './RecoveryForm';

const AthleteProfile = ({ user }) => {
  const [athleteProfile, setAthleteProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);

  useEffect(() => {
    loadAthleteProfile();
  }, []);

  const loadAthleteProfile = async () => {
    try {
      setLoading(true);
      // For athletes, they can only see their own profile
      // We need to get their athlete ID first
      const response = await athletes.getAll();
      if (response.data.success) {
        // Find the athlete profile for the current user
        const athlete = response.data.athletes.find(a => a.user_id === user.id);
        if (athlete) {
          setAthleteProfile(athlete);
          setFormData({
            jersey_number: athlete.jersey_number || '',
            age: athlete.age || '',
            height: athlete.height || '',
            weight: athlete.weight || '',
            position: athlete.position || '',
            dominant_side: athlete.dominant_side || '',
            bio_notes: athlete.bio_notes || ''
          });
        }
      }
    } catch (err) {
      console.error('Error loading athlete profile:', err);
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
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const submitData = {
        jersey_number: formData.jersey_number ? parseInt(formData.jersey_number) : null,
        age: formData.age ? parseInt(formData.age) : null,
        height: formData.height ? parseFloat(formData.height) : null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        position: formData.position || null,
        dominant_side: formData.dominant_side || null,
        bio_notes: formData.bio_notes || null,
      };

      await athletes.update(athleteProfile.id, submitData);
      setEditing(false);
      loadAthleteProfile(); // Reload profile
    } catch (err) {
      alert('Failed to update profile');
      console.error('Error updating profile:', err);
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

  if (!athleteProfile) {
    return (
      <div className="text-center py-12">
        <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-4xl">👤</span>
        </div>
        <h3 className="text-xl font-bold text-white mb-3">No Profile Found</h3>
        <p className="text-slate-400 mb-6">
          Your athlete profile hasn't been set up yet. Please contact your coach.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">My Profile</h2>
          <p className="text-slate-400">View and manage your athlete profile</p>
        </div>
        {!editing && (
          <div className="flex gap-3">
            <button onClick={() => setShowRecoveryForm(true)} className="px-4 py-2 bg-slate-800 text-white rounded-lg">Log Recovery</button>
            <button onClick={() => setEditing(true)} className="px-4 py-2 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white hover:from-brand-cyan-dark hover:to-brand-cyan rounded-lg transition-all duration-200">Edit Profile</button>
          </div>
        )}
      </div>

      {/* Profile Card */}
      <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-8">
        {editing ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Info */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      First Name
                    </label>
                    <input
                      type="text"
                      value={user?.name || ''}
                      disabled
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400"
                    />
                    <p className="text-xs text-slate-500 mt-2">Contact coach to change name</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Last Name
                    </label>
                    <input
                      type="text"
                      value={user?.surname || ''}
                      disabled
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Email
                    </label>
                    <input
                      type="text"
                      value={user?.email || 'No email'}
                      disabled
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Username
                    </label>
                    <input
                      type="text"
                      value={user?.username || ''}
                      disabled
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Athletic Info */}
              <div className="md:col-span-2">
                <h3 className="text-lg font-semibold text-white mb-4 mt-6">Athletic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Jersey Number
                    </label>
                    <input
                      type="number"
                      name="jersey_number"
                      value={formData.jersey_number}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                      placeholder="23"
                      min="0"
                      max="99"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Age
                    </label>
                    <input
                      type="number"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                      placeholder="18"
                      min="12"
                      max="50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                      placeholder="180"
                      step="0.1"
                      min="100"
                      max="250"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
                      placeholder="75"
                      step="0.1"
                      min="30"
                      max="200"
                    />
                  </div>
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
                </div>
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
                  rows="3"
                  className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan resize-none"
                  placeholder="Any additional notes about yourself..."
                />
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-between pt-6 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditing(false)}
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
                    Saving...
                  </>
                ) : 'Save Changes'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-8">
            {/* Personal Info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-slate-500">Full Name</p>
                  <p className="text-lg font-semibold text-white">{user?.name} {user?.surname}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="text-lg font-semibold text-white">{user?.email || 'No email'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Username</p>
                  <p className="text-lg font-semibold text-white">{user?.username}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Role</p>
                  <p className="text-lg font-semibold text-white capitalize">{user?.role}</p>
                </div>
              </div>
            </div>

            {/* Athletic Info */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Athletic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <p className="text-sm text-slate-500">Jersey Number</p>
                  <p className="text-2xl font-bold text-white">{athleteProfile.jersey_number || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Age</p>
                  <p className="text-2xl font-bold text-white">{athleteProfile.age || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Height</p>
                  <p className="text-2xl font-bold text-white">{athleteProfile.height ? `${athleteProfile.height}cm` : '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Weight</p>
                  <p className="text-2xl font-bold text-white">{athleteProfile.weight ? `${athleteProfile.weight}kg` : '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Position</p>
                  <p className="text-lg font-semibold text-white">{athleteProfile.position || 'Not set'}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500">Dominant Side</p>
                  <p className="text-lg font-semibold text-white">{athleteProfile.dominant_side || 'Not set'}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-slate-500">Bio Notes</p>
                  <p className="text-white">{athleteProfile.bio_notes || 'No bio notes added'}</p>
                </div>
              </div>
            </div>

            {/* Coming Soon Features */}
            <div className="pt-6 border-t border-slate-800">
              <h3 className="text-lg font-semibold text-white mb-4">Coming Soon</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-3">💪</span>
                    <span className="font-semibold text-white">Wellness Tracking</span>
                  </div>
                  <p className="text-sm text-slate-400">Submit daily wellness checks and track your readiness</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-3">📊</span>
                    <span className="font-semibold text-white">Performance Tests</span>
                  </div>
                  <p className="text-sm text-slate-400">View your test results and progress over time</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-3">🎯</span>
                    <span className="font-semibold text-white">Goals</span>
                  </div>
                  <p className="text-sm text-slate-400">Set and track your personal performance goals</p>
                </div>
                <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-4">
                  <div className="flex items-center mb-2">
                    <span className="text-2xl mr-3">📱</span>
                    <span className="font-semibold text-white">Mobile Check-in</span>
                  </div>
                  <p className="text-sm text-slate-400">Submit wellness checks from your mobile device</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {showRecoveryForm && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-4xl mt-8 mb-8">
            <RecoveryForm user={user} athleteId={athleteProfile.id} onSuccess={() => setShowRecoveryForm(false)} onClose={() => setShowRecoveryForm(false)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AthleteProfile;