'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const loginDate = localStorage.getItem('loginDate');
    const currentDate = new Date().toDateString();

    if (token) {
      if (loginDate && loginDate !== currentDate) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginDate');
        router.replace('/login');
        return;
      }

      router.replace('/dashboard');
      return;
    }

    router.replace('/login');
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-red-200 border-t-red-600" />
    </div>
  );
}
