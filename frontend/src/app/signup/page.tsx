'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login after 3 seconds
    const timer = setTimeout(() => {
      router.push('/login');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center px-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-gray-100">
        <div className="mb-6">
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-12 h-12 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Signup Disabled</h1>
          <p className="text-gray-600 text-lg mb-6">
            Public registration is not available. Only administrators can add new users.
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5 mb-6">
          <p className="text-sm font-semibold text-blue-900 mb-2">📧 Need Access?</p>
          <p className="text-sm text-blue-800">
            Contact your administrator:
          </p>
          <div className="mt-3 space-y-1">
            <p className="text-sm font-medium text-blue-900">madhan@zeoncharging.com</p>
            <p className="text-sm font-medium text-blue-900">techcrivo@gmail.com</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => router.push('/login')}
            className="w-full px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition-all shadow-md hover:shadow-lg"
          >
            Go to Login
          </button>
          <p className="text-xs text-gray-500">Redirecting automatically in 3 seconds...</p>
        </div>
      </div>
    </div>
  );
}
