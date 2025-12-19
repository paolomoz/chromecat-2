/**
 * VAC News Cards Block
 * Grid of news article cards with images, dates, titles, descriptions and CTAs
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const rows = [...block.children];
  let sectionTitle = '';
  let cardsData = [];

  // Check if first row is section title
  if (rows[0] && rows[0].children.length === 1) {
    const firstText = rows[0].textContent.trim();
    if (firstText && !rows[0].querySelector('img') && !rows[0].querySelector('a')) {
      sectionTitle = firstText;
      cardsData = rows.slice(1);
    } else {
      cardsData = rows;
    }
  } else {
    cardsData = rows;
  }

  const container = document.createElement('div');
  container.className = 'vac-news-cards-container';

  if (sectionTitle) {
    const titleEl = document.createElement('h2');
    titleEl.className = 'vac-news-cards-title';
    titleEl.textContent = sectionTitle;
    container.append(titleEl);
  }

  const grid = document.createElement('div');
  grid.className = 'vac-news-cards-grid';

  cardsData.forEach((card) => {
    const cols = [...card.children];
    const cardEl = document.createElement('div');
    cardEl.className = 'vac-news-cards-card';

    let imageUrl = '';
    let imageAlt = '';
    let date = '';
    let title = '';
    let description = '';
    let ctaText = '';
    let ctaLink = '#';

    cols.forEach((col, index) => {
      const img = col.querySelector('img');
      const anchor = col.querySelector('a');
      const text = col.textContent.trim();

      if (img && !imageUrl) {
        imageUrl = img.src;
        imageAlt = img.alt || title;
      } else if (index === 1 && !img) {
        title = text;
      } else if (index === 2) {
        date = text;
      } else if (index === 3) {
        description = text;
      } else if (anchor) {
        ctaText = anchor.textContent.trim();
        ctaLink = anchor.href;
      }
    });

    cardEl.innerHTML = `
      <div class="vac-news-cards-image">
        <img src="${imageUrl}" alt="${imageAlt || title}">
      </div>
      <div class="vac-news-cards-content">
        <h3 class="vac-news-cards-card-title">${title}</h3>
        ${date ? `<p class="vac-news-cards-date">${date}</p>` : ''}
        <p class="vac-news-cards-description">${description}</p>
        <a href="${ctaLink}" class="vac-news-cards-cta">${ctaText || 'Find out more'}<span class="vac-news-cards-arrow"></span></a>
      </div>
    `;

    grid.append(cardEl);
  });

  container.append(grid);
  block.textContent = '';
  block.append(container);
}
