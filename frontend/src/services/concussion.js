import api from './api';

export const concussion = {
  // Create symptom assessment
  createSymptomScore: (data) => api.post('/concussion/symptom-scores', data),

  // Get symptom scores for an injury
  getSymptomScores: (injuryId, limit = 20) => 
    api.get(`/concussion/symptom-scores?injury_id=${injuryId}&limit=${limit}`),

  // Get RTP stages
  getRTPStages: () => api.get('/concussion/rtp/stages'),

  // Advance RTP stage
  advanceRTPStage: (injuryId) => 
    api.post('/concussion/rtp/advance', { injury_id: injuryId }),

  // Set medical clearance
  setMedicalClearance: (injuryId, clearedBy = '') => 
    api.post('/concussion/rtp/medical-clearance', { 
      injury_id: injuryId, 
      cleared_by: clearedBy 
    }),

  // Get concussion progress
  getConcussionProgress: (injuryId) => 
    api.get(`/concussion/progress/${injuryId}`),

  // Get athlete concussions
  getAthleteConcussions: (athleteId = '') => {
    const params = new URLSearchParams();
    if (athleteId) params.append('athlete_id', athleteId);
    return api.get(`/concussion/athlete-concussions?${params.toString()}`);
  }
};