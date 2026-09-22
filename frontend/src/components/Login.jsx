import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../services/api';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    answer: '',
  });
  const [securityStep, setSecurityStep] = useState(null);
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

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
    setIsLoading(true);
    setErrors({});

    try {
      if (securityStep) {
        const response = await auth.verifySecurity({
          security_challenge: securityStep.challenge,
          question_id: securityStep.questionId,
          answer: formData.answer,
        });

        if (response.data.success) {
          onLogin(response.data.user, response.data.access_token);
          navigate('/dashboard');
        }
        return;
      }

      const response = await auth.login(formData.username, formData.password);

      if (response.data.success) {
        if (response.data.requires_security_question) {
          setSecurityStep({
            challenge: response.data.security_challenge,
            questionId: response.data.question_id,
            question: response.data.question,
          });
          setFormData(prev => ({ ...prev, answer: '' }));
          return;
        }

        onLogin(response.data.user, response.data.access_token);
        navigate('/dashboard');
      }
    } catch (error) {
      console.error('Login error:', error);
      if (error.response?.data?.message) {
        setErrors({ general: error.response.data.message });
      } else {
        setErrors({ general: 'Login failed. Please try again.' });
      }
      if (securityStep && error.response?.status === 401) {
        setSecurityStep(null);
        setFormData(prev => ({ ...prev, answer: '' }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackToCredentials = () => {
    setSecurityStep(null);
    setFormData(prev => ({ ...prev, answer: '' }));
    setErrors({});
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-brand-bg-dark via-gray-900 to-brand-bg-dark">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-brand-cyan to-brand-cyan-dark rounded-2xl mb-6 shadow-lg shadow-cyan-500/20">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7V9H4V18H6V11H8V18H10V9H12V18H14V11H16V18H18V9H20V7L12 2ZM12 4.53L17.11 7H6.89L12 4.53Z" fill="currentColor"/>
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-white mb-3">
            <span className="bg-gradient-to-r from-brand-cyan to-white bg-clip-text text-transparent">
              HER-PACE
            </span>
          </h1>
          <p className="text-slate-400 text-lg">Athlete Monitoring System</p>
        </div>

        <div className="bg-brand-bg-light border border-brand-border rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center mb-8">
            <div className="h-10 w-1 bg-gradient-to-b from-brand-cyan to-brand-cyan-dark rounded-full mr-3"></div>
            <h2 className="text-2xl font-bold text-white">
              {securityStep ? 'Security Verification' : 'Welcome Back'}
            </h2>
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

          <form onSubmit={handleSubmit} className="space-y-6">
            {!securityStep ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                    placeholder="Enter your username"
                    disabled={isLoading}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                </div>
              </>
            ) : (
              <>
                <p className="text-slate-300 text-sm">
                  Answer your security question to complete sign-in as super admin.
                </p>
                <div className="rounded-lg bg-slate-900/60 border border-slate-700 p-4">
                  <p className="text-white font-medium">{securityStep.question}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Your answer</label>
                  <input
                    type="text"
                    name="answer"
                    value={formData.answer}
                    onChange={handleChange}
                    autoComplete="off"
                    className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-cyan focus:border-transparent"
                    placeholder="Enter your answer"
                    disabled={isLoading}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleBackToCredentials}
                  className="text-sm text-slate-400 hover:text-white"
                >
                  ← Back to username and password
                </button>
              </>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-brand-cyan to-brand-cyan-dark hover:from-brand-cyan-dark hover:to-brand-cyan text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30"
            >
              {isLoading ? 'Signing in...' : securityStep ? 'Verify & Sign In' : 'Sign In'}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-700"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-4 bg-brand-bg-light text-slate-500">New to HER-PACE?</span>
            </div>
          </div>

          <div className="text-center">
            <Link
              to="/signup"
              className="inline-flex items-center text-brand-cyan hover:text-white font-medium transition-colors"
            >
              Create an account
            </Link>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-700">
            <p className="text-center text-sm text-slate-500">
              Demo credentials:
              <span className="font-mono text-slate-400 ml-2">coach</span>
              <span className="text-slate-600 mx-2">/</span>
              <span className="font-mono text-slate-400">password123</span>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-600">
            © {new Date().getFullYear()} HER-PACE. Athlete monitoring for the modern coach.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
