/* Year */
document.getElementById('year').textContent = new Date().getFullYear();

/* Smooth scroll for internal links */
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const targetId = a.getAttribute('href').slice(1);
    const el = document.getElementById(targetId);
    if (el) {
      e.preventDefault();
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

/* Intersection reveal */
const revealEls = Array.from(document.querySelectorAll('.reveal'));
const io = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.2 });
revealEls.forEach(el => io.observe(el));

/* Magnetic buttons effect */
document.querySelectorAll('.magnetic').forEach(btn => {
  btn.addEventListener('mousemove', e => {
    const rect = btn.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    btn.style.transform = `translate(${x * 0.08}px, ${y * 0.18}px)`;
  });
  btn.addEventListener('mouseleave', () => {
    btn.style.transform = 'translate(0,0)';
  });
});

/* Parallax hero image */
const heroImg = document.querySelector('.hero-image');
if (heroImg) {
  document.addEventListener('mousemove', e => {
    const x = (e.clientX / window.innerWidth - 0.5) * 2; // -1 to 1
    const y = (e.clientY / window.innerHeight - 0.5) * 2;
    heroImg.style.transform = `perspective(1000px) rotateX(${y * 3}deg) rotateY(${x * -5}deg)`;
  });
}

/* Lightweight carousel */
const carousel = document.querySelector('.testimonials-carousel');
const prev = document.querySelector('[data-prev]');
const next = document.querySelector('[data-next]');
let index = 0;

function renderCarousel() {
  const items = Array.from(carousel.children);
  items.forEach((item, i) => {
    item.style.display = Math.abs(i - index) <= 2 ? 'grid' : 'none';
  });
}
function shift(dir) {
  const len = carousel.children.length;
  index = (index + dir + len) % len;
  renderCarousel();
}
if (carousel) {
  renderCarousel();
  prev?.addEventListener('click', () => shift(-1));
  next?.addEventListener('click', () => shift(1));
  // auto-play
  setInterval(() => shift(1), 6000);
}

/* Animated background particles */
const canvas = document.getElementById('bg-canvas');
const ctx = canvas.getContext('2d', { alpha: true });

let particles = [];
let animationId;
function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
function initParticles() {
  particles = Array.from({ length: Math.min(120, Math.floor(window.innerWidth / 12)) }, () => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: Math.random() * 1.8 + 0.4,
    vx: (Math.random() - 0.5) * 0.3,
    vy: (Math.random() - 0.5) * 0.3,
    hue: 230 + Math.random() * 50
  }));
}
function step() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (const p of particles) {
    p.x += p.vx; p.y += p.vy;
    if (p.x < -50) p.x = canvas.width + 50;
    if (p.y < -50) p.y = canvas.height + 50;
    if (p.x > canvas.width + 50) p.x = -50;
    if (p.y > canvas.height + 50) p.y = -50;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${p.hue}, 80%, 70%, 0.15)`;
    ctx.fill();

    // soft connections
    for (const q of particles) {
      const dx = p.x - q.x, dy = p.y - q.y;
      const dist = Math.hypot(dx, dy);
      if (dist < 90) {
        ctx.strokeStyle = `hsla(${(p.hue + q.hue) / 2}, 70%, 60%, ${0.05 - dist / 1800})`;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }
  }
  animationId = requestAnimationFrame(step);
}
function start() {
  resize();
  initParticles();
  cancelAnimationFrame(animationId);
  step();
}
window.addEventListener('resize', start);
start();

/* GitHub latest contributions feed */
const FEED_EL = document.getElementById('gh-feed');
async function loadFeed() {
  if (!FEED_EL) return;
  try {
    const res = await fetch('https://api.github.com/users/theprinceraj/events?per_page=25', {
      headers: { 'Accept': 'application/vnd.github+json' }
    });
    const data = await res.json();
    const items = Array.isArray(data) ? data.slice(0, 8) : [];
    FEED_EL.innerHTML = items.map(ev => renderItem(ev)).join('');
  } catch (_) {
    FEED_EL.innerHTML = '<li><span class="badge">!</span><div>Unable to load activity.</div></li>';
  }
}
function renderItem(ev) {
  const type = ev.type || 'Event';
  const repo = ev.repo?.name || '';
  const url = (ev.payload?.pull_request?.html_url) ||
              (ev.payload?.issue?.html_url) ||
              (ev.payload?.comment?.html_url) ||
              (repo ? `https://github.com/${repo}` : '#');
  const time = relativeTime(ev.created_at);
  const icon = iconFor(type);
  const title = titleFor(ev);
  return `
    <li>
      <span class="badge">${icon}</span>
      <div>
        <div>${title}</div>
        <div class="meta">${repo}</div>
      </div>
      <time class="meta" datetime="${ev.created_at}">${time}</time>
    </li>
  `;
}
function iconFor(type) {
  switch (type) {
    case 'PushEvent': return '⬆️';
    case 'PullRequestEvent': return '🔀';
    case 'IssuesEvent': return '❗';
    case 'IssueCommentEvent': return '💬';
    case 'CreateEvent': return '📦';
    case 'WatchEvent': return '⭐';
    case 'ForkEvent': return '🍴';
    case 'PublicEvent': return '📣';
    default: return '🔧';
  }
}
function titleFor(ev) {
  const type = ev.type;
  const repo = ev.repo?.name || '';
  if (type === 'PushEvent') return `Pushed to ${repo}`;
  if (type === 'PullRequestEvent') return `${ev.payload.action} PR #${ev.payload.pull_request?.number ?? ''}`;
  if (type === 'IssuesEvent') return `${ev.payload.action} issue #${ev.payload.issue?.number ?? ''}`;
  if (type === 'IssueCommentEvent') return `Commented on issue #${ev.payload.issue?.number ?? ''}`;
  if (type === 'CreateEvent') return `Created ${ev.payload.ref_type} ${ev.payload.ref ?? ''}`;
  if (type === 'WatchEvent') return `Starred ${repo}`;
  if (type === 'ForkEvent') return `Forked ${repo}`;
  return type || 'Activity';
}
function relativeTime(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.round(days / 30);
  return `${months}mo ago`;
}
loadFeed();