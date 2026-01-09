import api from './api';

export const dashboard = {
  // Get team overview
  getTeamOverview: (params = {}) => {
    const queryParams = new URLSearchParams(params).toString();
    return api.get(`/dashboard/team-overview${queryParams ? `?${queryParams}` : ''}`);
  },

  // Get athlete risk assessment
  getAthleteRiskAssessment: (athleteId) => 
    api.get(`/dashboard/athlete-risk/${athleteId}`),

  // Get team risk summary
  getTeamRiskSummary: (teamId = '') => {
    const params = new URLSearchParams();
    if (teamId) params.append('team_id', teamId);
    return api.get(`/dashboard/team-risk-summary?${params.toString()}`);
  },

  // Get workload analysis
  getWorkloadAnalysis: (athleteId) => 
    api.get(`/dashboard/workload-analysis/${athleteId}`)
};