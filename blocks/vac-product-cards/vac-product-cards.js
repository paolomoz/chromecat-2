/**
 * VAC Product Cards Block
 * Grid of product cards with images, titles, descriptions and CTAs
 * @param {Element} block the block element
 */
export default function decorate(block) {
  // Get the section title if it exists in first row
  const rows = [...block.children];
  let sectionTitle = '';
  let cardsData = [];

  // Check if first row is a single cell (section title)
  if (rows[0] && rows[0].children.length === 1) {
    const firstCellText = rows[0].textContent.trim();
    if (!firstCellText.includes('http') && !rows[0].querySelector('img')) {
      sectionTitle = firstCellText;
      cardsData = rows.slice(1);
    } else {
      cardsData = rows;
    }
  } else {
    cardsData = rows;
  }

  // Build the cards structure
  const container = document.createElement('div');
  container.className = 'vac-product-cards-container';

  if (sectionTitle) {
    const titleEl = document.createElement('h2');
    titleEl.className = 'vac-product-cards-title';
    titleEl.textContent = sectionTitle;
    container.append(titleEl);
  }

  const grid = document.createElement('div');
  grid.className = 'vac-product-cards-grid';

  cardsData.forEach((card) => {
    const cols = [...card.children];
    const cardEl = document.createElement('div');
    cardEl.className = 'vac-product-cards-card';

    let imageUrl = '';
    let title = '';
    let description = '';
    let ctaText = '';
    let ctaLink = '#';

    // Parse card data - can be rows or columns
    cols.forEach((col, colIndex) => {
      const img = col.querySelector('img');
      const anchor = col.querySelector('a');
      const text = col.textContent.trim();

      if (img && !imageUrl) {
        imageUrl = img.src;
      } else if (anchor && !ctaLink) {
        ctaText = anchor.textContent.trim();
        ctaLink = anchor.href;
      } else if (colIndex === 0 && !img) {
        title = text;
      } else if (colIndex === 1) {
        description = text;
      } else if (colIndex === 2 && !anchor) {
        ctaText = text;
      }
    });

    // If structure is different (single column with multiple items)
    if (!title && cols.length === 1) {
      const singleCol = cols[0];
      const img = singleCol.querySelector('img');
      const paragraphs = singleCol.querySelectorAll('p');
      const anchor = singleCol.querySelector('a');

      if (img) imageUrl = img.src;
      if (paragraphs[0]) title = paragraphs[0].textContent.trim();
      if (paragraphs[1]) description = paragraphs[1].textContent.trim();
      if (anchor) {
        ctaText = anchor.textContent.trim();
        ctaLink = anchor.href;
      }
    }

    cardEl.innerHTML = `
      <div class="vac-product-cards-image">
        <img src="${imageUrl}" alt="${title}">
      </div>
      <div class="vac-product-cards-content">
        <h3 class="vac-product-cards-card-title">${title}</h3>
        <p class="vac-product-cards-description">${description}</p>
        <a href="${ctaLink}" class="vac-product-cards-cta">${ctaText}<span class="vac-product-cards-arrow"></span></a>
      </div>
    `;

    grid.append(cardEl);
  });

  container.append(grid);
  block.textContent = '';
  block.append(container);
}
