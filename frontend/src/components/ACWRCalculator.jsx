import React, { useState, useEffect } from 'react';
import { workload } from '../services/workload';
import { athletes } from '../services/athletes';

const ACWRCalculator = ({ user }) => {
  const [loading, setLoading] = useState(false);
  const [athletesList, setAthletesList] = useState([]);
  const [selectedAthlete, setSelectedAthlete] = useState(null);
  const [acwrData, setAcwrData] = useState(null);
  const [calculationDate, setCalculationDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadAthletes();
  }, []);

  useEffect(() => {
    if (user.role === 'athlete') {
      const athlete = athletesList.find(a => a.user_id === user.id);
      if (athlete) {
        setSelectedAthlete(athlete.id);
      }
    }
  }, [athletesList, user]);

  useEffect(() => {
    if (selectedAthlete) {
      calculateACWR(selectedAthlete);
    }
  }, [selectedAthlete, calculationDate]);

  const loadAthletes = async () => {
    try {
      const response = await athletes.getAll();
      if (response.data.success) {
        setAthletesList(response.data.athletes);
        if (user.role !== 'athlete' && response.data.athletes.length > 0) {
          setSelectedAthlete(response.data.athletes[0].id);
        }
      }
    } catch (err) {
      console.error('Error loading athletes:', err);
    }
  };

  const calculateACWR = async (athleteId = selectedAthlete) => {
    if (!athleteId) return;
    
    setLoading(true);
    try {
      const response = await workload.calculateACWR(athleteId, calculationDate);
      if (response.success) {
        setAcwrData(response);
      }
    } catch (err) {
      console.error('Error calculating ACWR:', err);
      alert('Error calculating ACWR. Please ensure the athlete has sufficient training data.');
    } finally {
      setLoading(false);
    }
  };

  const handleAthleteSelect = (e) => {
    const athleteId = e.target.value;
    setSelectedAthlete(athleteId);
    if (!athleteId) {
      setAcwrData(null);
    }
    <div className="text-sm text-slate-400">Optimal (0.8-1.3)</div>
  };

  const handleDateChange = (e) => {
    setCalculationDate(e.target.value);
  };

  const getRiskRecommendation = (acwr, monotony) => {
    if (acwr > 1.5) {
      return {
        level: 'high',
        title: 'High Injury Risk',
        color: 'red',
        actions: [
          'Reduce training load by 20-30%',
          'Increase recovery days',
          'Focus on low-intensity sessions',
          'Monitor for signs of fatigue'
        ]
      };
    } else if (acwr > 1.2) {
      return {
        level: 'moderate',
        title: 'Moderate Risk',
        color: 'amber',
        actions: [
          'Maintain or slightly reduce load',
          'Ensure adequate recovery',
          'Monitor wellness scores closely',
          'Consider reducing high-intensity sessions'
        ]
      };
    } else if (acwr < 0.8) {
      return {
        level: 'detraining',
        title: 'Detraining Risk',
        color: 'blue',
        actions: [
          'Gradually increase training load',
          'Maintain current intensity',
          'Focus on consistent training',
          'Monitor performance metrics'
        ]
      };
    } else {
      return {
        level: 'optimal',
        title: 'Optimal Range',
        color: 'green',
        actions: [
          'Continue current progression',
          'Maintain consistency',
          'Monitor ACWR weekly',
          'Adjust based on wellness'
        ]
      };
    }
  };

  const renderAthleteSelector = () => {
    if (user.role === 'athlete') {
      const athlete = athletesList.find(a => a.user_id === user.id);
      if (athlete) {
        return (
          <div className="mb-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-full flex items-center justify-center text-white font-bold">
                {athlete.user.name.charAt(0)}{athlete.user.surname.charAt(0)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{athlete.user.name} {athlete.user.surname}</h3>
                <p className="text-slate-400">{athlete.position} • Team: {athlete.team?.name || 'No Team'}</p>
              </div>
            </div>
          </div>
        );
      }
    }

    return (
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">
          Select Athlete
        </label>
        <select
          value={selectedAthlete || ''}
          onChange={handleAthleteSelect}
          className="w-full max-w-md bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
        >
          <option value="">Select an athlete</option>
          {athletesList.map(athlete => (
            <option key={athlete.id} value={athlete.id}>
              {athlete.user.name} {athlete.user.surname} - {athlete.team?.name || 'No Team'}
            </option>
          ))}
        </select>
      </div>
    );
  };

  const renderACWRGauge = () => {
    if (!acwrData) return null;

    const risk = getRiskRecommendation(acwrData.acwr, acwrData.monotony);
    
    // Calculate percentage for gauge (0.6 to 1.8 range)
    let percentage = ((acwrData.acwr - 0.6) / (1.8 - 0.6)) * 100;
    percentage = Math.max(0, Math.min(100, percentage));

    return (
      <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h3 className="text-2xl font-bold text-white">ACWR Analysis</h3>
            <p className="text-slate-400">Calculated for {new Date(acwrData.date).toLocaleDateString()}</p>
          </div>
          <div className={`px-4 py-2 rounded-full bg-${risk.color}-500/20 text-${risk.color}-400 font-medium`}>
            {risk.title}
          </div>
        </div>

        {/* ACWR Gauge */}
        <div className="relative h-48 mb-8">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative">
              {/* Gauge background */}
              <div className="w-64 h-32 rounded-t-full overflow-hidden">
                <div className="w-full h-full bg-gradient-to-r from-green-500 via-amber-500 to-red-500"></div>
              </div>
              
              {/* Needle */}
              <div 
                className="absolute bottom-0 left-1/2 w-1 h-32 origin-bottom"
                style={{
                  transform: `translateX(-50%) rotate(${percentage * 180 / 100 - 90}deg)`,
                  transition: 'transform 1s ease'
                }}
              >
                <div className="w-2 h-8 bg-red-500 rounded-t"></div>
              </div>
              
              {/* Current value */}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 text-center">
                <div className="text-4xl font-bold text-white">{acwrData.acwr.toFixed(2)}</div>
                <div className="text-sm text-slate-400">Current ACWR</div>
              </div>
            </div>
          </div>

          {/* Scale labels */}
          <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4">
            <span className="text-sm text-slate-400">0.6</span>
            <span className="text-sm text-slate-400">Optimal (0.8-1.2)</span>
            <span className="text-sm text-slate-400">1.8</span>
          </div>
        </div>

        {/* Risk zones */}
        <div className="grid grid-cols-4 gap-2 mb-8">
          <div className="text-center">
            <div className="h-2 w-full bg-blue-500 rounded mb-2"></div>
            <span className="text-xs text-slate-400">Detraining</span>
            <div className="text-sm text-white">&lt; 0.8</div>
          </div>
          <div className="text-center">
            <div className="h-2 w-full bg-green-500 rounded mb-2"></div>
            <span className="text-xs text-slate-400">Optimal</span>
            <div className="text-sm text-white">0.8 - 1.2</div>
                      <div className="text-sm text-white">0.8 - 1.3</div>
          </div>
          <div className="text-center">
            <div className="h-2 w-full bg-amber-500 rounded mb-2"></div>
            <span className="text-xs text-slate-400">Moderate</span>
            <div className="text-sm text-white">1.2 - 1.5</div>
                      <div className="text-sm text-white">1.3 - 1.5</div>
          </div>
          <div className="text-center">
            <div className="h-2 w-full bg-red-500 rounded mb-2"></div>
            <span className="text-xs text-slate-400">High</span>
            <div className="text-sm text-white">&gt; 1.5</div>
          </div>
        </div>

        {/* Detailed metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-slate-800/50 rounded-xl p-6">
            <div className="text-sm text-slate-400 mb-2">Acute Workload</div>
            <div className="text-3xl font-bold text-white mb-1">{acwrData.acute_average.toFixed(0)}</div>
            <div className="text-xs text-slate-500">
              {acwrData.acute_workload.toFixed(0)} total over {acwrData.acute_days} days
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Sessions: {acwrData.acute_sessions_count}</span>
                <span>Avg/day: {acwrData.acute_average.toFixed(1)}</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500"
                  style={{ width: `${Math.min(100, acwrData.acute_average / 500 * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6">
            <div className="text-sm text-slate-400 mb-2">Chronic Workload</div>
            <div className="text-3xl font-bold text-white mb-1">{acwrData.chronic_average.toFixed(0)}</div>
            <div className="text-xs text-slate-500">
              {acwrData.chronic_workload.toFixed(0)} total over {acwrData.chronic_days} days
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Sessions: {acwrData.chronic_sessions_count}</span>
                <span>Avg/day: {acwrData.chronic_average.toFixed(1)}</span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500"
                  style={{ width: `${Math.min(100, acwrData.chronic_average / 500 * 100)}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/50 rounded-xl p-6">
            <div className="text-sm text-slate-400 mb-2">Training Monotony</div>
            <div className={`text-3xl font-bold mb-1 ${
              acwrData.monotony > 2 ? 'text-red-400' :
              acwrData.monotony > 1.5 ? 'text-amber-400' : 'text-green-400'
            }`}>
              {acwrData.monotony.toFixed(2)}
            </div>
            <div className="text-xs text-slate-500 mb-4">
              {acwrData.monotony > 2 ? 'High monotony - risk of overuse' :
               acwrData.monotony > 1.5 ? 'Moderate monotony' : 'Good variability'}
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div 
                className={`h-full ${
                  acwrData.monotony > 2 ? 'bg-red-500' :
                  acwrData.monotony > 1.5 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min(100, acwrData.monotony / 3 * 100)}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6">
          <h4 className="text-lg font-bold text-white mb-4">Recommendations</h4>
          <ul className="space-y-3">
            {risk.actions.map((action, index) => (
              <li key={index} className="flex items-start space-x-3">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                  risk.color === 'green' ? 'bg-green-500/20 text-green-400' :
                  risk.color === 'amber' ? 'bg-amber-500/20 text-amber-400' :
                  risk.color === 'blue' ? 'bg-blue-500/20 text-blue-400' : 'bg-red-500/20 text-red-400'
                }`}>
                  ✓
                </div>
                <span className="text-slate-300">{action}</span>
              </li>
            ))}
          </ul>
          
          <div className="mt-6 pt-6 border-t border-slate-700">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-white mb-2">Expected Impact</p>
                <p className="text-slate-400 text-sm">
                  Following these recommendations can reduce injury risk by 30-50% and improve performance outcomes.
                </p>
              </div>
              <div>
                <p className="text-sm font-medium text-white mb-2">Next Review</p>
                <p className="text-slate-400 text-sm">
                  Recalculate ACWR in 3-5 days to monitor changes. Consider creating a prehab plan for ongoing prevention.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">ACWR Calculator</h2>
          <p className="text-slate-400">Calculate Acute:Chronic Workload Ratio for injury risk assessment</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Calculation Date
            </label>
            <input
              type="date"
              value={calculationDate}
              onChange={handleDateChange}
              className="bg-brand-bg-light border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
            />
          </div>
          
          <button
            onClick={() => calculateACWR()}
            disabled={loading || !selectedAthlete}
            className="px-6 py-2 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white font-semibold rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed mt-6"
          >
            {loading ? 'Calculating...' : 'Calculate ACWR'}
          </button>
        </div>
      </div>

      {renderAthleteSelector()}

      {loading ? (
        <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-cyan mx-auto mb-4"></div>
          <h3 className="text-lg font-semibold text-white mb-2">Calculating ACWR</h3>
          <p className="text-slate-400">Analyzing training data for the selected athlete...</p>
        </div>
      ) : acwrData ? (
        renderACWRGauge()
      ) : (
        <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-12 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-xl font-bold text-white mb-2">No ACWR Data</h3>
          <p className="text-slate-400 mb-6">
            Select an athlete and calculate ACWR to see injury risk analysis and recommendations.
          </p>
          {selectedAthlete && (
            <button
              onClick={() => calculateACWR()}
              className="px-6 py-3 bg-gradient-to-r from-brand-cyan to-brand-cyan-dark text-white font-semibold rounded-lg hover:opacity-90 transition-opacity"
            >
              Calculate ACWR
            </button>
          )}
        </div>
      )}

      {/* Information Section */}
      <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-6">
        <h3 className="text-lg font-bold text-white mb-4">About ACWR</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-white mb-2">What is ACWR?</h4>
            <p className="text-slate-400 text-sm mb-4">
              The Acute:Chronic Workload Ratio compares the average training load from the last 7 days (acute) 
              to the average from the last 28 days (chronic). It's a key metric for injury risk prediction.
            </p>
            <ul className="space-y-2 text-sm text-slate-400">
              <li className="flex items-center">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <span>0.8-1.2: Optimal training zone</span>
                              <span>0.8-1.3: Optimal training zone</span>
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-amber-500 rounded-full mr-2"></div>
                <span>1.2-1.5: Moderate injury risk</span>
                              <span>1.3-1.5: Moderate injury risk</span>
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <span>&gt;1.5: High injury risk</span>
              </li>
              <li className="flex items-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <span>&lt;0.8: Detraining risk</span>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-2">How to Use This Tool</h4>
            <ol className="space-y-3 text-sm text-slate-400">
              <li className="flex items-start">
                <span className="font-bold text-brand-cyan mr-2">1.</span>
                <span>Select an athlete and calculation date</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-brand-cyan mr-2">2.</span>
                <span>Click "Calculate ACWR" to analyze training data</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-brand-cyan mr-2">3.</span>
                <span>Review risk level and recommendations</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-brand-cyan mr-2">4.</span>
                <span>Implement suggested changes to training load</span>
              </li>
              <li className="flex items-start">
                <span className="font-bold text-brand-cyan mr-2">5.</span>
                <span>Recalculate weekly to monitor progress</span>
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ACWRCalculator;