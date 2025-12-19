/**
 * Preview Pane Block
 * Live preview iframe for testing block implementations
 * @param {Element} block the block element
 */
export default function decorate(block) {
  block.innerHTML = `
    <div class="preview-pane-container">
      <div class="preview-pane-header">
        <h3 class="preview-pane-title">Live Preview</h3>
        <div class="preview-pane-controls">
          <div class="preview-pane-viewport-controls">
            <button class="preview-pane-viewport active" data-width="100%" title="Full width">
              <svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="4" width="20" height="16" rx="2"/></svg>
            </button>
            <button class="preview-pane-viewport" data-width="768px" title="Tablet">
              <svg viewBox="0 0 24 24" fill="currentColor"><rect x="4" y="2" width="16" height="20" rx="2"/></svg>
            </button>
            <button class="preview-pane-viewport" data-width="375px" title="Mobile">
              <svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="2" width="12" height="20" rx="2"/></svg>
            </button>
          </div>
          <button class="preview-pane-refresh" title="Refresh preview">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08A5.99 5.99 0 0112 18c-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
          </button>
          <button class="preview-pane-open" title="Open in new tab">
            <svg viewBox="0 0 24 24" fill="currentColor"><path d="M19 19H5V5h7V3H5a2 2 0 00-2 2v14a2 2 0 002 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/></svg>
          </button>
        </div>
      </div>

      <div class="preview-pane-content">
        <div class="preview-pane-frame-wrapper">
          <iframe class="preview-pane-frame" sandbox="allow-scripts allow-same-origin"></iframe>
        </div>
        <div class="preview-pane-empty">
          <svg viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
          </svg>
          <p>Edit a block to see the preview</p>
        </div>
      </div>
    </div>
  `;

  const iframe = block.querySelector('.preview-pane-frame');
  const frameWrapper = block.querySelector('.preview-pane-frame-wrapper');
  const emptyState = block.querySelector('.preview-pane-empty');
  const viewportBtns = block.querySelectorAll('.preview-pane-viewport');
  const refreshBtn = block.querySelector('.preview-pane-refresh');
  const openBtn = block.querySelector('.preview-pane-open');

  let currentContent = null;

  // Viewport switching
  viewportBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      viewportBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      frameWrapper.style.maxWidth = btn.dataset.width;
    });
  });

  // Refresh preview
  refreshBtn.addEventListener('click', () => {
    if (currentContent) {
      renderPreview(currentContent.blockName, currentContent.content);
    }
  });

  // Open in new tab
  openBtn.addEventListener('click', () => {
    if (currentContent) {
      const blob = new Blob([generatePreviewHTML(currentContent.blockName, currentContent.content)], {
        type: 'text/html',
      });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  });

  // Listen for preview requests
  window.addEventListener('chromecat:block-preview', (e) => {
    const { blockName, content } = e.detail;
    currentContent = { blockName, content };
    renderPreview(blockName, content);
  });

  function renderPreview(blockName, content) {
    emptyState.style.display = 'none';
    frameWrapper.style.display = 'block';

    const html = generatePreviewHTML(blockName, content);
    iframe.srcdoc = html;
  }

  function generatePreviewHTML(blockName, content) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Preview: ${blockName}</title>
  <link rel="stylesheet" href="/styles/styles.css">
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
    }
    ${content.css}
  </style>
</head>
<body>
  <main>
    ${content.html}
  </main>
  <script type="module">
    ${content.js}

    // Auto-decorate
    const block = document.querySelector('.${blockName}');
    if (block && typeof decorate === 'function') {
      decorate(block);
    }
  </script>
</body>
</html>`;
  }
}
