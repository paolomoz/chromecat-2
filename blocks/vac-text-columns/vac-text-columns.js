/**
 * VAC Text Columns Block
 * Three-column text layout with titles, descriptions and CTAs
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  let sectionTitle = '';
  let columnsData = [];

  // Check if first row is section title
  if (rows[0] && rows[0].children.length === 1) {
    const firstText = rows[0].textContent.trim();
    if (firstText && !rows[0].querySelector('a')) {
      sectionTitle = firstText;
      columnsData = rows.slice(1);
    } else {
      columnsData = rows;
    }
  } else {
    columnsData = rows;
  }

  const container = document.createElement('div');
  container.className = 'vac-text-columns-container';

  if (sectionTitle) {
    const titleEl = document.createElement('h2');
    titleEl.className = 'vac-text-columns-title';
    titleEl.textContent = sectionTitle;
    container.append(titleEl);
  }

  const grid = document.createElement('div');
  grid.className = 'vac-text-columns-grid';

  columnsData.forEach((column) => {
    const cols = [...column.children];
    const colEl = document.createElement('div');
    colEl.className = 'vac-text-columns-column';

    let title = '';
    let description = '';
    let ctaText = '';
    let ctaLink = '#';

    cols.forEach((col, index) => {
      const anchor = col.querySelector('a');
      const text = col.textContent.trim();

      if (index === 0) {
        title = text;
      } else if (index === 1) {
        description = col.innerHTML;
      } else if (anchor) {
        ctaText = anchor.textContent.trim();
        ctaLink = anchor.href;
      }
    });

    colEl.innerHTML = `
      <h3 class="vac-text-columns-column-title">${title}</h3>
      <div class="vac-text-columns-description">${description}</div>
      ${ctaText ? `<a href="${ctaLink}" class="vac-text-columns-cta">${ctaText}<span class="vac-text-columns-arrow"></span></a>` : ''}
    `;

    grid.append(colEl);
  });

  container.append(grid);
  block.textContent = '';
  block.append(container);
}
