/**
 * VAC Quick Links Block
 * Quick action bar with icon links
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const items = [...block.children];

  const ul = document.createElement('ul');
  ul.className = 'vac-quick-links-list';

  items.forEach((item) => {
    const li = document.createElement('li');
    li.className = 'vac-quick-links-item';

    const cols = [...item.children];
    let iconUrl = '';
    let linkText = '';
    let linkHref = '#';

    if (cols[0]) {
      const img = cols[0].querySelector('img');
      if (img) {
        iconUrl = img.src;
      }
    }

    if (cols[1]) {
      const anchor = cols[1].querySelector('a');
      if (anchor) {
        linkText = anchor.textContent.trim();
        linkHref = anchor.href;
      } else {
        linkText = cols[1].textContent.trim();
      }
    }

    li.innerHTML = `
      <a href="${linkHref}" class="vac-quick-links-link">
        <span class="vac-quick-links-icon">
          <img src="${iconUrl}" alt="${linkText}">
        </span>
        <span class="vac-quick-links-text">${linkText}</span>
        <span class="vac-quick-links-arrow"></span>
      </a>
    `;

    ul.append(li);
  });

  block.textContent = '';
  block.append(ul);
}
