/**
 * VAC Hero Carousel Block
 * Carousel with background images, title, description and CTA buttons
 * @param {Element} block the block element
 */
export default function decorate(block) {
  const slides = [...block.children];
  const totalSlides = slides.length;

  // Create carousel structure
  const carouselContent = document.createElement('div');
  carouselContent.className = 'vac-hero-carousel-content';

  slides.forEach((slide, index) => {
    const slideEl = document.createElement('div');
    slideEl.className = `vac-hero-carousel-slide ${index === 0 ? 'active' : ''}`;
    slideEl.dataset.index = index;

    // Get slide content from cells (direct children divs)
    const cells = [...slide.children];
    let imageUrl = '';
    let title = '';
    let description = '';
    let ctaText = '';
    let ctaLink = '#';

    cells.forEach((cell, cellIndex) => {
      if (cellIndex === 0) {
        // First cell: image
        const img = cell.querySelector('img');
        if (img) {
          imageUrl = img.src;
        }
      } else if (cellIndex === 1) {
        // Second cell: title
        title = cell.textContent.trim();
      } else if (cellIndex === 2) {
        // Third cell: description
        description = cell.textContent.trim();
      } else if (cellIndex === 3) {
        // Fourth cell: CTA
        const link = cell.querySelector('a');
        if (link) {
          ctaText = link.textContent.trim();
          ctaLink = link.href;
        } else {
          ctaText = cell.textContent.trim();
        }
      }
    });

    // Build slide HTML with white card panel (matching original design)
    slideEl.innerHTML = `
      <div class="vac-hero-carousel-slide-bg">
        <img src="${imageUrl}" alt="${title}">
      </div>
      <div class="vac-hero-carousel-slide-content">
        <div class="vac-hero-carousel-card">
          <h2 class="vac-hero-carousel-title">${title}</h2>
          <p class="vac-hero-carousel-description">${description}</p>
          <a href="${ctaLink}" class="vac-hero-carousel-cta">${ctaText}<span class="vac-hero-carousel-arrow"></span></a>
        </div>
      </div>
    `;

    carouselContent.append(slideEl);
  });

  // Create indicators
  const indicators = document.createElement('div');
  indicators.className = 'vac-hero-carousel-indicators';

  for (let i = 0; i < totalSlides; i += 1) {
    const dot = document.createElement('button');
    dot.className = `vac-hero-carousel-dot ${i === 0 ? 'active' : ''}`;
    dot.dataset.index = i;
    dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
    indicators.append(dot);
  }

  // Replace block content
  block.textContent = '';
  block.append(carouselContent);
  block.append(indicators);

  // Carousel functionality
  let currentSlide = 0;
  let autoplayInterval;

  const goToSlide = (targetIndex) => {
    const allSlides = block.querySelectorAll('.vac-hero-carousel-slide');
    const allDots = block.querySelectorAll('.vac-hero-carousel-dot');

    allSlides.forEach((s) => s.classList.remove('active'));
    allDots.forEach((d) => d.classList.remove('active'));

    allSlides[targetIndex].classList.add('active');
    allDots[targetIndex].classList.add('active');
    currentSlide = targetIndex;
  };

  const nextSlide = () => {
    const next = (currentSlide + 1) % totalSlides;
    goToSlide(next);
  };

  // Click handlers for dots
  indicators.addEventListener('click', (e) => {
    const dot = e.target.closest('.vac-hero-carousel-dot');
    if (dot) {
      const targetIndex = parseInt(dot.dataset.index, 10);
      goToSlide(targetIndex);
      // Reset autoplay timer
      clearInterval(autoplayInterval);
      autoplayInterval = setInterval(nextSlide, 5000);
    }
  });

  // Autoplay
  autoplayInterval = setInterval(nextSlide, 5000);

  // Pause on hover
  block.addEventListener('mouseenter', () => {
    clearInterval(autoplayInterval);
  });

  block.addEventListener('mouseleave', () => {
    autoplayInterval = setInterval(nextSlide, 5000);
  });
}
