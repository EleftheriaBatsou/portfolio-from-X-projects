/**
 * Portfolio Generator — Unique link per portfolio (no downloads).
 * - Randomized theme, layout, animations with deterministic seed.
 * - Avatar appears once (header or hero).
 * - Renders portfolio automatically if URL params present (?user=...).
 * - Generates a unique URL to share/deploy.
 */

const form = document.getElementById('config-form');
const configSection = document.getElementById('config-section');
const portfolioSection = document.getElementById('portfolio-section');

const githubUrlInput = document.getElementById('githubUrl');
const useCustomColorInput = document.getElementById('useCustomColor');
const colorPickerWrap = document.getElementById('colorPickerWrap');
const bgColorInput = document.getElementById('bgColor');
const resultWrap = document.getElementById('result');
const resultLinkInput = document.getElementById('resultLink');
const copyBtn = document.getElementById('copyBtn');

const portfolio = document.getElementById('portfolio');

// Portfolio nodes
const headerAvatarSlot = document.querySelector('.header-avatar');
const headerSocials = document.querySelector('.header-socials');

const heroAvatarSlot = document.querySelector('.hero-avatar');
const heroTitleNameInline = document.querySelector('.name-inline');

const nameEl = document.querySelector('.titles .name');
const taglineEl = document.querySelector('.titles .tagline');
const aboutTextEl = document.getElementById('about-text');
const socialListEl = document.getElementById('social-list');

useCustomColorInput.addEventListener('change', () => {
  colorPickerWrap.hidden = !useCustomColorInput.checked;
});

// Seeded PRNG (Mulberry32) for deterministic randomness
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function randChoice(rand, arr) {
  return arr[Math.floor(rand() * arr.length)];
}
function randFloat(rand, min = 0, max = 1) {
  return min + (max - min) * rand();
}

// Palettes and variants
const palettes = [
  ['#60a5fa','#34d399','#f472b6'],
  ['#a78bfa','#22d3ee','#f97316'],
  ['#10b981','#fde68a','#fb7185'],
  ['#f59e0b','#84cc16','#38bdf8'],
  ['#ef4444','#14b8a6','#8b5cf6'],
  ['#0ea5e9','#f43f5e','#f59e0b'],
  ['#7dd3fc','#d8b4fe','#fda4af'],
  ['#059669','#2563eb','#fca5a5'],
];

const themeClasses = ['theme-glass','theme-gradient','theme-mesh','theme-stripe'];
const layoutClasses = ['layout-sidebar','layout-split','layout-cardstack','layout-minimal'];

const placementOptions = ['header','hero'];

const crazyAnimations = {
  blobs: true, // animated blobs in hero
};

// Extract username from a GitHub profile URL
function parseGitHubUsername(url) {
  try {
    const u = new URL(url.trim());
    if (u.hostname !== 'github.com') return null;
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[0] || null;
  } catch {
    return null;
  }
}

async function fetchGitHubUser(username) {
  const resp = await fetch(`https://api.github.com/users/${username}`);
  if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);
  return await resp.json();
}

function clearAvatarSlots() {
  headerAvatarSlot.innerHTML = '';
  heroAvatarSlot.innerHTML = '';
}

// Only render the avatar in the selected slot
function renderAvatar(avatarUrl, placement) {
  clearAvatarSlots();
  const img = document.createElement('img');
  img.src = avatarUrl;
  img.alt = 'Profile avatar';
  img.loading = 'lazy';
  img.width = placement === 'hero' ? 120 : 56;
  img.height = placement === 'hero' ? 120 : 56;

  if (placement === 'header') headerAvatarSlot.appendChild(img);
  else heroAvatarSlot.appendChild(img);
}

function applyTheme(rand, customBgHex) {
  // Reset classes
  portfolio.classList.remove(...themeClasses, ...layoutClasses);

  const themeClass = randChoice(rand, themeClasses);
  const layoutClass = randChoice(rand, layoutClasses);
  portfolio.classList.add(themeClass, layoutClass);

  // Colors and alpha
  const palette = randChoice(rand, palettes);
  const [c1, c2, c3] = palette;
  const alpha = randFloat(rand, 0.5, 0.95);
  portfolio.style.setProperty('--c1', c1);
  portfolio.style.setProperty('--c2', c2);
  portfolio.style.setProperty('--c3', c3);
  portfolio.style.setProperty('--alpha', alpha.toFixed(2));

  // Optional custom background override (semi-transparent)
  if (customBgHex) {
    portfolio.style.background = customBgHex + Math.floor(alpha * 255).toString(16).padStart(2, '0');
  } else {
    portfolio.style.background = ''; // let theme class backgrounds apply
  }

  // Crazy animations: optionally add hero blobs
  const heroEl = document.querySelector('.hero');
  // Clear existing blobs
  heroEl.querySelectorAll('.blob').forEach(b => b.remove());
  if (themeClass === 'theme-mesh' || rand() > 0.5) {
    for (let i = 0; i < 3; i++) {
      const blob = document.createElement('div');
      blob.className = 'blob';
      blob.style.left = `${Math.floor(rand()*80)}%`;
      blob.style.top = `${Math.floor(rand()*60)}%`;
      heroEl.appendChild(blob);
    }
  }
}

function renderSocials(user, githubProfileUrl) {
  // Header socials
  headerSocials.innerHTML = '';
  const ghHeaderLink = document.createElement('a');
  ghHeaderLink.href = githubProfileUrl;
  ghHeaderLink.target = '_blank';
  ghHeaderLink.rel = 'noopener noreferrer';
  ghHeaderLink.textContent = 'GitHub';
  headerSocials.appendChild(ghHeaderLink);

  if (user.twitter_username) {
    const twHeaderLink = document.createElement('a');
    twHeaderLink.href = `https://twitter.com/${user.twitter_username}`;
    twHeaderLink.target = '_blank';
    twHeaderLink.rel = 'noopener noreferrer';
    twHeaderLink.textContent = 'Twitter';
    headerSocials.appendChild(twHeaderLink);
  }

  if (user.blog) {
    const blogHeaderLink = document.createElement('a');
    blogHeaderLink.href = user.blog;
    blogHeaderLink.target = '_blank';
    blogHeaderLink.rel = 'noopener noreferrer';
    blogHeaderLink.textContent = 'Website';
    headerSocials.appendChild(blogHeaderLink);
  }

  // Social section (list)
  socialListEl.innerHTML = '';
  const ghItem = document.createElement('li');
  ghItem.innerHTML = `<a href="${githubProfileUrl}" target="_blank" rel="noopener noreferrer">GitHub</a>`;
  socialListEl.appendChild(ghItem);

  if (user.twitter_username) {
    const twItem = document.createElement('li');
    twItem.innerHTML = `<a href="https://twitter.com/${user.twitter_username}" target="_blank" rel="noopener noreferrer">Twitter</a>`;
    socialListEl.appendChild(twItem);
  }

  if (user.blog) {
    const blogItem = document.createElement('li');
    blogItem.innerHTML = `<a href="${user.blog}" target="_blank" rel="noopener noreferrer">Website</a>`;
    socialListEl.appendChild(blogItem);
  }
}

function buildUniqueLink({ username, placement, seed, customBg }) {
  const params = new URLSearchParams();
  params.set('user', username);
  params.set('seed', String(seed));
  params.set('place', placement);
  if (customBg) params.set('bg', customBg);
  return `${location.origin}${location.pathname}?${params.toString()}`;
}

function parseParams() {
  const p = new URLSearchParams(location.search);
  const user = p.get('user');
  const seed = Number(p.get('seed') || 0);
  const place = p.get('place');
  const bg = p.get('bg');
  return { user, seed, place, bg };
}

async function renderFromParams() {
  const { user, seed, place, bg } = parseParams();
  if (!user || !seed) return false;

  // Hide config; show portfolio section
  configSection.hidden = true;
  portfolioSection.hidden = false;

  const rand = mulberry32(seed);

  try {
    const u = await fetchGitHubUser(user);

    // Text fields
    const displayName = u.name || u.login || user;
    const bio = u.bio || 'This user has no bio set on GitHub.';
    const tagline = u.company || u.location || '';

    nameEl.textContent = displayName;
    taglineEl.textContent = tagline;
    heroTitleNameInline.textContent = displayName;
    aboutTextEl.textContent = bio;

    // Theme and layout
    applyTheme(rand, bg);

    // Placement (if not provided, random)
    const placement = (place && placementOptions.includes(place)) ? place : randChoice(rand, placementOptions);
    renderAvatar(u.avatar_url, placement);

    // Socials
    renderSocials(u, `https://github.com/${user}`);

    return true;
  } catch (err) {
    console.error(err);
    alert('Unable to fetch GitHub profile from URL parameters.');
    return false;
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const githubUrl = githubUrlInput.value;
  const username = parseGitHubUsername(githubUrl);
  if (!username) {
    alert('Please enter a valid GitHub profile URL, e.g., https://github.com/octocat');
    return;
  }

  const placementSelected = document.querySelector('input[name="avatarPlacement"]:checked').value;
  const placement = placementSelected === 'random' ? null : placementSelected;
  const useColor = useCustomColorInput.checked;
  const customBg = useColor ? bgColorInput.value : null;

  // Generate a strong random seed
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const seed = buf[0] || Math.floor(Math.random() * 1e9);

  const link = buildUniqueLink({ username, placement: placement || 'random', seed, customBg });
  resultLinkInput.value = link;
  resultWrap.hidden = false;
});

copyBtn.addEventListener('click', () => {
  resultLinkInput.select();
  document.execCommand('copy');
});

// Auto-render if URL contains params
(async () => {
  const rendered = await renderFromParams();
  if (rendered) {
    // Portfolio already shown
  } else {
    // Show config if no params
    configSection.hidden = false;
    portfolioSection.hidden = true;
  }
})();