/**
 * URL Scraper Block
 * Form for entering source and test URLs for visual comparison
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  const sourceUrl = rows[0]?.textContent.trim() || '';
  const testUrl = rows[1]?.textContent.trim() || '';

  // Get API endpoint from config or use default
  const apiEndpoint = window.chromecatApiEndpoint || 'https://chromecat-visual-compare.workers.dev';

  block.innerHTML = `
    <div class="url-scraper-container">
      <h2 class="url-scraper-title">Visual Comparison Tool</h2>
      <p class="url-scraper-description">Compare a live website against your EDS test implementation to validate pixel accuracy.</p>

      <form class="url-scraper-form">
        <div class="url-scraper-field">
          <label for="source-url">Source URL (Live Site)</label>
          <input
            type="url"
            id="source-url"
            name="sourceUrl"
            value="${sourceUrl}"
            placeholder="https://example.com/page"
            required
          />
          <span class="url-scraper-hint">The original website you're trying to match</span>
        </div>

        <div class="url-scraper-field">
          <label for="test-url">Test URL (EDS Preview)</label>
          <input
            type="url"
            id="test-url"
            name="testUrl"
            value="${testUrl}"
            placeholder="https://main--repo--owner.aem.page/test/page"
            required
          />
          <span class="url-scraper-hint">Your EDS implementation to validate</span>
        </div>

        <div class="url-scraper-options">
          <label class="url-scraper-checkbox">
            <input type="checkbox" name="autoRegions" checked />
            <span>Auto-detect comparison regions</span>
          </label>
          <label class="url-scraper-checkbox">
            <input type="checkbox" name="fullPage" checked />
            <span>Full page comparison</span>
          </label>
        </div>

        <div class="url-scraper-actions">
          <button type="submit" class="url-scraper-compare primary">
            <span class="url-scraper-btn-text">Compare</span>
            <span class="url-scraper-spinner"></span>
          </button>
          <button type="button" class="url-scraper-scrape secondary">Scrape Source</button>
        </div>
      </form>

      <div class="url-scraper-status" aria-live="polite"></div>
      <div class="url-scraper-error" role="alert"></div>
    </div>
  `;

  const form = block.querySelector('.url-scraper-form');
  const statusEl = block.querySelector('.url-scraper-status');
  const errorEl = block.querySelector('.url-scraper-error');
  const compareBtn = block.querySelector('.url-scraper-compare');
  const scrapeBtn = block.querySelector('.url-scraper-scrape');

  // Compare handler
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const sourceUrlInput = block.querySelector('[name="sourceUrl"]');
    const testUrlInput = block.querySelector('[name="testUrl"]');
    const source = sourceUrlInput.value.trim();
    const test = testUrlInput.value.trim();

    if (!source || !test) {
      showError('Please enter both source and test URLs');
      return;
    }

    setLoading(true);
    clearError();
    statusEl.textContent = 'Taking screenshots and comparing...';

    try {
      const response = await fetch(`${apiEndpoint}/api/compare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          liveUrl: source,
          testUrl: test,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const results = await response.json();

      // Dispatch event for other blocks to consume
      window.dispatchEvent(new CustomEvent('chromecat:comparison-complete', {
        detail: {
          ...results,
          sourceUrl: source,
          testUrl: test,
        },
      }));

      statusEl.textContent = `Comparison complete: ${results.summary}`;
    } catch (error) {
      showError(`Comparison failed: ${error.message}`);
      statusEl.textContent = '';
    } finally {
      setLoading(false);
    }
  });

  // Scrape handler
  scrapeBtn.addEventListener('click', async () => {
    const sourceUrlInput = block.querySelector('[name="sourceUrl"]');
    const source = sourceUrlInput.value.trim();

    if (!source) {
      showError('Please enter a source URL to scrape');
      return;
    }

    setLoading(true, 'scrape');
    clearError();
    statusEl.textContent = 'Scraping page content...';

    try {
      const response = await fetch(`${apiEndpoint}/api/scrape`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: source }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();

      window.dispatchEvent(new CustomEvent('chromecat:scrape-complete', {
        detail: data,
      }));

      statusEl.textContent = `Scraped: ${data.title} (${data.images.length} images, ${data.sections.length} sections)`;
    } catch (error) {
      showError(`Scrape failed: ${error.message}`);
      statusEl.textContent = '';
    } finally {
      setLoading(false, 'scrape');
    }
  });

  function setLoading(loading, type = 'compare') {
    const btn = type === 'scrape' ? scrapeBtn : compareBtn;
    btn.disabled = loading;
    btn.classList.toggle('loading', loading);
    form.classList.toggle('loading', loading);
  }

  function showError(message) {
    errorEl.textContent = message;
    errorEl.classList.add('visible');
  }

  function clearError() {
    errorEl.textContent = '';
    errorEl.classList.remove('visible');
  }
}
