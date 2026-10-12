import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowLeft, CheckCircle } from 'lucide-react';
import BuyerRegistrationForm from './BuyerRegistrationForm';
import { BuyerRegistrationSubmission } from '../../types';
import { ApiService } from '../../services/apiService';

const BuyerRegistrationPage: React.FC = () => {
  // Form data managed by BuyerRegistrationForm component
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const previousTitle = document.title;
    document.title = 'Buyer Registration | GovRakshak';

    return () => {
      document.title = previousTitle;
    };
  }, []);

  const handleSubmit = async (registrationData: BuyerRegistrationSubmission) => {
    setLoading(true);
    setError('');

    try {
      // Send registration data to backend API
      await ApiService.createBuyerRegistration(registrationData);
      setSuccess(true);
    } catch (error) {
      console.error('Registration failed:', error);
      setError('Registration failed. Please try again. If the problem persists, please contact support.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen bg-surface-base px-4 py-10 transition-colors dark:bg-slate-950 sm:px-6 lg:px-8">
        <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-2xl items-center justify-center">
          <div className="w-full rounded-card border border-surface-border bg-white p-6 shadow-card-md transition-colors dark:border-slate-700 dark:bg-slate-900 sm:p-10">
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-success-100 ring-8 ring-success-50">
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.16em] text-success-700">Application received</p>
            <h2 className="mb-4 text-3xl font-bold tracking-tight text-gray-950 dark:text-white">
              Registration Submitted Successfully!
            </h2>
            <p className="mb-7 text-gray-600 dark:text-slate-300">
              Your buyer registration has been submitted and is pending approval by a Super Administrator.
            </p>
            
            <div className="mb-7 rounded-btn border border-info-100 bg-info-50 p-5 text-left dark:border-blue-900/70 dark:bg-blue-950/40">
              <div className="flex items-start space-x-3">
                <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                    What happens next?
                  </h4>
                  <ul className="mt-2 space-y-2 text-sm leading-6 text-blue-700 dark:text-blue-300">
                    <li>• Your registration will be reviewed within 2-3 business days</li>
                    <li>• You'll receive an email notification with the approval status</li>
                    <li>• Once approved, you can log in with your email and temporary password</li>
                    <li>• You'll be prompted to change your password on first login</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Link
                to="/login"
                className="flex w-full items-center justify-center rounded-btn bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
              >
                Return to Login
              </Link>
              
              <button
                onClick={() => setSuccess(false)}
                className="flex w-full items-center justify-center rounded-btn border border-surface-border bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Register Another Organization
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
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-primary-50/80 to-transparent dark:from-blue-950/30" />
      <div className="relative mx-auto max-w-6xl">
        <header className="mb-7 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-4">
              <img
                src="/images/govrakshak.png"
                alt="GovRakshak"
                className="h-auto max-h-14 w-auto max-w-[min(100%,22rem)] sm:max-h-[4.5rem] sm:max-w-[min(100%,26rem)]"
              />
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary-700">GovRakshak</p>
                <p className="text-sm text-gray-500 dark:text-slate-400">Government asset protection portal</p>
              </div>
            </div>
          </div>
          <div className="max-w-xl lg:text-right">
            <h1 className="text-3xl font-bold tracking-tight text-gray-950 dark:text-white sm:text-4xl">Register your organization</h1>
            <p className="mt-3 text-base leading-7 text-gray-600 dark:text-slate-300">Create a secure procurement account for your government organization.</p>
          </div>
        </header>

        {/* <div className="mb-8 grid gap-4 sm:grid-cols-3">
          {[
            { icon: ClipboardCheck, title: 'Complete details', text: 'Tell us about your organization' },
            { icon: LockKeyhole, title: 'Secure by design', text: 'Your information stays protected' },
            { icon: Clock3, title: 'Quick review', text: 'Approval in 2-3 business days' },
          ].map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3 rounded-btn border border-surface-border bg-white/80 p-4 shadow-sm backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/80">
              <Icon className="mt-0.5 h-5 w-5 shrink-0 text-primary-600" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">{title}</p>
                <p className="mt-1 text-xs leading-5 text-gray-500 dark:text-slate-400">{text}</p>
              </div>
            </div>
          ))}
        </div> */}

      {/* Error Message */}
      {error && (
        <div className="mx-auto mb-6 max-w-4xl rounded-btn border border-danger-100 bg-danger-50 p-4 shadow-sm dark:border-red-900/70 dark:bg-red-950/40" role="alert">
            <div className="flex items-start gap-3">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger-600" />
              <div>
                <h4 className="text-sm font-semibold text-danger-800">Registration error</h4>
                <p className="mt-1 text-sm text-danger-700">{error}</p>
              </div>
            </div>
        </div>
      )}

      {/* Registration Form */}
      <BuyerRegistrationForm 
        onSubmit={handleSubmit}
        loading={loading}
      />

      {/* Footer */}
      <footer className="mx-auto mt-6 flex max-w-4xl flex-wrap items-center justify-center gap-3 text-sm text-gray-500 dark:text-slate-400">
          <span>Already have an account?</span>
          <Link to="/login" className="font-semibold text-primary-700 transition hover:text-primary-800">
            Sign in here
          </Link>
          <span className="text-gray-300 dark:text-slate-600" aria-hidden="true">|</span>
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 rounded-btn border border-surface-border bg-white px-3 py-1.5 font-semibold text-gray-700 transition hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-blue-500 dark:hover:bg-slate-700 dark:hover:text-blue-300"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            Back to login
          </Link>
      </footer>
      </div>
    </main>
  );
};

export default BuyerRegistrationPage; 