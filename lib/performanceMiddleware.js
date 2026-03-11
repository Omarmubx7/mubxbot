// Performance middleware for compression and caching headers
export function applyPerformanceHeaders(response) {
  // Enable compression (Next.js automatically handles gzip)
  response.headers.set('Content-Encoding', 'gzip');
  
  // Cache static resources
  response.headers.set('Cache-Control', 'public, max-age=31536000, immutable');
  
  return response;
}

export function applyCacheHeaders(response, maxAgeSeconds = 60) {
  response.headers.set('Cache-Control', `public, max-age=${maxAgeSeconds}, s-maxage=${maxAgeSeconds}`);
  return response;
}

export function applyNoCacheHeaders(response) {
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  return response;
}
