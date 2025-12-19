/**
 * SW Hero Block
 * Hero banner with background image and content overlay
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  
  // Extract content from block structure
  let backgroundImage = '';
  let title = '';
  let description = '';
  
  rows.forEach((row) => {
    const cols = [...row.children];
    cols.forEach((col) => {
      const img = col.querySelector('img');
      const h1 = col.querySelector('h1');
      const p = col.querySelector('p');
      
      if (img && !backgroundImage) {
        backgroundImage = img.src;
      }
      if (h1 && !title) {
        title = h1.textContent.trim();
      }
      if (p && !description) {
        description = p.textContent.trim();
      }
      
      // Also check for text content if no specific elements
      if (!title && !img && col.querySelector('strong')) {
        title = col.querySelector('strong').textContent.trim();
      }
    });
  });
  
  // If title not found in h1, check first text row
  if (!title && rows[1]) {
    const textContent = rows[1].textContent.trim();
    if (textContent && !textContent.includes('http')) {
      title = textContent;
    }
  }
  
  // Build the hero structure
  block.innerHTML = `
    <div class="sw-hero-background">
      <img src="${backgroundImage}" alt="${title}" loading="eager">
    </div>
    <div class="sw-hero-overlay"></div>
    <div class="sw-hero-content">
      <div class="sw-hero-content-box">
        <h1 class="sw-hero-title">${title}</h1>
        <p class="sw-hero-description">${description}</p>
      </div>
    </div>
  `;
}
