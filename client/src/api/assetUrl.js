/**
 * Resolve an asset URL (like /uploads/logo.jpg) to a full URL accessible from the browser.
 * 
 * The backend stores file paths as relative URLs like "/uploads/filename.jpg".
 * In the browser, these need to be prefixed with the API server base URL
 * since the frontend dev server (Vite) runs on a different port.
 * 
 * This function handles:
 * - Already-absolute URLs (http/https) — returned as-is
 * - Data URIs — returned as-is
 * - Empty/falsy values — returned as empty string
 * - Relative paths like /uploads/... — prefixed with API base URL
 */
const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:5000/api');
const API_BASE = rawApiUrl.replace(/\/api\/?$/, '');

export const resolveAssetUrl = (url) => {
  if (!url || typeof url !== 'string') return '';

  // Already absolute or data URI
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }

  // Relative path — prefix with server base URL
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

export default resolveAssetUrl;
