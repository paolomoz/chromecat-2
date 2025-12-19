/**
 * Diff Viewer Block
 * Side-by-side, overlay, or diff-only view for visual comparison results
 * @param {Element} block the block element
 */
export default function decorate(block) {
  // Get API endpoint from config or use default
  const apiEndpoint = window.chromecatApiEndpoint || 'https://chromecat-visual-compare.workers.dev';

  block.innerHTML = `
    <div class="diff-viewer-container">
      <div class="diff-viewer-header">
        <div class="diff-viewer-controls">
          <button class="diff-viewer-mode active" data-mode="side-by-side">Side by Side</button>
          <button class="diff-viewer-mode" data-mode="overlay">Overlay</button>
          <button class="diff-viewer-mode" data-mode="diff">Diff Only</button>
        </div>
        <div class="diff-viewer-stats">
          <span class="diff-viewer-percentage">--</span>
          <span class="diff-viewer-status">Waiting for comparison...</span>
        </div>
      </div>

      <div class="diff-viewer-empty">
        <div class="diff-viewer-empty-icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7" rx="1"/>
            <rect x="14" y="3" width="7" height="7" rx="1"/>
            <rect x="3" y="14" width="7" height="7" rx="1"/>
            <rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
        </div>
        <p>Run a comparison to see results here</p>
      </div>

      <div class="diff-viewer-images" data-mode="side-by-side" hidden>
        <div class="diff-viewer-panel diff-viewer-live">
          <h4>Live Site</h4>
          <div class="diff-viewer-img-wrapper">
            <img alt="Live Site Screenshot" />
          </div>
        </div>
        <div class="diff-viewer-panel diff-viewer-test">
          <h4>Test Implementation</h4>
          <div class="diff-viewer-img-wrapper">
            <img alt="Test Site Screenshot" />
          </div>
        </div>
        <div class="diff-viewer-panel diff-viewer-diff">
          <h4>Difference</h4>
          <div class="diff-viewer-img-wrapper">
            <img alt="Pixel Difference" />
          </div>
        </div>
      </div>

      <div class="diff-viewer-overlay-container" hidden>
        <div class="diff-viewer-overlay-wrapper">
          <img class="diff-viewer-overlay-live" alt="Live Site" />
          <img class="diff-viewer-overlay-test" alt="Test Site" />
        </div>
        <div class="diff-viewer-slider-container">
          <label>Opacity: <span class="diff-viewer-opacity-value">50%</span></label>
          <input type="range" class="diff-viewer-opacity-slider" min="0" max="100" value="50" />
        </div>
      </div>

      <div class="diff-viewer-region-selector" hidden>
        <label for="region-select">View Region:</label>
        <select id="region-select" class="diff-viewer-region-select">
          <option value="">Select a region...</option>
        </select>
      </div>
    </div>
  `;

  const container = block.querySelector('.diff-viewer-container');
  const imagesPanel = block.querySelector('.diff-viewer-images');
  const overlayContainer = block.querySelector('.diff-viewer-overlay-container');
  const emptyState = block.querySelector('.diff-viewer-empty');
  const regionSelector = block.querySelector('.diff-viewer-region-selector');
  const regionSelect = block.querySelector('.diff-viewer-region-select');
  const modeButtons = block.querySelectorAll('.diff-viewer-mode');
  const percentageEl = block.querySelector('.diff-viewer-percentage');
  const statusEl = block.querySelector('.diff-viewer-status');
  const opacitySlider = block.querySelector('.diff-viewer-opacity-slider');
  const opacityValue = block.querySelector('.diff-viewer-opacity-value');
  const overlayTest = block.querySelector('.diff-viewer-overlay-test');

  let currentResults = null;
  let currentRegion = null;

  // Mode switching
  modeButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      modeButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      imagesPanel.dataset.mode = mode;

      if (mode === 'overlay') {
        overlayContainer.hidden = false;
        imagesPanel.hidden = true;
      } else {
        overlayContainer.hidden = true;
        imagesPanel.hidden = !currentResults;
      }
    });
  });

  // Opacity slider for overlay mode
  opacitySlider.addEventListener('input', () => {
    const value = opacitySlider.value;
    opacityValue.textContent = `${value}%`;
    overlayTest.style.opacity = value / 100;
  });

  // Region selector
  regionSelect.addEventListener('change', () => {
    const regionName = regionSelect.value;
    if (regionName && currentResults) {
      const region = currentResults.results.find((r) => r.name === regionName);
      if (region) {
        displayRegion(region);
      }
    }
  });

  // Listen for comparison results
  window.addEventListener('chromecat:comparison-complete', (e) => {
    currentResults = e.detail;
    emptyState.hidden = true;
    imagesPanel.hidden = false;
    regionSelector.hidden = false;

    // Populate region selector
    regionSelect.innerHTML = '<option value="">Select a region...</option>';
    currentResults.results.forEach((result) => {
      const option = document.createElement('option');
      option.value = result.name;
      option.textContent = `${result.description || result.name} (${result.diff}% - ${result.status})`;
      regionSelect.appendChild(option);
    });

    // Show first region by default
    if (currentResults.results.length > 0) {
      regionSelect.value = currentResults.results[0].name;
      displayRegion(currentResults.results[0]);
    }
  });

  // Listen for region selection from results dashboard
  window.addEventListener('chromecat:select-region', (e) => {
    const { regionName } = e.detail;
    if (currentResults) {
      const region = currentResults.results.find((r) => r.name === regionName);
      if (region) {
        regionSelect.value = regionName;
        displayRegion(region);
        block.scrollIntoView({ behavior: 'smooth' });
      }
    }
  });

  function displayRegion(region) {
    currentRegion = region;

    // Update stats
    percentageEl.textContent = `${region.diff}%`;
    percentageEl.className = `diff-viewer-percentage ${region.status.toLowerCase()}`;
    statusEl.textContent = region.status;
    statusEl.className = `diff-viewer-status ${region.status.toLowerCase()}`;

    // Update images
    const liveImg = block.querySelector('.diff-viewer-live img');
    const testImg = block.querySelector('.diff-viewer-test img');
    const diffImg = block.querySelector('.diff-viewer-diff img');
    const overlayLive = block.querySelector('.diff-viewer-overlay-live');
    const overlayTestImg = block.querySelector('.diff-viewer-overlay-test');

    const getImageUrl = (key) => {
      if (!key) return '';
      if (key.startsWith('http')) return key;
      return `${apiEndpoint}/${key}`;
    };

    if (region.liveImage) {
      liveImg.src = getImageUrl(region.liveImage);
      overlayLive.src = getImageUrl(region.liveImage);
    }
    if (region.testImage) {
      testImg.src = getImageUrl(region.testImage);
      overlayTestImg.src = getImageUrl(region.testImage);
    }
    if (region.diffImage) {
      diffImg.src = getImageUrl(region.diffImage);
    }
  }
}
