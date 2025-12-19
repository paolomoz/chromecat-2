import pixelmatch from 'pixelmatch';
import UPNG from 'upng-js';
import puppeteer from '@cloudflare/puppeteer';
import type { Env, CompareRequest, CompareResponse, CompareResult, Region, SelectorRegion, YBasedRegion } from '../types';
import { isSelectorRegion } from '../types';

const DEFAULT_THRESHOLD = 0.35;
const DEFAULT_VIEWPORT = { width: 1280, height: 900 };

// Default selector-based regions for Virgin Atlantic Cargo (more reliable than Y-offsets)
// Live site uses original VAC classes, test site uses EDS block classes
const DEFAULT_REGIONS: SelectorRegion[] = [
  {
    name: 'hero-carousel',
    description: 'Hero Carousel',
    selector: '.cargo-carousel, .cmp-carousel, .vac-hero-carousel',
    liveSelector: '.cargo-carousel, .cmp-carousel',
    testSelector: '.vac-hero-carousel'
  },
  {
    name: 'quick-links',
    description: 'Quick Links / Book Panel',
    selector: '.bookPanelWrapper, .bookpanel, .vac-quick-links',
    liveSelector: '.bookPanelWrapper, .bookpanel',
    testSelector: '.vac-quick-links'
  },
  {
    name: 'products',
    description: 'Product Cards (Explore our product range)',
    selector: '.textAsset3ColVideo, .textAssetMultiColComp, .vac-product-cards',
    liveSelector: '.textAsset3ColVideo, .textAssetMultiColComp',
    testSelector: '.vac-product-cards'
  },
  {
    name: 'footer',
    description: 'Footer',
    selector: '#footer, .footer_links, .vac-footer, footer',
    liveSelector: '#footer, .footer_links, footer',
    testSelector: '.vac-footer'
  },
];

interface DecodedImage {
  width: number;
  height: number;
  data: Uint8Array;
}

function decodePNG(buffer: ArrayBuffer): DecodedImage {
  const img = UPNG.decode(buffer);
  const rgba = UPNG.toRGBA8(img)[0];
  return {
    width: img.width,
    height: img.height,
    data: new Uint8Array(rgba),
  };
}

function encodePNG(width: number, height: number, data: Uint8Array): ArrayBuffer {
  return UPNG.encode([data.buffer], width, height, 0);
}

export async function handleCompare(
  env: Env,
  request: CompareRequest
): Promise<CompareResponse> {
  const {
    liveUrl,
    testUrl,
    regions = DEFAULT_REGIONS,
    threshold = DEFAULT_THRESHOLD,
    viewport = DEFAULT_VIEWPORT,
  } = request;

  if (!liveUrl || !testUrl) {
    throw new Error('Both liveUrl and testUrl are required');
  }

  // Check if using selector-based or Y-based regions
  const useSelectorBased = regions.length > 0 && isSelectorRegion(regions[0]);

  if (useSelectorBased) {
    return handleSelectorBasedCompare(env, liveUrl, testUrl, regions as SelectorRegion[], threshold, viewport);
  } else {
    return handleYBasedCompare(env, liveUrl, testUrl, regions as YBasedRegion[], threshold, viewport);
  }
}

// New selector-based comparison - more reliable
async function handleSelectorBasedCompare(
  env: Env,
  liveUrl: string,
  testUrl: string,
  regions: SelectorRegion[],
  threshold: number,
  viewport: { width: number; height: number }
): Promise<CompareResponse> {
  const browser = await puppeteer.launch(env.BROWSER);
  const results: CompareResult[] = [];

  try {
    // Prepare page: simple navigation like debug endpoint
    const preparePage = async (page: any, url: string) => {
      await page.setViewport(viewport);
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
      await new Promise(r => setTimeout(r, 2000));

      // Hide cookie banners and overlays
      await page.evaluate(() => {
        const selectors = [
          '[class*="cookie"]', '[id*="cookie"]', '.onetrust-pc-dark-filter',
          '#onetrust-banner-sdk', '[class*="consent"]', '[class*="gdpr"]',
          '[class*="banner"]', '[class*="popup"]', '[class*="modal"]'
        ];
        selectors.forEach(sel => {
          document.querySelectorAll(sel).forEach((el: any) => {
            el.style.display = 'none';
          });
        });
      });
    };

    // Capture screenshots for each region from both pages
    // Using a different approach: capture live screenshots first, then test screenshots

    const liveScreenshots: Map<string, Uint8Array> = new Map();
    const testScreenshots: Map<string, Uint8Array> = new Map();

    // Open and prepare live page, capture all screenshots
    const livePage = await browser.newPage();
    await preparePage(livePage, liveUrl);

    // Capture all live screenshots BEFORE opening test page
    for (const region of regions) {
      const liveSelector = region.liveSelector || region.selector;
      const screenshot = await captureElementBySelector(livePage, liveSelector, region.name);
      if (screenshot) {
        liveScreenshots.set(region.name, screenshot);
      }
    }

    // Close live page and open test page
    await livePage.close();

    const testPage = await browser.newPage();
    await preparePage(testPage, testUrl);

    // Capture all test screenshots
    // If comparing the same URL, use the same selector
    const sameUrl = liveUrl === testUrl;
    for (const region of regions) {
      const testSelector = sameUrl
        ? (region.liveSelector || region.selector)  // Use live selector for same URL comparison
        : (region.testSelector || region.selector);
      const screenshot = await captureElementBySelector(testPage, testSelector, region.name);
      if (screenshot) {
        testScreenshots.set(region.name, screenshot);
      }
    }

    // Now compare all regions
    for (const region of regions) {
      try {
        const liveSelector = region.liveSelector || region.selector;
        const testSelector = region.testSelector || region.selector;

        const liveScreenshot = liveScreenshots.get(region.name);
        const testScreenshot = testScreenshots.get(region.name);

        if (!liveScreenshot || !testScreenshot) {
          results.push({
            name: region.name,
            description: region.description,
            diff: 100,
            status: 'ERROR',
            diffImage: '',
            error: `Element not found: ${!liveScreenshot ? 'live' : 'test'} (${!liveScreenshot ? liveSelector : testSelector})`,
          });
          continue;
        }

        // Store screenshots in R2
        const timestamp = Date.now();
        const liveKey = `regions/${timestamp}-${region.name}-live.png`;
        const testKey = `regions/${timestamp}-${region.name}-test.png`;

        await Promise.all([
          env.R2_BUCKET.put(liveKey, liveScreenshot, { httpMetadata: { contentType: 'image/png' } }),
          env.R2_BUCKET.put(testKey, testScreenshot, { httpMetadata: { contentType: 'image/png' } }),
        ]);

        // Decode and compare
        const liveImg = decodePNG(liveScreenshot.buffer as ArrayBuffer);
        const testImg = decodePNG(testScreenshot.buffer as ArrayBuffer);

        // Resize to match dimensions (use smaller)
        const width = Math.min(liveImg.width, testImg.width);
        const height = Math.min(liveImg.height, testImg.height);

        const liveCropped = cropImage(liveImg, 0, 0, width, height);
        const testCropped = cropImage(testImg, 0, 0, width, height);

        const diffData = new Uint8Array(width * height * 4);
        const numDiffPixels = pixelmatch(liveCropped, testCropped, diffData, width, height, { threshold });

        const totalPixels = width * height;
        const diffPercentage = (numDiffPixels / totalPixels) * 100;
        const diffRounded = Math.round(diffPercentage * 100) / 100;

        let status: 'PASS' | 'CLOSE' | 'FAIL';
        if (diffRounded < 10) status = 'PASS';
        else if (diffRounded < 20) status = 'CLOSE';
        else status = 'FAIL';

        // Store diff image
        const diffKey = `diffs/${timestamp}-${region.name}.png`;
        const diffPng = encodePNG(width, height, diffData);
        await env.R2_BUCKET.put(diffKey, diffPng, { httpMetadata: { contentType: 'image/png' } });

        results.push({
          name: region.name,
          description: region.description,
          diff: diffRounded,
          status,
          diffImage: diffKey,
          liveImage: liveKey,
          testImage: testKey,
          width,
          height,
        });

      } catch (error) {
        results.push({
          name: region.name,
          description: region.description,
          diff: 100,
          status: 'ERROR',
          diffImage: '',
          error: String(error),
        });
      }
    }

    await browser.close();

  } catch (error) {
    await browser.close();
    throw error;
  }

  // Generate summary
  const passed = results.filter(r => r.status === 'PASS').length;
  const close = results.filter(r => r.status === 'CLOSE').length;
  const failed = results.filter(r => r.status === 'FAIL' || r.status === 'ERROR').length;

  return {
    results,
    summary: `${passed} passed, ${close} close, ${failed} need work`,
  };
}

// Capture element by CSS selector
async function captureElementBySelector(
  page: any,
  selector: string,
  regionName: string
): Promise<Uint8Array | null> {
  // Try multiple selectors (comma-separated)
  const selectors = selector.split(',').map(s => s.trim());

  // Use evaluateHandle since page.$() seems to fail in multi-page scenarios
  for (const sel of selectors) {
    try {
      const elementHandle = await page.evaluateHandle(
        (s: string) => document.querySelector(s),
        sel
      );

      // Check if the element handle is valid (not null)
      const isNull = await elementHandle.evaluate((el: Element | null) => el === null);
      if (!isNull) {
        const screenshot = await elementHandle.screenshot({ type: 'png' });
        return new Uint8Array(screenshot);
      }
      await elementHandle.dispose();
    } catch (e) {
      // Try next selector
      continue;
    }
  }

  return null;
}

// Legacy Y-based comparison (kept for backwards compatibility)
async function handleYBasedCompare(
  env: Env,
  liveUrl: string,
  testUrl: string,
  regions: YBasedRegion[],
  threshold: number,
  viewport: { width: number; height: number }
): Promise<CompareResponse> {
  const browser = await puppeteer.launch(env.BROWSER);

  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);

    // Take full-page screenshots of both URLs
    const [liveScreenshot, testScreenshot] = await Promise.all([
      takeFullPageScreenshot(page, liveUrl),
      takeFullPageScreenshot(page, testUrl),
    ]);

    // Store screenshots
    const liveKey = `screenshots/${Date.now()}-live.png`;
    const testKey = `screenshots/${Date.now()}-test.png`;

    await Promise.all([
      env.R2_BUCKET.put(liveKey, liveScreenshot, { httpMetadata: { contentType: 'image/png' } }),
      env.R2_BUCKET.put(testKey, testScreenshot, { httpMetadata: { contentType: 'image/png' } }),
    ]);

    const liveImg = decodePNG(liveScreenshot.buffer as ArrayBuffer);
    const testImg = decodePNG(testScreenshot.buffer as ArrayBuffer);

    const results: CompareResult[] = [];

    for (const region of regions) {
      try {
        const width = Math.min(liveImg.width, testImg.width);
        const height = region.height;

        const liveCropped = cropImage(liveImg, 0, region.liveYStart, width, height);
        const testCropped = cropImage(testImg, 0, region.testYStart, width, height);

        const diffData = new Uint8Array(width * height * 4);
        const numDiffPixels = pixelmatch(liveCropped, testCropped, diffData, width, height, { threshold });

        const totalPixels = width * height;
        const diffPercentage = (numDiffPixels / totalPixels) * 100;
        const diffRounded = Math.round(diffPercentage * 100) / 100;

        let status: 'PASS' | 'CLOSE' | 'FAIL';
        if (diffRounded < 10) status = 'PASS';
        else if (diffRounded < 20) status = 'CLOSE';
        else status = 'FAIL';

        const timestamp = Date.now();
        const diffKey = `diffs/${timestamp}-${region.name}.png`;
        const diffPng = encodePNG(width, height, diffData);
        await env.R2_BUCKET.put(diffKey, diffPng, { httpMetadata: { contentType: 'image/png' } });

        results.push({
          name: region.name,
          description: region.description,
          diff: diffRounded,
          status,
          diffImage: diffKey,
          width,
          height,
        });

      } catch (error) {
        results.push({
          name: region.name,
          description: region.description,
          diff: 100,
          status: 'ERROR',
          diffImage: '',
          error: String(error),
        });
      }
    }

    await browser.close();

    const passed = results.filter(r => r.status === 'PASS').length;
    const close = results.filter(r => r.status === 'CLOSE').length;
    const failed = results.filter(r => r.status === 'FAIL' || r.status === 'ERROR').length;

    return {
      results,
      summary: `${passed} passed, ${close} close, ${failed} need work`,
      liveScreenshot: liveKey,
      testScreenshot: testKey,
    };

  } catch (error) {
    await browser.close();
    throw error;
  }
}

async function takeFullPageScreenshot(page: any, url: string): Promise<Uint8Array> {
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 60000 });
  await new Promise(r => setTimeout(r, 2000));

  // Hide overlays
  await page.evaluate(() => {
    const selectors = ['[class*="cookie"]', '[id*="cookie"]', '#onetrust-banner-sdk'];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach((el: any) => el.style.display = 'none');
    });
  });

  const screenshot = await page.screenshot({ fullPage: true, type: 'png' });
  return new Uint8Array(screenshot);
}

function cropImage(img: DecodedImage, x: number, y: number, width: number, height: number): Uint8Array {
  const cropped = new Uint8Array(width * height * 4);

  for (let cy = 0; cy < height; cy++) {
    for (let cx = 0; cx < width; cx++) {
      const srcX = Math.min(x + cx, img.width - 1);
      const srcY = Math.min(y + cy, img.height - 1);
      const srcIdx = (img.width * srcY + srcX) * 4;
      const dstIdx = (width * cy + cx) * 4;

      cropped[dstIdx] = img.data[srcIdx];
      cropped[dstIdx + 1] = img.data[srcIdx + 1];
      cropped[dstIdx + 2] = img.data[srcIdx + 2];
      cropped[dstIdx + 3] = img.data[srcIdx + 3];
    }
  }

  return cropped;
}
