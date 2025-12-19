import puppeteer from '@cloudflare/puppeteer';
import type { Env, ScrapeRequest, ScrapeResponse } from '../types';

const DEFAULT_VIEWPORT = { width: 1280, height: 900 };

export async function handleScrape(
  env: Env,
  request: ScrapeRequest
): Promise<ScrapeResponse> {
  const { url, viewport = DEFAULT_VIEWPORT } = request;

  const browser = await puppeteer.launch(env.BROWSER);

  try {
    const page = await browser.newPage();
    await page.setViewport(viewport);

    await page.goto(url, {
      waitUntil: 'networkidle0',
      timeout: 60000,
    });

    // Wait for content to settle
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Extract page data
    const pageData = await page.evaluate(() => {
      // Get page title
      const title = document.title;

      // Get all images
      const images = Array.from(document.querySelectorAll('img')).map((img) => ({
        src: img.src,
        alt: img.alt || '',
      }));

      // Get main content HTML
      const mainContent = document.querySelector('main');
      const html = mainContent ? mainContent.innerHTML : document.body.innerHTML;

      // Identify major sections
      const sections: { selector: string; html: string }[] = [];

      // Look for common section patterns
      const sectionSelectors = [
        'section',
        '[class*="hero"]',
        '[class*="carousel"]',
        '[class*="card"]',
        '[class*="footer"]',
        '[class*="nav"]',
        'header',
        'footer',
      ];

      sectionSelectors.forEach((selector) => {
        document.querySelectorAll(selector).forEach((el, idx) => {
          const className = el.className || '';
          const id = el.id || '';
          const selectorStr = id
            ? `#${id}`
            : className
              ? `.${className.split(' ')[0]}`
              : `${selector}:nth-of-type(${idx + 1})`;

          sections.push({
            selector: selectorStr,
            html: el.outerHTML.slice(0, 500), // Truncate for API response
          });
        });
      });

      return { title, images, html, sections };
    });

    // Take screenshot
    const screenshot = await page.screenshot({ fullPage: true });

    // Store screenshot in R2
    const screenshotKey = `screenshots/scrape-${Date.now()}.png`;
    await env.R2_BUCKET.put(screenshotKey, screenshot as Buffer, {
      httpMetadata: { contentType: 'image/png' },
    });

    return {
      url,
      title: pageData.title,
      html: pageData.html,
      images: pageData.images,
      sections: pageData.sections,
      screenshot: screenshotKey,
    };
  } finally {
    await browser.close();
  }
}

// Extract block-like sections from HTML
export function identifyBlocks(html: string): { name: string; content: string }[] {
  const blocks: { name: string; content: string }[] = [];

  // Common block patterns in enterprise sites
  const patterns = [
    { name: 'hero', regex: /<[^>]*(hero|banner|masthead)[^>]*>[\s\S]*?<\/[^>]+>/gi },
    { name: 'carousel', regex: /<[^>]*(carousel|slider|slideshow)[^>]*>[\s\S]*?<\/[^>]+>/gi },
    { name: 'cards', regex: /<[^>]*(card|tile|feature)[^>]*>[\s\S]*?<\/[^>]+>/gi },
    { name: 'columns', regex: /<[^>]*(column|grid|row)[^>]*>[\s\S]*?<\/[^>]+>/gi },
    { name: 'footer', regex: /<footer[^>]*>[\s\S]*?<\/footer>/gi },
    { name: 'navigation', regex: /<nav[^>]*>[\s\S]*?<\/nav>/gi },
  ];

  patterns.forEach(({ name, regex }) => {
    const matches = html.match(regex);
    if (matches) {
      matches.forEach((match, idx) => {
        blocks.push({
          name: matches.length > 1 ? `${name}-${idx + 1}` : name,
          content: match,
        });
      });
    }
  });

  return blocks;
}
