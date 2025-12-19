import type { Env } from '../types';

interface GitHubFile {
  path: string;
  content: string;
  message: string;
}

interface GitHubConfig {
  owner: string;
  repo: string;
  branch: string;
  token: string;
}

interface SyncBlockRequest {
  blockName: string;
  js: string;
  css: string;
  html?: string;
  config: GitHubConfig;
}

interface SyncResult {
  success: boolean;
  files: { path: string; sha?: string; error?: string }[];
  message: string;
}

// GitHub API base URL
const GITHUB_API = 'https://api.github.com';

export async function handleGitHubSync(
  env: Env,
  request: SyncBlockRequest
): Promise<SyncResult> {
  const { blockName, js, css, config } = request;
  const { owner, repo, branch, token } = config;

  const results: SyncResult = {
    success: true,
    files: [],
    message: '',
  };

  const files: GitHubFile[] = [
    {
      path: `blocks/${blockName}/${blockName}.js`,
      content: js,
      message: `Update ${blockName} block JavaScript`,
    },
    {
      path: `blocks/${blockName}/${blockName}.css`,
      content: css,
      message: `Update ${blockName} block styles`,
    },
  ];

  for (const file of files) {
    try {
      const result = await createOrUpdateFile(owner, repo, branch, token, file);
      results.files.push({ path: file.path, sha: result.sha });
    } catch (error) {
      results.success = false;
      results.files.push({ path: file.path, error: String(error) });
    }
  }

  results.message = results.success
    ? `Successfully synced ${blockName} to ${owner}/${repo}`
    : `Partial sync of ${blockName}: ${results.files.filter((f) => f.error).length} errors`;

  return results;
}

async function createOrUpdateFile(
  owner: string,
  repo: string,
  branch: string,
  token: string,
  file: GitHubFile
): Promise<{ sha: string }> {
  const url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${file.path}`;

  // Check if file exists to get SHA for update
  let existingSha: string | undefined;
  try {
    const existingResponse = await fetch(`${url}?ref=${branch}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Chromecat-Visual-Compare',
      },
    });

    if (existingResponse.ok) {
      const existing = (await existingResponse.json()) as { sha: string };
      existingSha = existing.sha;
    }
  } catch {
    // File doesn't exist, will create new
  }

  // Create or update file
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'User-Agent': 'Chromecat-Visual-Compare',
    },
    body: JSON.stringify({
      message: file.message,
      content: btoa(file.content), // Base64 encode
      branch,
      ...(existingSha && { sha: existingSha }),
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`GitHub API error: ${response.status} - ${error}`);
  }

  const result = (await response.json()) as { content: { sha: string } };
  return { sha: result.content.sha };
}

// Get repository info
export async function getRepoInfo(
  owner: string,
  repo: string,
  token: string
): Promise<{ defaultBranch: string; private: boolean }> {
  const response = await fetch(`${GITHUB_API}/repos/${owner}/${repo}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'Chromecat-Visual-Compare',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get repo info: ${response.status}`);
  }

  const data = (await response.json()) as { default_branch: string; private: boolean };
  return {
    defaultBranch: data.default_branch,
    private: data.private,
  };
}

// List blocks in repository
export async function listBlocks(
  owner: string,
  repo: string,
  branch: string,
  token: string
): Promise<string[]> {
  const response = await fetch(
    `${GITHUB_API}/repos/${owner}/${repo}/contents/blocks?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'Chromecat-Visual-Compare',
      },
    }
  );

  if (!response.ok) {
    if (response.status === 404) {
      return []; // No blocks directory
    }
    throw new Error(`Failed to list blocks: ${response.status}`);
  }

  const contents = (await response.json()) as { name: string; type: string }[];
  return contents.filter((item) => item.type === 'dir').map((item) => item.name);
}

// Get block content from repository
export async function getBlockContent(
  owner: string,
  repo: string,
  branch: string,
  token: string,
  blockName: string
): Promise<{ js: string; css: string }> {
  const [jsResponse, cssResponse] = await Promise.all([
    fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/blocks/${blockName}/${blockName}.js?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3.raw',
          'User-Agent': 'Chromecat-Visual-Compare',
        },
      }
    ),
    fetch(
      `${GITHUB_API}/repos/${owner}/${repo}/contents/blocks/${blockName}/${blockName}.css?ref=${branch}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3.raw',
          'User-Agent': 'Chromecat-Visual-Compare',
        },
      }
    ),
  ]);

  const js = jsResponse.ok ? await jsResponse.text() : '';
  const css = cssResponse.ok ? await cssResponse.text() : '';

  return { js, css };
}
