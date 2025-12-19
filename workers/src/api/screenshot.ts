import puppeteer from '@cloudflare/puppeteer';
import type { Env, ScreenshotRequest, ScreenshotResponse } from '../types';

const DEFAULT_VIEWPORT = { width: 1280, height: 900 };

export async function handleScreenshot(
  env: Env,
  request: ScreenshotRequest
): Promise<ScreenshotResponse> {
  const { url, viewport = DEFAULT_VIEWPORT, selector, fullPage = true, hideSelectors = [] } = request;

  // Launch browser using Cloudflare's Browser Rendering API
  const browser = await puppeteer.launch(env.BROWSER);

  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);

    // Navigate to the page
    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });

    // Wait for content to settle
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Hide cookie banners and other overlays
    const defaultHideSelectors = [
      '[class*="cookie"]',
      '[id*="cookie"]',
      '.onetrust-pc-dark-filter',
      '#onetrust-banner-sdk',
      '[class*="consent"]',
      '[class*="gdpr"]',
    ];

    const allHideSelectors = [...defaultHideSelectors, ...hideSelectors];

    await page.evaluate((selectors: string[]) => {
      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          (el as HTMLElement).style.display = 'none';
        });
      });
    }, allHideSelectors);

    // Scroll to load lazy content
    if (fullPage) {
      const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
      const steps = Math.ceil(scrollHeight / 500);

      for (let i = 0; i <= steps; i++) {
        await page.evaluate((step) => window.scrollTo(0, step * 500), i);
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Scroll back to top
      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    let screenshot: Buffer;
    let width = viewport.width;
    let height = viewport.height;

    if (selector) {
      // Capture specific element
      await page.waitForSelector(selector, { timeout: 10000 });
      const element = await page.$(selector);

      if (!element) {
        throw new Error(`Element not found: ${selector}`);
      }

      const box = await element.boundingBox();
      if (box) {
        width = Math.round(box.width);
        height = Math.round(box.height);
      }

      screenshot = (await element.screenshot()) as Buffer;
    } else {
      // Capture full page or viewport
      screenshot = (await page.screenshot({ fullPage })) as Buffer;

      if (fullPage) {
        const dimensions = await page.evaluate(() => ({
          width: document.body.scrollWidth,
          height: document.body.scrollHeight,
        }));
        width = dimensions.width;
        height = dimensions.height;
      }
    }

    // Store in R2
    const key = `screenshots/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;
    await env.R2_BUCKET.put(key, screenshot, {
      httpMetadata: { contentType: 'image/png' },
    });

    return {
      screenshot: key,
      width,
      height,
    };
  } finally {
    await browser.close();
  }
}

// Utility function to take screenshots for comparison
export async function takeComparisonScreenshots(
  env: Env,
  liveUrl: string,
  testUrl: string,
  viewport = DEFAULT_VIEWPORT
): Promise<{ live: ScreenshotResponse; test: ScreenshotResponse }> {
  // Take screenshots in parallel
  const [live, test] = await Promise.all([
    handleScreenshot(env, { url: liveUrl, viewport, fullPage: true }),
    handleScreenshot(env, { url: testUrl, viewport, fullPage: true }),
  ]);

  return { live, test };
}
