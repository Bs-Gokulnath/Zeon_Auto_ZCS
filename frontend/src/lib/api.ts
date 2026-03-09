// Node.js Backend (Authentication)
const AUTH_API = process.env.NEXT_PUBLIC_API_URL;

// Python FastAPI Backend (Dashboard/Analytics)
const DASHBOARD_API = process.env.NEXT_PUBLIC_DASHBOARD_API_URL;

// Auth API fetch (Node.js backend with JWT token)
export const apiFetch = async (url: string, options: any = {}) => {
  // Get token from localStorage if available
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const res = await fetch(`${AUTH_API}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }), // Add token if exists
      ...options.headers,
    },
    ...options,
  });

  return res.json();
};

// Dashboard API fetch (Python FastAPI backend, no auth token needed)
export const dashboardFetch = async (url: string, options: any = {}) => {
  const res = await fetch(`${DASHBOARD_API}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  return res.json();
};