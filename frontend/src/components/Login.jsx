import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { auth } from '../services/api';
import { Logo, Alert } from './ui';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    username: location.state?.username || '',
    password: '',
    answer: '',
  });
  const [securityStep, setSecurityStep] = useState(null);
  const [error, setError] = useState('');
  const [info, setInfo] = useState(location.state?.message || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setInfo('');

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
          setFormData((prev) => ({ ...prev, answer: '' }));
          return;
        }
        onLogin(response.data.user, response.data.access_token);
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please try again.');
      if (securityStep && err.response?.status === 401) {
        setSecurityStep(null);
        setFormData((prev) => ({ ...prev, answer: '' }));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-950">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="inline-block">
            <Logo className="h-12 w-12" />
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
            {securityStep ? 'Security verification' : 'Welcome back'}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {securityStep ? 'Answer your security question to continue' : 'Sign in to your HER-PACE account'}
          </p>
        </div>

        <div className="card">
          {error && <Alert onDismiss={() => setError('')}>{error}</Alert>}
          {info && (
            <Alert type="success" onDismiss={() => setInfo('')}>
              {info}
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {securityStep ? (
              <>
                <div>
                  <label className="label">{securityStep.question}</label>
                  <input
                    type="text"
                    name="answer"
                    value={formData.answer}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Your answer"
                    autoFocus
                    required
                  />
                </div>
                <button type="submit" disabled={isLoading} className="btn-primary w-full">
                  {isLoading ? 'Verifying…' : 'Verify & sign in'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSecurityStep(null);
                    setFormData((prev) => ({ ...prev, answer: '' }));
                    setError('');
                  }}
                  className="btn-ghost w-full"
                >
                  ← Back to sign in
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="label" htmlFor="username">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="your.username"
                    autoComplete="username"
                    required
                  />
                </div>
                <div>
                  <label className="label" htmlFor="password">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                </div>
                <button type="submit" disabled={isLoading} className="btn-primary w-full">
                  {isLoading ? 'Signing in…' : 'Sign in'}
                </button>
              </>
            )}
          </form>
        </div>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Don’t have an account?{' '}
          <Link to="/signup" className="font-semibold text-accent-600 hover:text-accent-500 dark:text-accent-400">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;
