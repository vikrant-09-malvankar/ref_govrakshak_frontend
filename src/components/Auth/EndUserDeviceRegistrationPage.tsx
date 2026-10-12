import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';

import EndUserDeviceRegistrationForm from './EndUserDeviceRegistrationForm';
import { EndUserDeviceRegistration } from '../../types';
import { ApiService } from '../../services/apiService';

const EndUserDeviceRegistrationPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'End User Registration | GovRakshak';

    return () => {
      document.title = previousTitle;
    };
  }, []);

  const handleRegistrationSubmit = async (data: EndUserDeviceRegistration) => {
    setLoading(true);
    setError('');

    try {
      // Send registration data to backend API
      await ApiService.createEndUserDeviceRegistration(data);
      setSubmitted(true);
    } catch (error) {
      console.error('Registration failed:', error);
      setError('Registration failed. Please try again. If the problem persists, please contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <main className="min-h-screen bg-surface-base px-4 py-10 transition-colors dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center justify-center">
          <div className="w-full rounded-card border border-surface-border bg-white p-6 shadow-card-md dark:border-slate-700 dark:bg-slate-900 sm:p-10">
          <div className="text-center">
            <div className="mx-auto h-16 w-16 bg-purple-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-purple-600" />
            </div>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
              Device Registration Submitted Successfully!
            </h2>
            <p className="mb-7 text-gray-600 dark:text-slate-300">
              Your device registration has been submitted and is pending review by the IT department. 
              You will receive a confirmation email once your registration is processed.
            </p>
            <div className="space-y-4">
              <Link
                to="/login"
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Return to Login
              </Link>
              <button
                onClick={() => setSubmitted(false)}
                className="flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-purple-500 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Register Another Device
              </button>
            </div>
          </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-surface-base px-4 py-4 transition-colors dark:bg-slate-950 sm:px-6 lg:px-8 lg:py-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-purple-50/80 to-transparent dark:from-purple-950/20" />
      <div className="relative mx-auto max-w-6xl">
      <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <img
            src="/images/govrakshak.png"
            alt="GovRakshak"
            className="h-auto max-h-14 w-auto max-w-[min(100%,22rem)] sm:max-h-[4.5rem] sm:max-w-[min(100%,26rem)]"
          />
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-purple-700">GovRakshak</p>
            <p className="text-sm text-gray-500 dark:text-slate-400">Government asset protection portal</p>
          </div>
        </div>
        <div className="max-w-xl lg:text-right">
          <h1 className="text-3xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-4xl">Register as an end user</h1>
          <p className="mt-3 text-base leading-7 text-gray-600 dark:text-slate-300">Register assigned devices and confirm delivery details.</p>
        </div>
      </header>

      {/* Error Message */}
      {error && (
        <div className="mx-auto mb-6 max-w-4xl rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/70 dark:bg-red-950/40" role="alert">
            <div className="flex items-start space-x-3">
                                              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <h4 className="text-sm font-semibold text-red-900 dark:text-red-200">Registration Error</h4>
                <p className="mt-1 text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
        </div>
      )}

      {/* Registration Form */}
      <EndUserDeviceRegistrationForm
        onSubmit={handleRegistrationSubmit}
        loading={loading}
      />

      {/* Footer */}
      <footer className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-3 text-sm text-gray-500 dark:text-slate-400">
          <span>Already have an account?</span>
          <Link to="/login" className="font-semibold text-purple-600 transition hover:text-purple-700">
            Sign in here
          </Link>
          <span className="text-gray-300 dark:text-slate-600" aria-hidden="true">|</span>
          <Link to="/login" className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-3 py-1.5 font-semibold text-gray-700 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-purple-500 dark:hover:bg-slate-700 dark:hover:text-purple-300">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to login
          </Link>
      </footer>
      </div>
    </main>
  );
};

export default EndUserDeviceRegistrationPage;
