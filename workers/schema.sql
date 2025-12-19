-- Chromecat Visual Comparison Database Schema

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  source_url TEXT NOT NULL,
  test_url TEXT,
  github_repo TEXT,
  eds_host TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Blocks table
CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  js TEXT,
  css TEXT,
  html TEXT,
  live_region_y INTEGER DEFAULT 0,
  test_region_y INTEGER DEFAULT 0,
  region_height INTEGER DEFAULT 200,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Test results table
CREATE TABLE IF NOT EXISTS test_results (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  block_name TEXT NOT NULL,
  diff_percentage REAL,
  status TEXT CHECK(status IN ('PASS', 'CLOSE', 'FAIL', 'ERROR')),
  live_screenshot TEXT,
  test_screenshot TEXT,
  diff_image TEXT,
  metadata TEXT, -- JSON for additional data
  created_at INTEGER DEFAULT (unixepoch())
);

-- Screenshots table
CREATE TABLE IF NOT EXISTS screenshots (
  id TEXT PRIMARY KEY,
  project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
  type TEXT CHECK(type IN ('live', 'test', 'diff', 'region')),
  r2_key TEXT NOT NULL,
  url TEXT,
  width INTEGER,
  height INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_blocks_project ON blocks(project_id);
CREATE INDEX IF NOT EXISTS idx_results_project ON test_results(project_id);
CREATE INDEX IF NOT EXISTS idx_results_created ON test_results(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_screenshots_project ON screenshots(project_id);
