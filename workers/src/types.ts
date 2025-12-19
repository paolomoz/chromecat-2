import type { BrowserWorker } from '@cloudflare/puppeteer';

// Cloudflare bindings
export interface Env {
  BROWSER: BrowserWorker;
  R2_BUCKET: R2Bucket;
  KV: KVNamespace;
  DB: D1Database;
  ENVIRONMENT: string;
  CORS_ORIGIN: string;
}

// API request/response types
export interface ScrapeRequest {
  url: string;
  viewport?: { width: number; height: number };
}

export interface ScrapeResponse {
  url: string;
  title: string;
  html: string;
  images: { src: string; alt: string }[];
  sections: { selector: string; html: string }[];
  screenshot: string;
}

export interface ScreenshotRequest {
  url: string;
  viewport?: { width: number; height: number };
  selector?: string;
  fullPage?: boolean;
  hideSelectors?: string[];
}

export interface ScreenshotResponse {
  screenshot: string;
  width: number;
  height: number;
}

export interface CompareRequest {
  liveUrl?: string;
  testUrl?: string;
  liveScreenshot?: string;
  testScreenshot?: string;
  regions?: Region[];
  threshold?: number;
  viewport?: { width: number; height: number };
}

// Selector-based region (preferred - finds element by CSS selector)
export interface SelectorRegion {
  name: string;
  description?: string;
  selector: string;           // CSS selector to find the element
  liveSelector?: string;      // Optional different selector for live site
  testSelector?: string;      // Optional different selector for test site
}

// Legacy Y-based region (fallback)
export interface YBasedRegion {
  name: string;
  description?: string;
  liveYStart: number;
  testYStart: number;
  height: number;
}

// Union type for backwards compatibility
export type Region = SelectorRegion | YBasedRegion;

// Type guard to check if region is selector-based
export function isSelectorRegion(region: Region): region is SelectorRegion {
  return 'selector' in region || 'liveSelector' in region || 'testSelector' in region;
}

export interface CompareResult {
  name: string;
  description?: string;
  diff: number;
  status: 'PASS' | 'CLOSE' | 'FAIL' | 'ERROR';
  diffImage: string;
  liveImage?: string;
  testImage?: string;
  width?: number;
  height?: number;
  error?: string;
}

export interface CompareResponse {
  results: CompareResult[];
  summary: string;
  liveScreenshot?: string;
  testScreenshot?: string;
}

// Database models
export interface Project {
  id: string;
  name: string;
  source_url: string;
  test_url?: string;
  github_repo?: string;
  eds_host?: string;
  created_at: number;
  updated_at: number;
}

export interface Block {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  js?: string;
  css?: string;
  html?: string;
  live_region_y: number;
  test_region_y: number;
  region_height: number;
  created_at: number;
  updated_at: number;
}

export interface TestResult {
  id: string;
  project_id: string;
  block_name: string;
  diff_percentage: number;
  status: 'PASS' | 'CLOSE' | 'FAIL' | 'ERROR';
  live_screenshot?: string;
  test_screenshot?: string;
  diff_image?: string;
  metadata?: string;
  created_at: number;
}
