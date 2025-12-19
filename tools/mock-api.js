/**
 * Mock API for local development
 * Simulates Cloudflare Worker responses when backend isn't available
 */

// Sample comparison results for demo
const MOCK_RESULTS = {
  results: [
    { name: 'quick-links', description: 'Quick Links', diff: 3.97, status: 'PASS', diffImage: '', liveImage: '', testImage: '' },
    { name: 'products', description: 'Product Cards', diff: 13.25, status: 'CLOSE', diffImage: '', liveImage: '', testImage: '' },
    { name: 'text-columns', description: 'Text Columns', diff: 3.07, status: 'PASS', diffImage: '', liveImage: '', testImage: '' },
    { name: 'news', description: 'News Cards', diff: 15.11, status: 'CLOSE', diffImage: '', liveImage: '', testImage: '' },
    { name: 'footer', description: 'Footer', diff: 5.51, status: 'PASS', diffImage: '', liveImage: '', testImage: '' },
  ],
  summary: '3 passed, 2 close, 0 need work',
  liveScreenshot: '',
  testScreenshot: '',
};

const MOCK_SCRAPE = {
  url: '',
  title: 'Sample Page',
  html: '<main>...</main>',
  images: [
    { src: 'https://example.com/image1.jpg', alt: 'Image 1' },
    { src: 'https://example.com/image2.jpg', alt: 'Image 2' },
  ],
  sections: [
    { selector: '.hero', html: '<section class="hero">...</section>' },
    { selector: '.content', html: '<section class="content">...</section>' },
  ],
  screenshot: '',
};

// Check if real API is available
async function checkApiAvailable(endpoint) {
  try {
    const response = await fetch(endpoint, { method: 'GET', signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

// Mock fetch wrapper
async function mockFetch(url, options = {}) {
  const apiEndpoint = window.chromecatApiEndpoint || 'http://localhost:8787';

  // Try real API first (but not for endpoints that need Browser Rendering)
  const urlObj = new URL(url, window.location.origin);
  const path = urlObj.pathname;

  // Try real API for all endpoints now that Browser Rendering is enabled
  {
    try {
      const response = await fetch(url, { ...options, signal: AbortSignal.timeout(180000) }); // 3 min timeout for comparison
      if (response.ok) {
        return response;
      }
      // Non-ok response, fall through to mock
    } catch {
      // Network error, fall through to mock
    }
  }

  console.log(`[Mock API] Handling ${options.method || 'GET'} ${path}`);

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500 + Math.random() * 1000));

  // Mock responses
  if (path.includes('/api/compare')) {
    const body = options.body ? JSON.parse(options.body) : {};
    return new Response(JSON.stringify({
      ...MOCK_RESULTS,
      sourceUrl: body.liveUrl,
      testUrl: body.testUrl,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (path.includes('/api/scrape')) {
    const body = options.body ? JSON.parse(options.body) : {};
    return new Response(JSON.stringify({
      ...MOCK_SCRAPE,
      url: body.url,
      title: `Scraped: ${body.url}`,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (path.includes('/api/screenshot')) {
    return new Response(JSON.stringify({
      screenshot: `mock-screenshot-${Date.now()}.png`,
      width: 1280,
      height: 2000,
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (path.includes('/api/projects')) {
    if (options.method === 'POST') {
      const body = options.body ? JSON.parse(options.body) : {};
      return new Response(JSON.stringify({
        id: `project-${Date.now()}`,
        ...body,
        created_at: Date.now(),
        updated_at: Date.now(),
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({
      projects: [
        {
          id: 'demo-vac',
          name: 'Virgin Atlantic Cargo',
          source_url: 'https://www.virginatlanticcargo.com/gb/en.html',
          test_url: 'http://localhost:3000/test/vac-homepage.html',
          created_at: Date.now() - 86400000,
          updated_at: Date.now(),
        },
      ],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (path.includes('/api/github')) {
    return new Response(JSON.stringify({
      success: true,
      message: 'Mock GitHub sync - no changes made',
      files: [],
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Default 404
  return new Response(JSON.stringify({ error: 'Not found (mock)' }), {
    status: 404,
    headers: { 'Content-Type': 'application/json' },
  });
}

// Install mock API
function installMockApi() {
  const originalFetch = window.fetch;
  const apiEndpoint = window.chromecatApiEndpoint || 'http://localhost:8787';

  window.fetch = async (url, options) => {
    const urlStr = typeof url === 'string' ? url : url.toString();

    // Only intercept API calls
    if (urlStr.startsWith(apiEndpoint) || urlStr.includes('/api/')) {
      return mockFetch(urlStr, options);
    }

    // Pass through other requests
    return originalFetch(url, options);
  };

  console.log('[Mock API] Installed - API calls will be simulated if backend unavailable');
}

// Auto-install if API endpoint is not reachable
async function autoInstallMockApi() {
  const apiEndpoint = window.chromecatApiEndpoint || 'http://localhost:8787';

  const isAvailable = await checkApiAvailable(apiEndpoint);

  if (!isAvailable) {
    console.log('[Mock API] Backend not available, installing mock API');
    installMockApi();
    return true;
  }

  console.log('[Mock API] Backend available, using real API');
  return false;
}

// Export for use in tool pages
window.ChromecatMockApi = {
  install: installMockApi,
  autoInstall: autoInstallMockApi,
  MOCK_RESULTS,
  MOCK_SCRAPE,
};
