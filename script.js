/**
 * Portfolio Generator — Prototype-style cloning with unique links.
 * Direct portfolio rendering when URL params present; no generator UI visible.
 */

const form = document.getElementById('config-form');
const configSection = document.getElementById('config-section');
const portfolioSection = document.getElementById('portfolio-section');

const githubUrlInput = document.getElementById('githubUrl');
const motionSelect = document.getElementById('motion');
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
const projectsGridEl = document.getElementById('projects-grid');

useCustomColorInput.addEventListener('change', () => {
  colorPickerWrap.hidden = !useCustomColorInput.checked;
});

// Seeded PRNG (Mulberry32)
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function randChoice(rand, arr) { return arr[Math.floor(rand() * arr.length)]; }
function randFloat(rand, min = 0, max = 1) { return min + (max - min) * rand(); }

// Palettes and theme families
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

// Extract username from a GitHub profile URL
function parseGitHubUsername(url) {
  try {
    const u = new URL(url.trim());
    if (u.hostname !== 'github.com') return null;
    const parts = u.pathname.split('/').filter(Boolean);
    return parts[0] || null;
  } catch { return null; }
}

async function fetchGitHubUser(username) {
  const resp = await fetch(`https://api.github.com/users/${username}`);
  if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);
  return await resp.json();
}
async function fetchGitHubRepos(username) {
  const resp = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`);
  if (!resp.ok) throw new Error(`GitHub API error: ${resp.status}`);
  return await resp.json();
}

// Dominant color extraction from avatar
async function derivePaletteFromAvatar(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const w = 64, h = 64;
        canvas.width = w; canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;

        const buckets = {};
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const key = `${Math.round(r/32)*32},${Math.round(g/32)*32},${Math.round(b/32)*32}`;
          buckets[key] = (buckets[key] || 0) + 1;
        }
        const sorted = Object.entries(buckets).sort((a,b) => b[1]-a[1]).slice(0,3);
        const cols = sorted.map(([k]) => {
          const [r,g,b] = k.split(',').map(Number);
          const toHex = (n) => n.toString(16).padStart(2,'0');
          return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
        });
        while (cols.length < 3) cols.push('#60a5fa');
        resolve(cols);
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
  });
}

function clearAvatarSlots() {
  headerAvatarSlot.innerHTML = '';
  heroAvatarSlot.innerHTML = '';
}
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

function applyTheme(rand, customBgHex, styleKey, motion, paletteOverride=null) {
  portfolio.classList.remove(...themeClasses, ...layoutClasses,
    'template-brittany', 'template-bruno', 'template-cassie', 'template-jhey', 'template-olaolu',
    'template-studio', 'template-oss', 'template-advocate', 'template-blog',
    'template-annie', 'template-itssharl', 'template-jesse', 'template-adamhartwig', 'template-kaleb',
    'template-lars', 'template-lynn', 'template-nealfun', 'template-circle', 'template-brice',
    'template-adham', 'template-tamal', 'template-constance', 'template-mason', 'template-robbowen', 'template-ewan'
  );

  const prototypeMap = {
    brittanychiang: { template: 'template-brittany', themes: ['theme-gradient','theme-glass'], layouts: ['layout-minimal','layout-cardstack'] },
    brunosimon:     { template: 'template-bruno',    themes: ['theme-mesh','theme-stripe'],   layouts: ['layout-split','layout-sidebar'] },
    cassie:         { template: 'template-cassie',   themes: ['theme-stripe','theme-mesh'],   layouts: ['layout-split','layout-cardstack'] },
    anniebombanie:  { template: 'template-annie',    themes: ['theme-gradient'],               layouts: ['layout-cardstack'] },
    itssharl:       { template: 'template-itssharl', themes: ['theme-gradient'],               layouts: ['layout-split'] },
    jessezhou:      { template: 'template-jesse',    themes: ['theme-gradient'],               layouts: ['layout-cardstack'] },
    jhey:           { template: 'template-jhey',     themes: ['theme-gradient','theme-stripe'],layouts: ['layout-split','layout-cardstack'] },
    adamhartwig:    { template: 'template-adamhartwig', themes: ['theme-mesh'],               layouts: ['layout-split'] },
    kalebmckelvey:  { template: 'template-kaleb',    themes: ['theme-gradient'],               layouts: ['layout-split'] },
    larsolson:      { template: 'template-lars',     themes: ['theme-gradient'],               layouts: ['layout-cardstack'] },
    lynnandtonic:   { template: 'template-lynn',     themes: ['theme-stripe'],                 layouts: ['layout-split'] },
    nealfun:        { template: 'template-nealfun',  themes: ['theme-mesh'],                   layouts: ['layout-minimal'] },
    nealfun_circle: { template: 'template-circle',   themes: ['theme-stripe'],                 layouts: ['layout-minimal'] },
    briceclain:     { template: 'template-brice',    themes: ['theme-gradient'],               layouts: ['layout-split'] },
    olaolu:         { template: 'template-olaolu',   themes: ['theme-gradient'],               layouts: ['layout-split'] },
    adhamdannaway:  { template: 'template-adham',    themes: ['theme-gradient'],               layouts: ['layout-split'] },
    tamalsen:       { template: 'template-tamal',    themes: ['theme-gradient'],               layouts: ['layout-split'] },
    constancesouville:{ template:'template-constance',themes:['theme-gradient'],               layouts:['layout-cardstack'] },
    masontywong:    { template: 'template-mason',    themes: ['theme-gradient'],               layouts: ['layout-split'] },
    robbowen:       { template: 'template-robbowen', themes: ['theme-gradient'],               layouts: ['layout-split'] },
    ewankerboas:    { template: 'template-ewan',     themes: ['theme-gradient'],               layouts: ['layout-cardstack'] },
    auto:           { template: rand() < .5 ? 'template-studio' : 'template-brittany', themes: themeClasses, layouts: layoutClasses }
  };

  const prefs = prototypeMap[styleKey] || prototypeMap.auto;
  const themeClass = randChoice(rand, prefs.themes);
  const layoutClass = randChoice(rand, prefs.layouts);
  portfolio.classList.add(themeClass, layoutClass, prefs.template);

  const palette = paletteOverride || randChoice(rand, palettes);
  const [c1, c2, c3] = palette;
  const alphaBase = { subtle: 0.65, moderate: 0.8, energetic: 0.95 }[motion] || 0.8;
  const alpha = randFloat(rand, alphaBase-0.05, alphaBase+0.05);
  portfolio.style.setProperty('--c1', c1);
  portfolio.style.setProperty('--c2', c2);
  portfolio.style.setProperty('--c3', c3);
  portfolio.style.setProperty('--alpha', Math.max(0.5, Math.min(alpha, 0.98)).toFixed(2));

  if (customBgHex) {
    portfolio.style.background = customBgHex + Math.floor(alpha * 255).toString(16).padStart(2, '0');
  } else {
    portfolio.style.background = '';
  }

  const heroEl = document.querySelector('.hero');
  heroEl.querySelectorAll('.blob').forEach(b => b.remove());
  const blobChance = motion === 'energetic' ? 0.85 : motion === 'moderate' ? 0.6 : 0.35;
  if (themeClass === 'theme-mesh' || rand() < blobChance) {
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

function buildProjectCard(repo) {
  const el = document.createElement('a');
  el.className = 'project-card';
  el.href = repo.html_url;
  el.target = '_blank';
  el.rel = 'noopener noreferrer';

  const desc = repo.description || 'No description provided.';
  const lang = repo.language ? `<span class="badge">${repo.language}</span>` : '';
  const stars = `<span class="badge">⭐ ${repo.stargazers_count}</span>`;
  const forks = `<span class="badge">⑂ ${repo.forks_count}</span>`;

  el.innerHTML = `
    <h4 class="project-title">${repo.name}</h4>
    <p class="project-desc">${desc}</p>
    <div class="project-meta">${lang}${stars}${forks}</div>
  `;
  return el;
}

function renderProjects(repos, rand) {
  projectsGridEl.innerHTML = '';
  if (!Array.isArray(repos) || repos.length === 0) return;

  const sorted = repos
    .filter(r => !r.fork)
    .sort((a,b) => (b.stargazers_count - a.stargazers_count) || (new Date(b.pushed_at) - new Date(a.pushed_at)));

  const count = Math.min(5, Math.max(1, Math.round(randFloat(rand, 3, 5))));
  const featured = sorted.slice(0, count);
  featured.forEach(r => projectsGridEl.appendChild(buildProjectCard(r)));
}

function buildUniqueLink({ username, placement, seed, customBg, style, motion }) {
  const params = new URLSearchParams();
  params.set('user', username);
  params.set('seed', String(seed));
  params.set('place', placement);
  if (customBg) params.set('bg', customBg);
  if (style) params.set('style', style);
  if (motion) params.set('motion', motion);
  return `${location.origin}${location.pathname}?${params.toString()}`;
}

function parseParams() {
  const p = new URLSearchParams(location.search);
  const user = p.get('user');
  const seed = Number(p.get('seed') || 0);
  const place = p.get('place');
  const bg = p.get('bg');
  const style = p.get('style') || 'auto';
  const motion = p.get('motion') || 'moderate';
  return { user, seed, place, bg, style, motion };
}

async function renderFromParams() {
  const { user, seed, place, bg, style, motion } = parseParams();
  if (!user || !seed) return false;

  configSection.hidden = true;
  portfolioSection.hidden = false;

  const rand = mulberry32(seed);

  try {
    const u = await fetchGitHubUser(user);

    const displayName = u.name || u.login || user;
    const bio = u.bio || 'This user has no bio set on GitHub.';
    const tagline = u.company || u.location || '';

    nameEl.textContent = displayName;
    taglineEl.textContent = tagline;
    heroTitleNameInline.textContent = displayName;
    aboutTextEl.textContent = bio;

    const avatarPalette = await derivePaletteFromAvatar(u.avatar_url);

    applyTheme(rand, bg, style, motion, avatarPalette);

    const placement = (place && placementOptions.includes(place)) ? place : randChoice(rand, placementOptions);
    renderAvatar(u.avatar_url, placement);

    renderSocials(u, `https://github.com/${user}`);

    const repos = await fetchGitHubRepos(user);
    renderProjects(repos, rand);

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
  const placement = placementSelected === 'random' ? 'random' : placementSelected;
  const useColor = useCustomColorInput.checked;
  const customBg = useColor ? bgColorInput.value : null;
  const style = document.getElementById('prototype').value || 'auto';
  const motion = document.getElementById('motion').value || 'moderate';

  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const seed = buf[0] || Math.floor(Math.random() * 1e9);

  const link = buildUniqueLink({ username, placement, seed, customBg, style, motion });
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
  if (!rendered) {
    configSection.hidden = false;
    portfolioSection.hidden = true;
  }
})();