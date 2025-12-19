/**
 * Block Editor Block
 * Monaco-based code editor for editing block JS and CSS
 * @param {Element} block the block element
 */
export default async function decorate(block) {
  // Load Monaco Editor from CDN
  const monacoLoaded = await loadMonaco();

  if (!monacoLoaded) {
    block.innerHTML = '<p class="block-editor-error">Failed to load Monaco Editor</p>';
    return;
  }

  block.innerHTML = `
    <div class="block-editor-container">
      <div class="block-editor-header">
        <h3 class="block-editor-title">Block Editor</h3>
        <div class="block-editor-actions">
          <select class="block-editor-block-select">
            <option value="">Select a block...</option>
          </select>
          <button class="block-editor-save" disabled>Save Changes</button>
          <button class="block-editor-preview" disabled>Preview</button>
        </div>
      </div>

      <div class="block-editor-tabs">
        <button class="block-editor-tab active" data-tab="js">JavaScript</button>
        <button class="block-editor-tab" data-tab="css">CSS</button>
        <button class="block-editor-tab" data-tab="html">Test HTML</button>
      </div>

      <div class="block-editor-panels">
        <div class="block-editor-panel active" data-panel="js">
          <div class="block-editor-monaco" id="monaco-js"></div>
        </div>
        <div class="block-editor-panel" data-panel="css">
          <div class="block-editor-monaco" id="monaco-css"></div>
        </div>
        <div class="block-editor-panel" data-panel="html">
          <div class="block-editor-monaco" id="monaco-html"></div>
        </div>
      </div>

      <div class="block-editor-status">
        <span class="block-editor-status-text">Ready</span>
      </div>
    </div>
  `;

  const blockSelect = block.querySelector('.block-editor-block-select');
  const saveBtn = block.querySelector('.block-editor-save');
  const previewBtn = block.querySelector('.block-editor-preview');
  const statusText = block.querySelector('.block-editor-status-text');
  const tabs = block.querySelectorAll('.block-editor-tab');
  const panels = block.querySelectorAll('.block-editor-panel');

  let currentBlock = null;
  let editors = {};
  let hasChanges = false;

  // Initialize Monaco editors
  function initEditors() {
    const jsContainer = block.querySelector('#monaco-js');
    const cssContainer = block.querySelector('#monaco-css');
    const htmlContainer = block.querySelector('#monaco-html');

    editors.js = window.monaco.editor.create(jsContainer, {
      value: '// Select a block to edit',
      language: 'javascript',
      theme: 'vs-dark',
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });

    editors.css = window.monaco.editor.create(cssContainer, {
      value: '/* Select a block to edit */',
      language: 'css',
      theme: 'vs-dark',
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });

    editors.html = window.monaco.editor.create(htmlContainer, {
      value: '<!-- Test HTML content -->',
      language: 'html',
      theme: 'vs-dark',
      minimap: { enabled: false },
      fontSize: 14,
      lineNumbers: 'on',
      scrollBeyondLastLine: false,
      automaticLayout: true,
    });

    // Track changes
    Object.values(editors).forEach((editor) => {
      editor.onDidChangeModelContent(() => {
        hasChanges = true;
        saveBtn.disabled = false;
        statusText.textContent = 'Unsaved changes';
      });
    });
  }

  // Load available blocks
  async function loadBlockList() {
    // In a real implementation, this would fetch from the API
    // For now, hardcode the available blocks
    const blocks = [
      'vac-hero-carousel',
      'vac-quick-links',
      'vac-product-cards',
      'vac-text-columns',
      'vac-news-cards',
      'vac-footer',
      'url-scraper',
      'diff-viewer',
      'results-dashboard',
      'region-editor',
    ];

    blockSelect.innerHTML = '<option value="">Select a block...</option>';
    blocks.forEach((name) => {
      const option = document.createElement('option');
      option.value = name;
      option.textContent = name;
      blockSelect.appendChild(option);
    });
  }

  // Load block content
  async function loadBlock(blockName) {
    if (!blockName) {
      editors.js.setValue('// Select a block to edit');
      editors.css.setValue('/* Select a block to edit */');
      editors.html.setValue('<!-- Test HTML content -->');
      saveBtn.disabled = true;
      previewBtn.disabled = true;
      currentBlock = null;
      return;
    }

    statusText.textContent = `Loading ${blockName}...`;

    try {
      // Fetch JS
      const jsResponse = await fetch(`/blocks/${blockName}/${blockName}.js`);
      const jsContent = jsResponse.ok ? await jsResponse.text() : `// ${blockName}.js not found`;

      // Fetch CSS
      const cssResponse = await fetch(`/blocks/${blockName}/${blockName}.css`);
      const cssContent = cssResponse.ok ? await cssResponse.text() : `/* ${blockName}.css not found */`;

      // Default HTML template
      const htmlContent = `<div class="${blockName} block">
  <!-- Add test content here -->
</div>`;

      editors.js.setValue(jsContent);
      editors.css.setValue(cssContent);
      editors.html.setValue(htmlContent);

      currentBlock = blockName;
      hasChanges = false;
      saveBtn.disabled = true;
      previewBtn.disabled = false;
      statusText.textContent = `Loaded ${blockName}`;
    } catch (error) {
      statusText.textContent = `Error loading ${blockName}: ${error.message}`;
    }
  }

  // Tab switching
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;

      tabs.forEach((t) => t.classList.remove('active'));
      panels.forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      block.querySelector(`[data-panel="${tabName}"]`).classList.add('active');

      // Trigger layout update for Monaco
      if (editors[tabName]) {
        editors[tabName].layout();
      }
    });
  });

  // Block selection
  blockSelect.addEventListener('change', () => {
    if (hasChanges) {
      if (!confirm('You have unsaved changes. Discard them?')) {
        blockSelect.value = currentBlock || '';
        return;
      }
    }
    loadBlock(blockSelect.value);
  });

  // Save button
  saveBtn.addEventListener('click', async () => {
    if (!currentBlock) return;

    statusText.textContent = 'Saving...';

    const content = {
      js: editors.js.getValue(),
      css: editors.css.getValue(),
      html: editors.html.getValue(),
    };

    // Dispatch save event for external handling
    window.dispatchEvent(new CustomEvent('chromecat:block-save', {
      detail: {
        blockName: currentBlock,
        content,
      },
    }));

    // In a real implementation, this would save via API
    // For now, just show a message
    hasChanges = false;
    saveBtn.disabled = true;
    statusText.textContent = `Saved ${currentBlock} (local only - deploy to persist)`;
  });

  // Preview button
  previewBtn.addEventListener('click', () => {
    if (!currentBlock) return;

    const content = {
      js: editors.js.getValue(),
      css: editors.css.getValue(),
      html: editors.html.getValue(),
    };

    // Dispatch preview event
    window.dispatchEvent(new CustomEvent('chromecat:block-preview', {
      detail: {
        blockName: currentBlock,
        content,
      },
    }));

    statusText.textContent = 'Preview triggered';
  });

  // Initialize
  initEditors();
  await loadBlockList();
}

// Load Monaco from CDN
async function loadMonaco() {
  if (window.monaco) {
    return true;
  }

  return new Promise((resolve) => {
    const loaderScript = document.createElement('script');
    loaderScript.src = 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js';
    loaderScript.onload = () => {
      window.require.config({
        paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs' },
      });

      window.require(['vs/editor/editor.main'], () => {
        resolve(true);
      });
    };
    loaderScript.onerror = () => resolve(false);
    document.head.appendChild(loaderScript);
  });
}
