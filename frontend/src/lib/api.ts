const API = process.env.NEXT_PUBLIC_API_URL;

export const apiFetch = async (url: string, options: any = {}) => {
  // Get token from localStorage if available
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  
  const res = await fetch(`${API}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }), // Add token if exists
      ...options.headers,
    },
    ...options,
  });

  return res.json();
};