'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    const loginDate = localStorage.getItem('loginDate');
    
    if (token) {
      // Check if it's a new day
      const currentDate = new Date().toDateString();
      if (loginDate && loginDate !== currentDate) {
        // New day detected, clear session
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginDate');
      } else {
        // Same day, redirect to dashboard
        router.push('/dashboard');
      }
    }
  }, [router]);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-emerald-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              INDIA'S MOST RELIABLE
              <span className="block text-emerald-600">EV CHARGING NETWORK</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
              Secure OTP-based authentication for seamless EV charging management
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/signup"
                className="px-8 py-4 bg-emerald-600 text-white rounded-lg font-semibold hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl"
              >
                Get Started
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 bg-white text-emerald-600 rounded-lg font-semibold border-2 border-emerald-600 hover:bg-emerald-50 transition-all"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="bg-white py-16 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div className="p-6">
              <div className="text-4xl font-bold text-emerald-600 mb-2">165+</div>
              <div className="text-gray-600 font-medium">Locations</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-emerald-600 mb-2">275+</div>
              <div className="text-gray-600 font-medium">Charge Points</div>
            </div>
            <div className="p-6">
              <div className="text-4xl font-bold text-emerald-600 mb-2">66+</div>
              <div className="text-gray-600 font-medium">Now Building</div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
            Charging your EV is <span className="text-emerald-600">As Simple As ABC</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Secure Authentication</h3>
              <p className="text-gray-600 text-center">OTP-based email authentication for maximum security and peace of mind</p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">OCPP Support</h3>
              <p className="text-gray-600 text-center">Full OCPP protocol integration for seamless charging station management</p>
            </div>

            <div className="bg-white rounded-xl p-8 shadow-md hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3 text-center">Real-time Analytics</h3>
              <p className="text-gray-600 text-center">Monitor and analyze charging performance with live data insights</p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-emerald-600 py-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-emerald-100 mb-8 text-lg">Join thousands of users managing their EV charging with Zeon</p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-white text-emerald-600 rounded-lg font-semibold hover:bg-gray-100 transition-all shadow-lg"
          >
            Create Your Account
          </Link>
        </div>
      </div>
    </div>
  );
}
