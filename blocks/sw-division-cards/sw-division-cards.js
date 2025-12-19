/**
 * SW Division Cards Block
 * Grid of division cards with images, titles and descriptions
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  
  // Build cards structure
  const container = document.createElement('div');
  container.className = 'sw-division-cards-container';
  
  const grid = document.createElement('div');
  grid.className = 'sw-division-cards-grid';
  
  rows.forEach((row) => {
    const cols = [...row.children];
    const card = document.createElement('div');
    card.className = 'sw-division-card';
    
    let imageUrl = '';
    let imageAlt = '';
    let title = '';
    let description = '';
    let link = '#';
    
    cols.forEach((col) => {
      const img = col.querySelector('img');
      const anchor = col.querySelector('a');
      const paragraphs = col.querySelectorAll('p');
      
      if (img && !imageUrl) {
        imageUrl = img.src;
        imageAlt = img.alt || '';
      }
      
      if (anchor && !title) {
        title = anchor.textContent.trim();
        link = anchor.href;
      }
      
      // Check for title in strong or h3
      const strongEl = col.querySelector('strong');
      const h3El = col.querySelector('h3');
      if (strongEl && !title) {
        title = strongEl.textContent.trim();
      }
      if (h3El && !title) {
        title = h3El.textContent.trim();
      }
      
      // Get description from paragraphs
      paragraphs.forEach((p) => {
        const text = p.textContent.trim();
        if (text && !p.querySelector('a') && !p.querySelector('strong') && text !== title) {
          if (!description) {
            description = text;
          }
        }
      });
    });
    
    // Handle single column with multiple elements
    if (cols.length === 1) {
      const col = cols[0];
      const img = col.querySelector('img');
      const anchor = col.querySelector('a');
      const allText = col.textContent.trim();
      
      if (img) {
        imageUrl = img.src;
        imageAlt = img.alt || '';
      }
      
      if (anchor) {
        title = anchor.textContent.trim().replace(/\n/g, ' ');
        link = anchor.href;
      }
      
      // Get description - text after the anchor
      const anchorParent = anchor ? anchor.parentElement : null;
      if (anchorParent && anchorParent.nextElementSibling) {
        description = anchorParent.nextElementSibling.textContent.trim();
      }
    }
    
    if (imageUrl || title) {
      card.innerHTML = `
        <a href="${link}" class="sw-division-card-link">
          <div class="sw-division-card-image">
            <img src="${imageUrl}" alt="${imageAlt}" loading="lazy">
          </div>
        </a>
        <div class="sw-division-card-content">
          <h3 class="sw-division-card-title">
            <a href="${link}">${title}</a>
          </h3>
          <p class="sw-division-card-description">${description}</p>
        </div>
      `;
      grid.append(card);
    }
  });
  
  container.append(grid);
  block.textContent = '';
  block.append(container);
}
