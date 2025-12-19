/**
 * VAC Footer Block
 * Four-column footer with link lists
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const columns = [...block.children];

  const container = document.createElement('div');
  container.className = 'vac-footer-container';

  const grid = document.createElement('div');
  grid.className = 'vac-footer-grid';

  columns.forEach((column) => {
    const cols = [...column.children];
    const colEl = document.createElement('div');
    colEl.className = 'vac-footer-column';

    let title = '';
    let links = [];

    cols.forEach((col, index) => {
      if (index === 0) {
        // First cell is the column title
        title = col.textContent.trim();
      } else {
        // Subsequent cells are links
        const anchors = col.querySelectorAll('a');
        if (anchors.length > 0) {
          anchors.forEach((a) => {
            links.push({
              text: a.textContent.trim(),
              href: a.href,
            });
          });
        } else {
          // Handle as list items or plain text
          const ul = col.querySelector('ul');
          if (ul) {
            const lis = ul.querySelectorAll('li');
            lis.forEach((li) => {
              const anchor = li.querySelector('a');
              if (anchor) {
                links.push({
                  text: anchor.textContent.trim(),
                  href: anchor.href,
                });
              } else {
                links.push({
                  text: li.textContent.trim(),
                  href: '#',
                });
              }
            });
          }
        }
      }
    });

    let linksHtml = '';
    if (links.length > 0) {
      linksHtml = `<ul class="vac-footer-links">
        ${links.map((link) => `<li><a href="${link.href}">${link.text}</a></li>`).join('')}
      </ul>`;
    }

    colEl.innerHTML = `
      <h3 class="vac-footer-column-title">${title}</h3>
      ${linksHtml}
    `;

    grid.append(colEl);
  });

  container.append(grid);
  block.textContent = '';
  block.append(container);
}
