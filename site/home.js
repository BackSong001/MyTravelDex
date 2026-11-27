const photos = Array.from(document.querySelectorAll('.cover-photo'));
const controls = document.querySelector('.slide-controls');
let selected = 0;

function selectPhoto(offset) {
  photos[selected].hidden = true;
  selected = (selected + offset + photos.length) % photos.length;
  const current = photos[selected];
  current.hidden = false;
  document.querySelector('#place').textContent = current.dataset.place;
  document.querySelector('#count').textContent =
    [selected + 1, photos.length].map(value => String(value).padStart(2, '0')).join(' / ');
}

document.querySelector('#prev').addEventListener('click', () => selectPhoto(-1));
document.querySelector('#next').addEventListener('click', () => selectPhoto(1));
controls.hidden = false;

const cover = document.querySelector('.cover');
const demo = document.querySelector('.demo');
const preview = demo.querySelector('.demo-preview');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const compact = matchMedia('(max-width: 720px)');
const clamp = value => Math.min(1, Math.max(0, value));
let frame = 0;

function renderMotion() {
  frame = 0;
  const bounds = demo.getBoundingClientRect();
  const coverHeight = cover.offsetHeight;
  const phoneHeight = preview.offsetHeight;
  const stickyTop = compact.matches ? 0 : (window.innerHeight - phoneHeight) / 2;
  const progress = clamp((stickyTop - bounds.top) / Math.max(1, bounds.height - phoneHeight));
  cover.style.setProperty('--cover-progress', clamp(window.scrollY / coverHeight));
  preview.style.setProperty('--turn', progress);
  preview.classList.toggle('on-map', progress >= 0.5);
}

function scheduleMotion() {
  if (!frame) frame = requestAnimationFrame(renderMotion);
}

const prints = document.querySelectorAll('.print');
const observer = 'IntersectionObserver' in window && new IntersectionObserver(entries => {
  for (const entry of entries) {
    if (entry.isIntersecting) {
      entry.target.classList.add('enter');
      observer.unobserve(entry.target);
    }
  }
}, { threshold: 0.12 });

function applyPreference() {
  document.documentElement.classList.toggle('motion', !reducedMotion.matches);
  if (reducedMotion.matches) {
    cancelAnimationFrame(frame);
    frame = 0;
    window.removeEventListener('scroll', scheduleMotion);
    window.removeEventListener('resize', scheduleMotion);
    if (observer) observer.disconnect();
    return;
  }
  window.addEventListener('scroll', scheduleMotion, { passive: true });
  window.addEventListener('resize', scheduleMotion);
  if (observer) prints.forEach(print => observer.observe(print));
  scheduleMotion();
}

applyPreference();
reducedMotion.addEventListener('change', applyPreference);
