/**
 * Project Manager Block
 * Manage and select projects for visual comparison
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const apiEndpoint = window.chromecatApiEndpoint || 'https://chromecat-visual-compare.workers.dev';

  block.innerHTML = `
    <div class="project-manager-container">
      <div class="project-manager-header">
        <h3 class="project-manager-title">Projects</h3>
        <button class="project-manager-new">+ New Project</button>
      </div>

      <div class="project-manager-list">
        <div class="project-manager-loading">Loading projects...</div>
      </div>

      <div class="project-manager-form" hidden>
        <h4>Create New Project</h4>
        <form>
          <div class="project-manager-field">
            <label for="project-name">Project Name</label>
            <input type="text" id="project-name" name="name" required placeholder="My Project" />
          </div>
          <div class="project-manager-field">
            <label for="source-url">Source URL</label>
            <input type="url" id="source-url" name="source_url" required placeholder="https://example.com" />
          </div>
          <div class="project-manager-field">
            <label for="test-url">Test URL</label>
            <input type="url" id="test-url" name="test_url" placeholder="https://main--repo--owner.aem.page/test/page" />
          </div>
          <div class="project-manager-field">
            <label for="github-repo">GitHub Repository (optional)</label>
            <input type="text" id="github-repo" name="github_repo" placeholder="owner/repo" />
          </div>
          <div class="project-manager-form-actions">
            <button type="submit" class="project-manager-save">Create Project</button>
            <button type="button" class="project-manager-cancel">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const listEl = block.querySelector('.project-manager-list');
  const formEl = block.querySelector('.project-manager-form');
  const form = formEl.querySelector('form');
  const newBtn = block.querySelector('.project-manager-new');
  const cancelBtn = block.querySelector('.project-manager-cancel');

  let projects = [];
  let selectedProject = null;

  // Load projects
  async function loadProjects() {
    listEl.innerHTML = '<div class="project-manager-loading">Loading projects...</div>';

    try {
      const response = await fetch(`${apiEndpoint}/api/projects`);
      const data = await response.json();
      projects = data.projects || [];
      renderProjects();
    } catch (error) {
      listEl.innerHTML = `<div class="project-manager-error">Failed to load projects: ${error.message}</div>`;
    }
  }

  // Render project list
  function renderProjects() {
    if (projects.length === 0) {
      listEl.innerHTML = `
        <div class="project-manager-empty">
          <p>No projects yet. Create one to get started.</p>
        </div>
      `;
      return;
    }

    listEl.innerHTML = projects.map((project) => `
      <div class="project-manager-item ${selectedProject?.id === project.id ? 'selected' : ''}" data-id="${project.id}">
        <div class="project-manager-item-info">
          <span class="project-manager-item-name">${project.name}</span>
          <span class="project-manager-item-url">${project.source_url}</span>
        </div>
        <div class="project-manager-item-actions">
          <button class="project-manager-select" data-id="${project.id}">Select</button>
          <button class="project-manager-delete" data-id="${project.id}">Delete</button>
        </div>
      </div>
    `).join('');

    // Add event listeners
    listEl.querySelectorAll('.project-manager-select').forEach((btn) => {
      btn.addEventListener('click', () => selectProject(btn.dataset.id));
    });

    listEl.querySelectorAll('.project-manager-delete').forEach((btn) => {
      btn.addEventListener('click', () => deleteProject(btn.dataset.id));
    });

    listEl.querySelectorAll('.project-manager-item').forEach((item) => {
      item.addEventListener('dblclick', () => selectProject(item.dataset.id));
    });
  }

  // Select a project
  function selectProject(id) {
    selectedProject = projects.find((p) => p.id === id);
    if (!selectedProject) return;

    renderProjects();

    // Dispatch event for other blocks
    window.dispatchEvent(new CustomEvent('chromecat:project-selected', {
      detail: selectedProject,
    }));

    // Update URL inputs if url-scraper block exists
    const sourceInput = document.querySelector('[name="sourceUrl"]');
    const testInput = document.querySelector('[name="testUrl"]');

    if (sourceInput && selectedProject.source_url) {
      sourceInput.value = selectedProject.source_url;
    }
    if (testInput && selectedProject.test_url) {
      testInput.value = selectedProject.test_url;
    }
  }

  // Delete a project
  async function deleteProject(id) {
    if (!confirm('Are you sure you want to delete this project?')) {
      return;
    }

    try {
      await fetch(`${apiEndpoint}/api/projects/${id}`, { method: 'DELETE' });
      projects = projects.filter((p) => p.id !== id);
      if (selectedProject?.id === id) {
        selectedProject = null;
      }
      renderProjects();
    } catch (error) {
      alert(`Failed to delete project: ${error.message}`);
    }
  }

  // Show new project form
  newBtn.addEventListener('click', () => {
    formEl.hidden = false;
    listEl.hidden = true;
    form.reset();
  });

  // Cancel form
  cancelBtn.addEventListener('click', () => {
    formEl.hidden = true;
    listEl.hidden = false;
  });

  // Submit form
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = new FormData(form);
    const project = {
      name: formData.get('name'),
      source_url: formData.get('source_url'),
      test_url: formData.get('test_url') || null,
      github_repo: formData.get('github_repo') || null,
    };

    try {
      const response = await fetch(`${apiEndpoint}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(project),
      });

      const newProject = await response.json();
      projects.unshift(newProject);

      formEl.hidden = true;
      listEl.hidden = false;
      selectProject(newProject.id);
    } catch (error) {
      alert(`Failed to create project: ${error.message}`);
    }
  });

  // Initial load
  loadProjects();
}
