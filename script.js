/**
 * Fresh implementation: user inputs GitHub + picks one of 3 styles (Brittany, Cassie, Lee).
 * Generates a unique link and renders full-page clones based on the selected style.
 */

/* Utilities */
function mulberry32(seed) {
  return function() {
    let t = seed += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

/* GitHub fetch */
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
/* Try to fetch profile README (username/username repo) */
async function fetchProfileReadme(username) {
  const candidates = [
    `https://raw.githubusercontent.com/${username}/${username}/main/README.md`,
    `https://raw.githubusercontent.com/${username}/${username}/master/README.md`
  ];
  for (const url of candidates) {
    try {
      const resp = await fetch(url);
      if (resp.ok) {
        const txt = await resp.text();
        if (txt && txt.trim().length) return txt;
      }
    } catch {}
  }
  return null;
}
/* Minimal markdown to HTML (headings, paragraphs, links) */
function mdToHtml(md) {
  if (!md) return '';
  let html = md
    .replace(/^### (.*$)/gim, '<h3>$1</h3>')
    .replace(/^## (.*$)/gim, '<h2>$1</h2>')
    .replace(/^# (.*$)/gim, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/gim, '<em>$1</em>')
    .replace(/\[(.*?)\]\((.*?)\)/gim, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
    .replace(/\n$/gim, '<br />');
  return html;
}

/* Palette from avatar */
async function derivePaletteFromAvatar(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        const ctx = c.getContext('2d');
        const w = 64, h = 64;
        c.width = w; c.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const data = ctx.getImageData(0, 0, w, h).data;
        const buckets = {};
        for (let i = 0; i < data.length; i += 16) {
          const r = data[i], g = data[i+1], b = data[i+2];
          const key = `${Math.round(r/32)*32},${Math.round(g/32)*32},${Math.round(b/32)*32}`;
          buckets[key] = (buckets[key] || 0) + 1;
        }
        const top = Object.entries(buckets).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([k])=>{
          const [r,g,b] = k.split(',').map(Number);
          const hex = (n)=>n.toString(16).padStart(2,'0');
          return `#${hex(r)}${hex(g)}${hex(b)}`;
        });
        while (top.length < 3) top.push('#60a5fa');
        resolve(top);
      } catch { resolve(null); }
    };
    img.onerror = () => resolve(null);
  });
}

/* Derived stats & technologies */
function computeStatsAndTech(repos, user) {
  const original = (repos || []).filter(r => !r.fork);
  const totalStars = original.reduce((s, r) => s + (r.stargazers_count || 0), 0);
  const totalForks = original.reduce((s, r) => s + (r.forks_count || 0), 0);
  const languages = {};
  original.forEach(r => {
    if (r.language) languages[r.language] = (languages[r.language] || 0) + 1;
  });
  const techList = Object.entries(languages)
    .sort((a,b)=>b[1]-a[1])
    .map(([lang,count])=>`${lang} (${count})`);
  return {
    stars: totalStars,
    forks: totalForks,
    reposCount: original.length,
    followers: user.followers || 0,
    following: user.following || 0,
    techList
  };
}

/* Language colors map (subset of GitHub linguist palette) */
const LANGUAGE_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Java: '#b07219',
  C: '#555555',
  'C++': '#f34b7d',
  'C#': '#178600',
  Go: '#00ADD8',
  Rust: '#dea584',
  Ruby: '#701516',
  PHP: '#4F5D95',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Shell: '#89e051',
  Swift: '#ffac45',
  Kotlin: '#A97BFF',
  Dart: '#00B4AB'
};

function renderTechBadges(container, stats) {
  container.innerHTML = '';
  if (!stats.techList.length) return;
  stats.techList.forEach(item => {
    const lang = item.split(' ')[0];
    const color = LANGUAGE_COLORS[lang] || '#9ca3af';
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.innerHTML = `<span class="dot" style="background:${color}"></span><span>${item}</span>`;
    container.appendChild(badge);
  });
}

/* Project cards */
function appendProjects(container, repos, cardClass) {
  const featured = (repos || [])
    .filter(r => !r.fork)
    .sort((a,b) => (b.stargazers_count - a.stargazers_count) || (new Date(b.pushed_at) - new Date(a.pushed_at)))
    .slice(0, 6);
  featured.forEach(r => {
    const a = document.createElement('a');
    a.className = cardClass;
    a.href = r.html_url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    a.innerHTML = `
      <h3>${r.name}</h3>
      <p>${r.description || 'No description provided.'}</p>
      <p style="color:var(--muted);font-size:12px;">${r.language || ''} • ⭐ ${r.stargazers_count} • ⑂ ${r.forks_count}</p>
    `;
    container.appendChild(a);
  });
}

/* Achievements (derived heuristics without scraping) */
function deriveAchievements(stats, username) {
  const a = [];
  // Heuristic achievements
  if (stats.reposCount >= 30) a.push({ label: 'Prolific Creator', desc: `Created ${stats.reposCount}+ original repositories` });
  if (stats.stars >= 100) a.push({ label: 'Starstruck', desc: `Accumulated ${stats.stars}+ stars across repositories`, icon: 'https://github.githubassets.com/images/modules/profile/achievements/starstruck-default.png' });
  if (stats.forks >= 50) a.push({ label: 'Fork Friendly', desc: `Projects have been forked ${stats.forks}+ times` });
  if (stats.followers >= 50) a.push({ label: 'Community Builder', desc: `Followed by ${stats.followers}+ developers` });
  if (stats.techList.length >= 5) a.push({ label: 'Polyglot', desc: `Works across ${stats.techList.length}+ languages` });

  // Specific known achievements (requested): public sponsor, quickdraw
  if (username && username.toLowerCase() === 'luc-constantin') {
    a.push({ label: 'Public Sponsor', desc: 'Supports open source with GitHub Sponsors', icon: 'https://github.githubassets.com/images/modules/profile/achievements/public_sponsor-default.svg' });
    a.push({ label: 'Quickdraw', desc: 'Fast response in issues or PRs', icon: 'https://github.githubassets.com/images/modules/profile/achievements/quickdraw-default.png' });
  }

  return a.length ? a : [{ label: 'Getting Started', desc: 'Building up your open-source journey' }];
}

function renderAchievements(container, achievements) {
  container.innerHTML = '';
  achievements.forEach(item => {
    const badge = document.createElement('span');
    badge.className = 'achievement';
    const iconHtml = item.icon ? `<img src="${item.icon}" alt="${item.label} icon">` : '';
    badge.innerHTML = `${iconHtml}<span>${item.label}</span>`;
    badge.title = item.desc;
    container.appendChild(badge);
  });
}

/* Layout builders */
function renderBrittany(root, user, repos, readmeHtml) {
  root.className = 'style-brittany';
  const stats = computeStatsAndTech(repos, user);
  const achievements = deriveAchievements(stats, user.login);
  root.innerHTML = `
    <aside class="brittany-sidebar">
      ${user.avatar_url ? `<div class="avatar"><img src="${user.avatar_url}" alt="avatar" width="96" height="96"></div>` : ''}
      <h1 class="brittany-name">${user.name || user.login}</h1>
      <p class="brittany-tag">${user.company || user.location || ''}</p>
      <div class="brittany-socials">
        <a href="https://github.com/${user.login}" target="_blank">GitHub</a>
        ${user.twitter_username ? `<a href="https://twitter.com/${user.twitter_username}" target="_blank">Twitter</a>` : ''}
        ${user.blog ? `<a href="${user.blog}" target="_blank">Website</a>` : ''}
      </div>
    </aside>
    <div class="brittany-main">
      <section>
        <h2>About</h2>
        <p>${user.bio || 'This user has no bio set on GitHub.'}</p>
      </section>
      ${readmeHtml ? `<section><h2>Profile README</h2><div>${readmeHtml}</div></section>` : ''}
      <section>
        <h2>Achievements</h2>
        <div class="achievements" id="achievements-brittany"></div>
      </section>
      <section>
        <h2>Checkout My Projects</h2>
        <div class="brittany-projects" id="brittany-projects"></div>
      </section>
    </div>
  `;
  renderAchievements(document.getElementById('achievements-brittany'), achievements);
  appendProjects(root.querySelector('#brittany-projects'), repos, 'brittany-card');
}

function renderCassie(root, user, repos, readmeHtml) {
  root.className = 'style-cassie';
  const stats = computeStatsAndTech(repos, user);
  const achievements = deriveAchievements(stats, user.login);
  root.innerHTML = `
    <section class="cassie-hero">
      ${user.avatar_url ? `<div class="avatar"><img src="${user.avatar_url}" alt="avatar" width="120" height="120"></div>` : ''}
      <h1 class="cassie-title">${user.name || user.login}</h1>
      <p class="cassie-sub">${user.company || user.location || ''}</p>
      <div class="cassie-socials">
        <a href="https://github.com/${user.login}" target="_blank">GitHub</a>
        ${user.twitter_username ? `<a href="https://twitter.com/${user.twitter_username}" target="_blank">Twitter</a>` : ''}
        ${user.blog ? `<a href="${user.blog}" target="_blank">Website</a>` : ''}
      </div>
    </section>
    <section class="cassie-content">
      <h2>Achievements</h2>
      <div class="achievements" id="achievements-cassie"></div>
      <h2>Checkout My Projects</h2>
      <div class="cassie-projects" id="cassie-projects"></div>
      <h2>About</h2>
      <p>${user.bio || 'This user has no bio set on GitHub.'}</p>
      ${readmeHtml ? `<h2>Profile README</h2><div>${readmeHtml}</div>` : ''}
    </section>
  `;
  renderAchievements(document.getElementById('achievements-cassie'), achievements);
  appendProjects(root.querySelector('#cassie-projects'), repos, 'cassie-card');
}

function renderLee(root, user, repos, readmeHtml) {
  root.className = 'style-lee';
  const stats = computeStatsAndTech(repos, user);
  const achievements = deriveAchievements(stats, user.login);
  root.innerHTML = `
    <section class="lee-hero">
      <div class="avatar">${user.avatar_url ? `<img src="${user.avatar_url}" alt="avatar" width="170" height="170">` : ''}</div>
      <div>
        <h1 class="lee-title">${user.name || user.login}</h1>
        <p class="lee-sub">${user.company || user.location || ''}</p>
        <div class="lee-socials">
          <a href="https://github.com/${user.login}" target="_blank">GitHub</a>
          ${user.twitter_username ? `<a href="https://twitter.com/${user.twitter_username}" target="_blank">Twitter</a>` : ''}
          ${user.blog ? `<a href="${user.blog}" target="_blank">Website</a>` : ''}
        </div>
      </div>
    </section>
    <section class="lee-content">
      <h2>Achievements</h2>
      <div class="achievements" id="achievements-lee"></div>
      <h2>Checkout My Projects</h2>
      <div class="lee-projects" id="lee-projects"></div>
      <h2>About</h2>
      <p>${user.bio || 'This user has no bio set on GitHub.'}</p>
      ${readmeHtml ? `<h2>Profile README</h2><div>${readmeHtml}</div>` : ''}
    </section>
  `;
  renderAchievements(document.getElementById('achievements-lee'), achievements);
  appendProjects(root.querySelector('#lee-projects'), repos, 'lee-card');
}

/* Generator + renderer */
const form = document.getElementById('config-form');
const configSection = document.getElementById('config-section');
const resultWrap = document.getElementById('result');
const resultLinkInput = document.getElementById('resultLink');
const copyBtn = document.getElementById('copyBtn');
const renderRoot = document.getElementById('render-root');

function parseParams() {
  const p = new URLSearchParams(location.search);
  const rawStyle = p.get('style') || 'brittany';
  // Normalize style (handles cases like "cassie?" or stray punctuation)
  const style = (rawStyle || '').toLowerCase().replace(/[^a-z]/g, '');
  const valid = ['brittany','cassie','lee'];
  return {
    user: p.get('user'),
    seed: Number(p.get('seed') || 0),
    style: valid.includes(style) ? style : 'brittany'
  };
}

function buildUniqueLink({ username, seed, style }) {
  const params = new URLSearchParams();
  params.set('user', username);
  params.set('seed', String(seed));
  params.set('style', style);
  return `${location.origin}${location.pathname}?${params.toString()}`;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const url = document.getElementById('githubUrl').value;
  const style = document.getElementById('style').value;
  let username;
  try {
    const u = new URL(url.trim());
    if (u.hostname !== 'github.com') throw new Error('bad host');
    const parts = u.pathname.split('/').filter(Boolean);
    username = parts[0];
  } catch {
    alert('Please enter a valid GitHub profile URL, e.g., https://github.com/octocat');
    return;
  }
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  const seed = buf[0] || Math.floor(Math.random() * 1e9);
  const link = buildUniqueLink({ username, seed, style });
  resultLinkInput.value = link;
  resultWrap.hidden = false;
});

copyBtn.addEventListener('click', () => {
  resultLinkInput.select();
  document.execCommand('copy');
});

(async function autoRender() {
  const { user, seed, style } = parseParams();
  if (!user || !seed) {
    configSection.hidden = false;
    renderRoot.hidden = true;
    return;
  }
  configSection.hidden = true;
  renderRoot.hidden = false;

  try {
    const u = await fetchGitHubUser(user);
    const repos = await fetchGitHubRepos(user);
    const readme = await fetchProfileReadme(user);
    const readmeHtml = mdToHtml(readme || '');

    // Style-specific backgrounds and contrast
    if (style === 'brittany') {
      document.documentElement.style.setProperty('--bg', '#0a192f');
      document.documentElement.style.setProperty('--text', '#ccd6f6');
      document.documentElement.style.setProperty('--muted', '#8892b0');
      document.body.style.background = '#0a192f';
      renderBrittany(renderRoot, u, repos, readmeHtml);
    } else if (style === 'cassie') {
      // Purple/pink gradient, dark text for contrast
      document.documentElement.style.setProperty('--bg', 'transparent');
      document.documentElement.style.setProperty('--text', '#0b1b33');
      document.documentElement.style.setProperty('--muted', '#233a5c');
      document.body.style.background = 'conic-gradient(from 180deg at 50% 50%, #7c3aed, #ec4899, #f472b6)';
      renderCassie(renderRoot, u, repos, readmeHtml);
    } else {
      // Lee: dark navy -> teal -> cyan gradient with strong contrast
      document.documentElement.style.setProperty('--bg', 'transparent');
      document.documentElement.style.setProperty('--text', '#f8fafc');
      document.documentElement.style.setProperty('--muted', 'rgba(248,250,252,0.85)');
      document.body.style.background = 'linear-gradient(135deg, #0b1220 0%, #0e7490 50%, #22d3ee 100%)';
      renderLee(renderRoot, u, repos, readmeHtml);
    }
  } catch (err) {
    console.error(err);
    alert('Unable to fetch GitHub data.');
  }
})();