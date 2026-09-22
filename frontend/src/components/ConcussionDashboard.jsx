import React, { useState, useEffect } from 'react';
import { concussion } from '../services/concussion';
import { athletes } from '../services/athletes';
import ConcussionAssessmentForm from './ConcussionAssessmentForm';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

const ConcussionDashboard = ({ user }) => {
  const [concussions, setConcussions] = useState([]);
  const [selectedConcussion, setSelectedConcussion] = useState(null);
  const [concussionProgress, setConcussionProgress] = useState(null);
  const [symptomScores, setSymptomScores] = useState([]);
  const [coachAthletes, setCoachAthletes] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState('');
  const [loading, setLoading] = useState(true);
  const [showAssessmentForm, setShowAssessmentForm] = useState(false);
  const [rtpStages, setRTPStages] = useState([]);

  useEffect(() => {
    if (user.role === 'coach') {
      loadCoachAthletes();
    } else {
      loadAthleteData();
    }
    
    loadRTPStages();
  }, [user]);

  useEffect(() => {
    if (selectedAthlete || user.role === 'athlete') {
      loadConcussionData();
    } else if (user.role === 'coach') {
      // Clear data when no athlete is selected
      setConcussions([]);
      setSelectedConcussion(null);
      setConcussionProgress(null);
      setSymptomScores([]);
      setLoading(false);
    }
  }, [selectedAthlete, user.role]);

  useEffect(() => {
    if (selectedConcussion) {
      loadConcussionDetails();
    }
  }, [selectedConcussion]);

  const loadCoachAthletes = async () => {
    try {
      const response = await athletes.getAll();
      if (response.data.success) {
        setCoachAthletes(response.data.athletes);
      }
    } catch (err) {
      console.error('Error loading athletes:', err);
    }
  };

  const loadAthleteData = async () => {
    try {
      const response = await athletes.getAll();
      if (response.data.success) {
        const athlete = response.data.athletes.find(a => a.user_id === user.id);
        if (athlete) {
          setSelectedAthlete(athlete.id);
        }
      }
    } catch (err) {
      console.error('Error loading athlete data:', err);
    }
  };

  const loadRTPStages = async () => {
    try {
      const response = await concussion.getRTPStages();
      if (response.data.success) {
        setRTPStages(response.data.stages);
      }
    } catch (err) {
      console.error('Error loading RTP stages:', err);
    }
  };

  const loadConcussionData = async () => {
    try {
      setLoading(true);
      
      // Clear existing data if no athlete selected (for coaches)
      if (user.role === 'coach' && !selectedAthlete) {
        setConcussions([]);
        setSelectedConcussion(null);
        setConcussionProgress(null);
        setSymptomScores([]);
        setLoading(false);
        return;
      }
      
      const response = await concussion.getAthleteConcussions(selectedAthlete || '');
      
      if (response.data.success) {
        setConcussions(response.data.concussions);
        if (response.data.concussions.length > 0) {
          setSelectedConcussion(response.data.concussions[0]);
        } else {
          setSelectedConcussion(null);
        }
      }
    } catch (err) {
      console.error('Error loading concussion data:', err);
      // Show user-friendly error
      if (err.response?.data?.message) {
        console.error('API Error:', err.response.data.message);
      }
      setConcussions([]);
      setSelectedConcussion(null);
    } finally {
      setLoading(false);
    }
  };

  const loadConcussionDetails = async () => {
    if (!selectedConcussion) return;
    
    try {
      const [progressResponse, scoresResponse] = await Promise.all([
        concussion.getConcussionProgress(selectedConcussion.id),
        concussion.getSymptomScores(selectedConcussion.id)
      ]);
      
      if (progressResponse.data.success) {
        setConcussionProgress(progressResponse.data);
      }
      
      if (scoresResponse.data.success) {
        setSymptomScores(scoresResponse.data.symptom_scores);
      }
    } catch (err) {
      console.error('Error loading concussion details:', err);
    }
  };

  const handleAdvanceStage = async () => {
    if (!selectedConcussion) return;
    
    try {
      const response = await concussion.advanceRTPStage(selectedConcussion.id);
      if (response.data.success) {
        loadConcussionDetails();
        loadConcussionData(); // Refresh concussions list
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to advance stage');
    }
  };

  const handleMedicalClearance = async () => {
    if (!selectedConcussion) return;
    
    try {
      const response = await concussion.setMedicalClearance(selectedConcussion.id, user.name + ' ' + user.surname);
      if (response.data.success) {
        loadConcussionDetails();
        loadConcussionData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to set medical clearance');
    }
  };

  const getSymptomChartData = () => {
    const sortedScores = [...symptomScores].sort((a, b) => 
      new Date(a.assessment_date) - new Date(b.assessment_date)
    );

    return {
      labels: sortedScores.map(score => 
        new Date(score.assessment_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          label: 'Total Symptom Score',
          data: sortedScores.map(score => score.total_symptom_score),
          borderColor: '#ef4444',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Headache',
          data: sortedScores.map(score => score.headache),
          borderColor: '#8b5cf6',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.4,
          fill: false
        },
        {
          label: 'Dizziness',
          data: sortedScores.map(score => score.dizziness),
          borderColor: '#10b981',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          tension: 0.4,
          fill: false
        }
      ]
    };
  };

  const getChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: {
          color: '#cbd5e1'
        }
      },
      tooltip: {
        backgroundColor: '#1e293b',
        titleColor: '#f1f5f9',
        bodyColor: '#cbd5e1',
        borderColor: '#475569',
        borderWidth: 1
      }
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(100, 116, 139, 0.2)'
        },
        ticks: {
          color: '#94a3b8'
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(100, 116, 139, 0.2)'
        },
        ticks: {
          color: '#94a3b8'
        }
      }
    }
  };

  const getRTPStageStatus = (stageNumber) => {
    if (!selectedConcussion?.rtp_stage) return 'pending';
    if (stageNumber < selectedConcussion.rtp_stage) return 'completed';
    if (stageNumber === selectedConcussion.rtp_stage) return 'current';
    return 'pending';
  };

  if (loading && (selectedAthlete || user.role === 'athlete')) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand-cyan"></div>
        <p className="text-slate-400">Loading concussion data...</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-8 text-center">
        <div className="text-5xl mb-4">🧠</div>
        <h2 className="text-2xl font-bold text-white mb-3">Headway by Concusio</h2>
        <p className="text-slate-400 mb-6">Please use the Concusio app for concussion support and management.</p>
        <a href="https://www.concusio.co.za" target="_blank" rel="noreferrer" className="inline-flex px-6 py-3 bg-brand-cyan text-white rounded-lg hover:opacity-90">
          Open Concusio
        </a>
        <div className="mt-8 flex justify-center">
          <img
            src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=https%3A%2F%2Fwww.concusio.co.za"
            alt="QR code for Headway by Concusio"
            className="w-56 h-56 bg-white p-2 rounded-lg"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">Concussion Management</h2>
          <p className="text-slate-400">
            {user.role === 'athlete' 
              ? 'Track your concussion recovery progress'
              : 'Monitor and manage concussion recovery protocols'
            }
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {user.role === 'coach' && coachAthletes.length > 0 && (
            <select
              value={selectedAthlete}
              onChange={(e) => setSelectedAthlete(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-cyan"
            >
              <option value="">Select athlete</option>
              {coachAthletes.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.user?.name} {athlete.user?.surname}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Coach Empty State - No Athlete Selected */}
      {user.role === 'coach' && !selectedAthlete && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">👥</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-3">Select an Athlete</h3>
          <p className="text-slate-400 mb-6">
            Choose an athlete from the dropdown above to view their concussion history
          </p>
        </div>
      )}

      {/* Concussion Selection */}
      {concussions.length > 0 && selectedAthlete && (
        <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
          <h3 className="text-xl font-bold text-white mb-4">Select Concussion</h3>
          <div className="flex flex-wrap gap-3">
            {concussions.map((concussion) => (
              <button
                key={concussion.id}
                onClick={() => setSelectedConcussion(concussion)}
                className={`px-4 py-3 rounded-lg transition-all ${
                  selectedConcussion?.id === concussion.id
                    ? 'bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <div className="text-left">
                  <p className="font-semibold">
                    {new Date(concussion.date_reported).toLocaleDateString()}
                  </p>
                  <p className="text-sm opacity-80 capitalize">
                    {concussion.severity} • {concussion.status}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Dashboard */}
      {selectedConcussion && concussionProgress && (
        <>
          {/* Recovery Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Progress Stats */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-white">Recovery Progress</h3>
                  <span className="text-2xl font-bold text-brand-cyan">
                    {concussionProgress.progress.recovery_percentage}%
                  </span>
                </div>
                
                <div className="w-full bg-slate-700 rounded-full h-4 mb-4">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-brand-cyan h-4 rounded-full transition-all duration-500"
                    style={{ width: `${concussionProgress.progress.recovery_percentage}%` }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-slate-400">Days Since Injury</p>
                    <p className="text-2xl font-bold text-white">
                      {concussionProgress.progress.days_since_injury}
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-slate-400">Current Stage</p>
                    <p className="text-2xl font-bold text-white">
                      {selectedConcussion.rtp_stage || 'Not Started'}
                    </p>
                  </div>
                  
                  <div className="text-center p-4 bg-slate-800/50 rounded-lg">
                    <p className="text-sm text-slate-400">Medical Clearance</p>
                    <p className={`text-2xl font-bold ${selectedConcussion.rtp_medical_clearance ? 'text-green-400' : 'text-red-400'}`}>
                      {selectedConcussion.rtp_medical_clearance ? '✓ Cleared' : 'Pending'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Symptom Chart */}
              {symptomScores.length > 0 && (
                <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-bold text-white">Symptom Progression</h3>
                    <button
                      onClick={() => setShowAssessmentForm(true)}
                      className="px-4 py-2 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white hover:from-brand-cyan-dark hover:to-brand-cyan rounded-lg transition-all duration-200"
                    >
                      New Assessment
                    </button>
                  </div>
                  <div className="h-64">
                    <Line data={getSymptomChartData()} options={getChartOptions} />
                  </div>
                </div>
              )}
            </div>

            {/* RTP Protocol */}
            <div className="space-y-6">
              <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-6">Return-to-Play Protocol</h3>
                
                <div className="space-y-4">
                  {rtpStages.map((stage) => {
                    const status = getRTPStageStatus(stage.stage);
                    return (
                      <div
                        key={stage.stage}
                        className={`p-4 rounded-lg border-2 transition-all ${
                          status === 'completed'
                            ? 'border-green-500/30 bg-green-500/10'
                            : status === 'current'
                            ? 'border-brand-cyan/30 bg-brand-cyan/10'
                            : 'border-slate-700 bg-slate-800/50'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            status === 'completed'
                              ? 'bg-green-500 text-white'
                              : status === 'current'
                              ? 'bg-brand-cyan text-white'
                              : 'bg-slate-700 text-slate-300'
                          }`}>
                            {stage.stage}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="font-semibold text-white">{stage.name}</h4>
                              {status === 'current' && (
                                <span className="px-2 py-1 bg-brand-cyan/20 text-brand-cyan text-xs font-semibold rounded">
                                  CURRENT
                                </span>
                              )}
                              {status === 'completed' && (
                                <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-semibold rounded">
                                  COMPLETED
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-slate-400 mt-1">{stage.description}</p>
                            <p className="text-xs text-slate-500 mt-2">{stage.duration_days}</p>
                            
                            {status === 'current' && selectedConcussion.rtp_stage_start_date && (
                              <div className="mt-3 pt-3 border-t border-slate-700">
                                <p className="text-xs text-slate-400">
                                  Started: {new Date(selectedConcussion.rtp_stage_start_date).toLocaleDateString()}
                                </p>
                                
                                {stage.stage < 5 && (
                                  <button
                                    onClick={handleAdvanceStage}
                                    className="mt-2 w-full px-3 py-2 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white text-sm rounded-lg hover:from-brand-cyan-dark hover:to-brand-cyan transition-all duration-200"
                                  >
                                    Advance to Stage {stage.stage + 1}
                                  </button>
                                )}
                                
                                {stage.stage === 4 && !selectedConcussion.rtp_medical_clearance && (
                                  <button
                                    onClick={handleMedicalClearance}
                                    className="mt-2 w-full px-3 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white text-sm rounded-lg hover:from-green-600 hover:to-green-500 transition-all duration-200"
                                  >
                                    Record Medical Clearance
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
                <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={() => setShowAssessmentForm(true)}
                    className="w-full px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors flex items-center justify-center"
                  >
                    <span className="mr-2">📝</span>
                    New Symptom Assessment
                  </button>
                  
                  {!selectedConcussion.rtp_protocol_started && (
                    <button
                      onClick={handleAdvanceStage}
                      className="w-full px-4 py-3 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white rounded-lg hover:from-brand-cyan-dark hover:to-brand-cyan transition-all duration-200 flex items-center justify-center"
                    >
                      <span className="mr-2">🚀</span>
                      Start RTP Protocol
                    </button>
                  )}
                  
                  {selectedConcussion.rtp_stage === 4 && !selectedConcussion.rtp_medical_clearance && (
                    <button
                      onClick={handleMedicalClearance}
                      className="w-full px-4 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg hover:from-green-600 hover:to-green-500 transition-all duration-200 flex items-center justify-center"
                    >
                      <span className="mr-2">✅</span>
                      Record Medical Clearance
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Latest Assessment */}
          {symptomScores.length > 0 && (
            <div className="bg-brand-bg-light border border-brand-border rounded-xl p-6">
              <h3 className="text-xl font-bold text-white mb-6">Latest Symptom Assessment</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Date</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Total Score</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Worst Symptoms</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Cognitive Score</th>
                      <th className="text-left py-3 px-4 text-slate-400 font-medium">Assessed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {symptomScores.slice(0, 5).map((score) => (
                      <tr key={score.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-3 px-4">
                          <p className="text-white">
                            {new Date(score.assessment_date).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`text-lg font-bold ${
                            score.total_symptom_score > 20 ? 'text-red-400' :
                            score.total_symptom_score > 10 ? 'text-amber-400' : 'text-green-400'
                          }`}>
                            {score.total_symptom_score}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            {[
                              { key: 'headache', label: 'Headache' },
                              { key: 'dizziness', label: 'Dizziness' },
                              { key: 'difficulty_concentrating', label: 'Concentration' }
                            ]
                              .filter(symptom => score[symptom.key] && score[symptom.key] >= 3)
                              .map(symptom => (
                                <span key={symptom.key} className="px-2 py-1 bg-red-500/20 text-red-400 text-xs rounded">
                                  {symptom.label}: {score[symptom.key]}
                                </span>
                              ))}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className="text-white">
                            {score.immediate_memory_score || 0}/15
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <p className="text-slate-400">{score.assessed_by}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Empty State - No Concussions */}
      {concussions.length === 0 && selectedAthlete && (
        <div className="text-center py-12">
          <div className="w-24 h-24 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🧠</span>
          </div>
          <h3 className="text-xl font-bold text-white mb-3">No Concussion Records</h3>
          <p className="text-slate-400 mb-6">
            {user.role === 'athlete' 
              ? 'You don\'t have any recorded concussions.'
              : 'This athlete doesn\'t have any recorded concussions.'
            }
          </p>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => window.location.hash = 'injury-form'}
              className="px-6 py-3 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white rounded-lg hover:from-brand-cyan-dark hover:to-brand-cyan transition-all duration-200"
            >
              Log New Injury
            </button>
            {user.role === 'coach' && (
              <button
                onClick={() => {
                  // Navigate to injury form with concussion pre-selected
                  window.location.hash = 'injury-form?type=concussion';
                }}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Log Concussion
              </button>
            )}
          </div>
        </div>
      )}

      {/* Modals */}
      {showAssessmentForm && selectedConcussion && (
        <div className="fixed inset-0 bg-black/70 flex items-start justify-center p-4 z-50 overflow-y-auto">
          <div className="w-full max-w-4xl mt-8 mb-8">
            <ConcussionAssessmentForm
              injury={selectedConcussion}
              user={user}
              onSuccess={() => {
                setShowAssessmentForm(false);
                loadConcussionDetails();
              }}
              onClose={() => setShowAssessmentForm(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ConcussionDashboard;