import { Hono } from 'hono';
import type { Env, ScrapeRequest, ScreenshotRequest, CompareRequest } from './types';
import { handleScreenshot } from './api/screenshot';
import { handleCompare } from './api/compare';
import { handleScrape } from './api/scrape';
import { handleGitHubSync, getRepoInfo, listBlocks, getBlockContent } from './api/github';

const app = new Hono<{ Bindings: Env }>();

// CORS middleware - allow all origins for development
app.use('*', async (c, next) => {
  // Handle preflight requests
  if (c.req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  await next();

  // Add CORS headers to all responses
  c.res.headers.set('Access-Control-Allow-Origin', '*');
  c.res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  c.res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
});

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Chromecat Visual Compare API',
    version: '1.0.0',
    status: 'ok',
    endpoints: [
      '/api/scrape',
      '/api/screenshot',
      '/api/compare',
      '/api/github/sync',
      '/api/github/blocks',
      '/api/projects',
    ],
  });
});

// Scrape endpoint - fetch and analyze a page
app.post('/api/scrape', async (c) => {
  try {
    const body = await c.req.json<ScrapeRequest>();
    if (!body.url) {
      return c.json({ error: 'URL is required' }, 400);
    }
    const result = await handleScrape(c.env, body);
    return c.json(result);
  } catch (error) {
    console.error('Scrape error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Screenshot endpoint - capture page or element screenshot
app.post('/api/screenshot', async (c) => {
  try {
    const body = await c.req.json<ScreenshotRequest>();
    if (!body.url) {
      return c.json({ error: 'URL is required' }, 400);
    }
    const result = await handleScreenshot(c.env, body);
    return c.json(result);
  } catch (error) {
    console.error('Screenshot error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Compare endpoint - run pixelmatch comparison
app.post('/api/compare', async (c) => {
  try {
    const body = await c.req.json<CompareRequest>();
    if (!body.liveUrl && !body.liveScreenshot) {
      return c.json({ error: 'Either liveUrl or liveScreenshot is required' }, 400);
    }
    if (!body.testUrl && !body.testScreenshot) {
      return c.json({ error: 'Either testUrl or testScreenshot is required' }, 400);
    }
    const result = await handleCompare(c.env, body);
    return c.json(result);
  } catch (error) {
    console.error('Compare error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Get screenshot from R2
app.get('/screenshots/:key', async (c) => {
  const key = c.req.param('key');
  const object = await c.env.R2_BUCKET.get(`screenshots/${key}`);

  if (!object) {
    return c.json({ error: 'Screenshot not found' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', 'image/png');
  headers.set('Cache-Control', 'public, max-age=3600');

  return new Response(object.body, { headers });
});

// Get diff image from R2
app.get('/diffs/:key', async (c) => {
  const key = c.req.param('key');
  const object = await c.env.R2_BUCKET.get(`diffs/${key}`);

  if (!object) {
    return c.json({ error: 'Diff image not found' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', 'image/png');
  headers.set('Cache-Control', 'public, max-age=3600');

  return new Response(object.body, { headers });
});

// Get region image from R2
app.get('/regions/:key', async (c) => {
  const key = c.req.param('key');
  const object = await c.env.R2_BUCKET.get(`regions/${key}`);

  if (!object) {
    return c.json({ error: 'Region image not found' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', 'image/png');
  headers.set('Cache-Control', 'public, max-age=3600');

  return new Response(object.body, { headers });
});

// GitHub sync endpoint - push block to repository
app.post('/api/github/sync', async (c) => {
  try {
    const body = await c.req.json();
    const { blockName, js, css, owner, repo, branch, token } = body;

    if (!blockName || !js || !css) {
      return c.json({ error: 'blockName, js, and css are required' }, 400);
    }
    if (!owner || !repo || !token) {
      return c.json({ error: 'GitHub owner, repo, and token are required' }, 400);
    }

    const result = await handleGitHubSync(c.env, {
      blockName,
      js,
      css,
      config: { owner, repo, branch: branch || 'main', token },
    });

    return c.json(result);
  } catch (error) {
    console.error('GitHub sync error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// GitHub list blocks endpoint
app.get('/api/github/blocks', async (c) => {
  try {
    const owner = c.req.query('owner');
    const repo = c.req.query('repo');
    const branch = c.req.query('branch') || 'main';
    const token = c.req.header('Authorization')?.replace('Bearer ', '');

    if (!owner || !repo || !token) {
      return c.json({ error: 'owner, repo, and Authorization header are required' }, 400);
    }

    const blocks = await listBlocks(owner, repo, branch, token);
    return c.json({ blocks });
  } catch (error) {
    console.error('GitHub list blocks error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// GitHub get block content endpoint
app.get('/api/github/blocks/:blockName', async (c) => {
  try {
    const blockName = c.req.param('blockName');
    const owner = c.req.query('owner');
    const repo = c.req.query('repo');
    const branch = c.req.query('branch') || 'main';
    const token = c.req.header('Authorization')?.replace('Bearer ', '');

    if (!owner || !repo || !token) {
      return c.json({ error: 'owner, repo, and Authorization header are required' }, 400);
    }

    const content = await getBlockContent(owner, repo, branch, token, blockName);
    return c.json({ blockName, ...content });
  } catch (error) {
    console.error('GitHub get block error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// GitHub repo info endpoint
app.get('/api/github/repo', async (c) => {
  try {
    const owner = c.req.query('owner');
    const repo = c.req.query('repo');
    const token = c.req.header('Authorization')?.replace('Bearer ', '');

    if (!owner || !repo || !token) {
      return c.json({ error: 'owner, repo, and Authorization header are required' }, 400);
    }

    const info = await getRepoInfo(owner, repo, token);
    return c.json({ owner, repo, ...info });
  } catch (error) {
    console.error('GitHub repo info error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Project management endpoints
app.get('/api/projects', async (c) => {
  try {
    const results = await c.env.DB.prepare(
      'SELECT * FROM projects ORDER BY updated_at DESC'
    ).all();
    return c.json({ projects: results.results });
  } catch (error) {
    console.error('List projects error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.post('/api/projects', async (c) => {
  try {
    const body = await c.req.json();
    const { name, source_url, test_url, github_repo, eds_host } = body;

    if (!name || !source_url) {
      return c.json({ error: 'name and source_url are required' }, 400);
    }

    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO projects (id, name, source_url, test_url, github_repo, eds_host)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
      .bind(id, name, source_url, test_url || null, github_repo || null, eds_host || null)
      .run();

    return c.json({ id, name, source_url, test_url, github_repo, eds_host });
  } catch (error) {
    console.error('Create project error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.get('/api/projects/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const project = await c.env.DB.prepare('SELECT * FROM projects WHERE id = ?')
      .bind(id)
      .first();

    if (!project) {
      return c.json({ error: 'Project not found' }, 404);
    }

    // Get blocks for this project
    const blocks = await c.env.DB.prepare('SELECT * FROM blocks WHERE project_id = ?')
      .bind(id)
      .all();

    // Get recent test results
    const results = await c.env.DB.prepare(
      'SELECT * FROM test_results WHERE project_id = ? ORDER BY created_at DESC LIMIT 50'
    )
      .bind(id)
      .all();

    return c.json({
      ...project,
      blocks: blocks.results,
      testResults: results.results,
    });
  } catch (error) {
    console.error('Get project error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

app.delete('/api/projects/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM projects WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete project error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

// Save test results
app.post('/api/results', async (c) => {
  try {
    const body = await c.req.json();
    const { project_id, block_name, diff_percentage, status, live_screenshot, test_screenshot, diff_image } = body;

    if (!project_id || !block_name) {
      return c.json({ error: 'project_id and block_name are required' }, 400);
    }

    const id = crypto.randomUUID();
    await c.env.DB.prepare(
      `INSERT INTO test_results (id, project_id, block_name, diff_percentage, status, live_screenshot, test_screenshot, diff_image)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
      .bind(id, project_id, block_name, diff_percentage, status, live_screenshot, test_screenshot, diff_image)
      .run();

    return c.json({ id, project_id, block_name, diff_percentage, status });
  } catch (error) {
    console.error('Save result error:', error);
    return c.json({ error: String(error) }, 500);
  }
});

export default app;
