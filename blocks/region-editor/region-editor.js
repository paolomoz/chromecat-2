/**
 * Region Editor Block
 * Visual editor for adjusting comparison region offsets
 * @param {Element} block the block element
 */
export default function decorate(block) {
  // Default regions from VAC implementation
  const defaultRegions = [
    { name: 'quick-links', description: 'Quick Links', liveYStart: 660, testYStart: 420, height: 100 },
    { name: 'products', description: 'Product Cards', liveYStart: 770, testYStart: 580, height: 440 },
    { name: 'text-columns', description: 'Text Columns', liveYStart: 1300, testYStart: 1100, height: 280 },
    { name: 'news', description: 'News Cards', liveYStart: 1640, testYStart: 1450, height: 350 },
    { name: 'footer', description: 'Footer', liveYStart: 2100, testYStart: 1900, height: 180 },
  ];

  let regions = [...defaultRegions];
  let liveScreenshot = null;
  let testScreenshot = null;

  block.innerHTML = `
    <div class="region-editor-container">
      <div class="region-editor-header">
        <h3 class="region-editor-title">Region Configuration</h3>
        <div class="region-editor-actions">
          <button class="region-editor-add">+ Add Region</button>
          <button class="region-editor-reset">Reset to Defaults</button>
          <button class="region-editor-apply">Apply Changes</button>
        </div>
      </div>

      <div class="region-editor-preview">
        <div class="region-editor-preview-panel live">
          <h4>Live Site</h4>
          <div class="region-editor-preview-container">
            <img class="region-editor-preview-img" alt="Live screenshot" />
            <div class="region-editor-overlay"></div>
          </div>
        </div>
        <div class="region-editor-preview-panel test">
          <h4>Test Site</h4>
          <div class="region-editor-preview-container">
            <img class="region-editor-preview-img" alt="Test screenshot" />
            <div class="region-editor-overlay"></div>
          </div>
        </div>
      </div>

      <div class="region-editor-list">
        <table class="region-editor-table">
          <thead>
            <tr>
              <th>Region Name</th>
              <th>Live Y Start</th>
              <th>Test Y Start</th>
              <th>Height</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody></tbody>
        </table>
      </div>

      <div class="region-editor-json">
        <label>Region Configuration (JSON)</label>
        <textarea class="region-editor-json-input" readonly></textarea>
        <button class="region-editor-copy">Copy JSON</button>
      </div>
    </div>
  `;

  const tbody = block.querySelector('tbody');
  const jsonInput = block.querySelector('.region-editor-json-input');
  const liveOverlay = block.querySelector('.live .region-editor-overlay');
  const testOverlay = block.querySelector('.test .region-editor-overlay');
  const liveImg = block.querySelector('.live .region-editor-preview-img');
  const testImg = block.querySelector('.test .region-editor-preview-img');

  // Render region table
  function renderRegions() {
    tbody.innerHTML = regions.map((region, idx) => `
      <tr data-index="${idx}">
        <td>
          <input type="text" class="region-name" value="${region.name}" />
          <input type="text" class="region-desc" value="${region.description || ''}" placeholder="Description" />
        </td>
        <td>
          <input type="number" class="region-live-y" value="${region.liveYStart}" min="0" step="10" />
        </td>
        <td>
          <input type="number" class="region-test-y" value="${region.testYStart}" min="0" step="10" />
        </td>
        <td>
          <input type="number" class="region-height" value="${region.height}" min="10" step="10" />
        </td>
        <td class="region-editor-row-actions">
          <button class="region-editor-preview-btn" data-index="${idx}" title="Preview region">Preview</button>
          <button class="region-editor-delete" data-index="${idx}" title="Delete region">Delete</button>
        </td>
      </tr>
    `).join('');

    updateJSON();
    attachRowListeners();
  }

  // Attach listeners to row inputs
  function attachRowListeners() {
    tbody.querySelectorAll('tr').forEach((row) => {
      const idx = parseInt(row.dataset.index, 10);

      row.querySelector('.region-name').addEventListener('input', (e) => {
        regions[idx].name = e.target.value;
        updateJSON();
      });

      row.querySelector('.region-desc').addEventListener('input', (e) => {
        regions[idx].description = e.target.value;
        updateJSON();
      });

      row.querySelector('.region-live-y').addEventListener('input', (e) => {
        regions[idx].liveYStart = parseInt(e.target.value, 10) || 0;
        updateJSON();
        updateOverlay();
      });

      row.querySelector('.region-test-y').addEventListener('input', (e) => {
        regions[idx].testYStart = parseInt(e.target.value, 10) || 0;
        updateJSON();
        updateOverlay();
      });

      row.querySelector('.region-height').addEventListener('input', (e) => {
        regions[idx].height = parseInt(e.target.value, 10) || 100;
        updateJSON();
        updateOverlay();
      });

      row.querySelector('.region-editor-preview-btn').addEventListener('click', () => {
        highlightRegion(idx);
      });

      row.querySelector('.region-editor-delete').addEventListener('click', () => {
        regions.splice(idx, 1);
        renderRegions();
      });
    });
  }

  // Update JSON display
  function updateJSON() {
    jsonInput.value = JSON.stringify(regions, null, 2);
  }

  // Highlight a region on the preview images
  function highlightRegion(idx) {
    const region = regions[idx];
    if (!region) return;

    // Scale factor for preview images
    const liveScale = liveImg.naturalHeight ? liveImg.clientHeight / liveImg.naturalHeight : 1;
    const testScale = testImg.naturalHeight ? testImg.clientHeight / testImg.naturalHeight : 1;

    liveOverlay.innerHTML = `
      <div class="region-highlight" style="
        top: ${region.liveYStart * liveScale}px;
        height: ${region.height * liveScale}px;
      ">
        <span>${region.name}</span>
      </div>
    `;

    testOverlay.innerHTML = `
      <div class="region-highlight" style="
        top: ${region.testYStart * testScale}px;
        height: ${region.height * testScale}px;
      ">
        <span>${region.name}</span>
      </div>
    `;
  }

  // Update overlay with all regions
  function updateOverlay() {
    const liveScale = liveImg.naturalHeight ? liveImg.clientHeight / liveImg.naturalHeight : 1;
    const testScale = testImg.naturalHeight ? testImg.clientHeight / testImg.naturalHeight : 1;

    liveOverlay.innerHTML = regions.map((region, idx) => `
      <div class="region-highlight" data-index="${idx}" style="
        top: ${region.liveYStart * liveScale}px;
        height: ${region.height * liveScale}px;
      ">
        <span>${region.name}</span>
      </div>
    `).join('');

    testOverlay.innerHTML = regions.map((region, idx) => `
      <div class="region-highlight" data-index="${idx}" style="
        top: ${region.testYStart * testScale}px;
        height: ${region.height * testScale}px;
      ">
        <span>${region.name}</span>
      </div>
    `).join('');
  }

  // Add region button
  block.querySelector('.region-editor-add').addEventListener('click', () => {
    const lastRegion = regions[regions.length - 1] || { liveYStart: 0, testYStart: 0, height: 200 };
    regions.push({
      name: `region-${regions.length + 1}`,
      description: 'New Region',
      liveYStart: lastRegion.liveYStart + lastRegion.height + 50,
      testYStart: lastRegion.testYStart + lastRegion.height + 50,
      height: 200,
    });
    renderRegions();
  });

  // Reset button
  block.querySelector('.region-editor-reset').addEventListener('click', () => {
    regions = [...defaultRegions];
    renderRegions();
    updateOverlay();
  });

  // Apply button - dispatch event with current regions
  block.querySelector('.region-editor-apply').addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent('chromecat:regions-updated', {
      detail: { regions: [...regions] },
    }));
  });

  // Copy JSON button
  block.querySelector('.region-editor-copy').addEventListener('click', () => {
    navigator.clipboard.writeText(jsonInput.value).then(() => {
      const btn = block.querySelector('.region-editor-copy');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy JSON'; }, 2000);
    });
  });

  // Listen for comparison results to get screenshots
  window.addEventListener('chromecat:comparison-complete', (e) => {
    const { liveScreenshot: live, testScreenshot: test } = e.detail;
    const apiEndpoint = window.chromecatApiEndpoint || 'https://chromecat-visual-compare.workers.dev';

    if (live) {
      liveImg.src = live.startsWith('http') ? live : `${apiEndpoint}/${live}`;
      liveImg.onload = updateOverlay;
    }
    if (test) {
      testImg.src = test.startsWith('http') ? test : `${apiEndpoint}/${test}`;
      testImg.onload = updateOverlay;
    }
  });

  // Initial render
  renderRegions();
}
