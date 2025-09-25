/**
 * Utility function to make authenticated fetch requests
 * Automatically includes the auth token in the request headers
 */
export const fetchWithAuth = async (url, options = {}) => {
  // Get the auth token from localStorage
  const token = localStorage.getItem('token');

  // Prepare headers
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    ...(options.headers || {})
  };

  // In production (Vercel), always use relative paths that get proxied
  // In development, use the Vite proxy
  const baseUrl = import.meta.env.DEV ? '/api' : '/api';

  // Remove leading slash from url if it exists to prevent double slashes
  const cleanUrl = url.startsWith('/') ? url.substring(1) : url;

  // Construct the full URL (always relative in production)
  const fullUrl = `${baseUrl}/${cleanUrl}`;

  // Debug logging
  console.log('=== fetchWithAuth Debug ===');
  console.log('Original URL:', url);
  console.log('Base URL:', baseUrl);
  console.log('Clean URL:', cleanUrl);
  console.log('Full URL:', fullUrl);
  console.log('Environment:', import.meta.env.MODE);
  console.log('VITE_APP_URL:', import.meta.env.VITE_APP_URL);
  console.log('Is Dev:', import.meta.env.DEV);
  console.log('========================');

  try {
    // Make the fetch request with the auth token
    const response = await fetch(fullUrl, {
      ...options,
      headers
    });

    // If the response is 401 (Unauthorized), clear the token but don't redirect
    if (response.status === 401) {
      localStorage.removeItem('token');
      throw new Error('Session expired. Please login again.');
    }

    // Check if response is HTML (which indicates a proxy/routing issue)
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('text/html')) {
      console.error('=== fetchWithAuth Error: Received HTML instead of JSON ===');
      console.error('This usually means the API request is hitting the frontend instead of being proxied');
      console.error('Response status:', response.status);
      console.error('Response URL:', response.url);
      console.error('Content-Type:', contentType);

      // Try to get the response text to see what HTML we're getting
      const htmlText = await response.text();
      console.error('HTML Response (first 500 chars):', htmlText.substring(0, 500));

      throw new Error(`API proxy error: Received HTML instead of JSON. This usually means the request is not being proxied correctly to the backend. Status: ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error('=== fetchWithAuth Error ===');
    console.error('Error making request to:', fullUrl);
    console.error('Error details:', error);
    throw error;
  }
}; 