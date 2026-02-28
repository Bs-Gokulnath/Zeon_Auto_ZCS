const API = process.env.NEXT_PUBLIC_API_URL;

export const apiFetch = async (url: string, options: any = {}) => {
  const res = await fetch(`${API}${url}`, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  return res.json();
};