/**
 * Results Dashboard Block
 * Table displaying comparison results with actions
 * @param {Element} block the block element
 */
export default function decorate(block) {
  block.innerHTML = `
    <div class="results-dashboard-container">
      <div class="results-dashboard-header">
        <h3 class="results-dashboard-title">Comparison Results</h3>
        <div class="results-dashboard-actions-header">
          <button class="results-dashboard-retry-all" disabled>Retry All Failed</button>
          <button class="results-dashboard-export" disabled>Export Results</button>
        </div>
      </div>

      <div class="results-dashboard-empty">
        <p>No comparison results yet. Enter URLs above and click Compare.</p>
      </div>

      <table class="results-dashboard-table" hidden>
        <thead>
          <tr>
            <th>Region</th>
            <th>Difference</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>

      <div class="results-dashboard-summary" hidden>
        <div class="results-dashboard-stat passed">
          <span class="results-dashboard-stat-value">0</span>
          <span class="results-dashboard-stat-label">Passed</span>
        </div>
        <div class="results-dashboard-stat close">
          <span class="results-dashboard-stat-value">0</span>
          <span class="results-dashboard-stat-label">Close</span>
        </div>
        <div class="results-dashboard-stat failed">
          <span class="results-dashboard-stat-value">0</span>
          <span class="results-dashboard-stat-label">Need Work</span>
        </div>
      </div>
    </div>
  `;

  const emptyState = block.querySelector('.results-dashboard-empty');
  const table = block.querySelector('.results-dashboard-table');
  const tbody = block.querySelector('tbody');
  const summary = block.querySelector('.results-dashboard-summary');
  const retryAllBtn = block.querySelector('.results-dashboard-retry-all');
  const exportBtn = block.querySelector('.results-dashboard-export');

  let currentResults = null;

  // Listen for comparison results
  window.addEventListener('chromecat:comparison-complete', (e) => {
    currentResults = e.detail;
    displayResults(currentResults.results);

    retryAllBtn.disabled = false;
    exportBtn.disabled = false;
  });

  // Retry all failed
  retryAllBtn.addEventListener('click', () => {
    if (!currentResults) return;

    const failed = currentResults.results.filter(
      (r) => r.status === 'FAIL' || r.status === 'ERROR'
    );

    if (failed.length === 0) {
      return;
    }

    // Dispatch retry event
    window.dispatchEvent(new CustomEvent('chromecat:retry-comparison', {
      detail: {
        regions: failed.map((r) => r.name),
        sourceUrl: currentResults.sourceUrl,
        testUrl: currentResults.testUrl,
      },
    }));
  });

  // Export results
  exportBtn.addEventListener('click', () => {
    if (!currentResults) return;

    const exportData = {
      timestamp: new Date().toISOString(),
      sourceUrl: currentResults.sourceUrl,
      testUrl: currentResults.testUrl,
      summary: currentResults.summary,
      results: currentResults.results.map((r) => ({
        name: r.name,
        description: r.description,
        diff: r.diff,
        status: r.status,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison-results-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  function displayResults(results) {
    emptyState.hidden = true;
    table.hidden = false;
    summary.hidden = false;

    // Update table
    tbody.innerHTML = results.map((r) => `
      <tr class="${r.status.toLowerCase()}">
        <td class="results-dashboard-region">
          <span class="results-dashboard-region-name">${r.description || r.name}</span>
          <span class="results-dashboard-region-id">${r.name}</span>
        </td>
        <td class="results-dashboard-diff">
          <span class="results-dashboard-diff-value">${r.diff.toFixed(2)}%</span>
          <div class="results-dashboard-diff-bar">
            <div class="results-dashboard-diff-fill ${r.status.toLowerCase()}" style="width: ${Math.min(r.diff, 100)}%"></div>
          </div>
        </td>
        <td>
          <span class="results-dashboard-status-badge ${r.status.toLowerCase()}">${r.status}</span>
        </td>
        <td class="results-dashboard-actions">
          <button class="results-dashboard-view" data-region="${r.name}">View</button>
          <button class="results-dashboard-retry" data-region="${r.name}">Retry</button>
        </td>
      </tr>
    `).join('');

    // Update summary
    const passed = results.filter((r) => r.status === 'PASS').length;
    const close = results.filter((r) => r.status === 'CLOSE').length;
    const failed = results.filter((r) => r.status === 'FAIL' || r.status === 'ERROR').length;

    summary.querySelector('.passed .results-dashboard-stat-value').textContent = passed;
    summary.querySelector('.close .results-dashboard-stat-value').textContent = close;
    summary.querySelector('.failed .results-dashboard-stat-value').textContent = failed;

    // Add event listeners to action buttons
    tbody.querySelectorAll('.results-dashboard-view').forEach((btn) => {
      btn.addEventListener('click', () => {
        const regionName = btn.dataset.region;
        window.dispatchEvent(new CustomEvent('chromecat:select-region', {
          detail: { regionName },
        }));
      });
    });

    tbody.querySelectorAll('.results-dashboard-retry').forEach((btn) => {
      btn.addEventListener('click', () => {
        const regionName = btn.dataset.region;
        window.dispatchEvent(new CustomEvent('chromecat:retry-comparison', {
          detail: {
            regions: [regionName],
            sourceUrl: currentResults.sourceUrl,
            testUrl: currentResults.testUrl,
          },
        }));
      });
    });
  }
}
