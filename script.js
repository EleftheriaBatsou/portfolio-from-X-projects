/**
 * Portfolio Generator
 * - Input: GitHub profile URL
 * - Optional: Background color (via toggle + color picker)
 * - Avatar placement: header OR hero (not both)
 * - Social section: GitHub (always), Twitter/blog if available
 * - Footer: "Made with care — Cosine"
 * - Responsive styles handled in styles.css
 */

const form = document.getElementById('config-form');
const githubUrlInput = document.getElementById('githubUrl');
const useCustomColorInput = document.getElementById('useCustomColor');
const colorPickerWrap = document.getElementById('colorPickerWrap');
const bgColorInput = document.getElementById('bgColor');

const portfolio = document.getElementById('portfolio');

// Portfolio nodes
const headerEl = document.querySelector('.portfolio-header');
const headerAvatarSlot = document.querySelector('.header-avatar');
const headerSocials = document.querySelector('.header-socials');

const heroEl = document.querySelector('.hero');
const heroAvatarSlot = document.querySelector('.hero-avatar');
const heroTitleNameInline = document.querySelector('.name-inline');

const nameEl = document.querySelector('.titles .name');
const taglineEl = document.querySelector('.titles .tagline');
const aboutTextEl = document.getElementById('about-text');
const socialListEl = document.getElementById('social-list');

useCustomColorInput.addEventListener('change', () => {
  colorPickerWrap.hidden = !useCustomColorInput.checked;
});

// Extract username from a GitHub profile URL
function parseGitHubUsername(url) {
  try {
    const u = new URL(url.trim());
    if (u.hostname !== 'github.com') return null;
    const parts = u.pathname.split('/').filter(Boolean);
    // profile URLs are like /username
    return parts[0] || null;
  } catch {
    return null;
  }
}

async function fetchGitHubUser(username) {
  const resp = await fetch(`https://api.github.com/users/${username}`);
  if (!resp.ok) {
    throw new Error(`GitHub API error: ${resp.status}`);
  }
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

  if (placement === 'header') {
    headerAvatarSlot.appendChild(img);
  } else {
    heroAvatarSlot.appendChild(img);
  }
}

function setBackgroundColor(colorHex) {
  portfolio.style.background = colorHex;
}

function resetBackgroundColor() {
  portfolio.style.background = '';
}

// Render social bubbles in header and list section
function renderSocials(user, githubProfileUrl) {
  // Header socials (compact)
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

form.addEventListener('submit', async (e) => {
  e.preventDefault();

  const githubUrl = githubUrlInput.value;
  const username = parseGitHubUsername(githubUrl);
  if (!username) {
    alert('Please enter a valid GitHub profile URL, e.g., https://github.com/octocat');
    return;
  }

  const placement = document.querySelector('input[name="avatarPlacement"]:checked').value;
  const useColor = useCustomColorInput.checked;
  const color = bgColorInput.value;

  try {
    const user = await fetchGitHubUser(username);

    // Update text fields
    const name = user.name || user.login || username;
    const bio = user.bio || 'This user has no bio set on GitHub.';
    const tagline = user.company || user.location || '';

    nameEl.textContent = name;
    taglineEl.textContent = tagline;
    heroTitleNameInline.textContent = name;
    aboutTextEl.textContent = bio;

    // Avatar placement
    renderAvatar(user.avatar_url, placement);

    // Background color
    if (useColor) {
      setBackgroundColor(color);
    } else {
      resetBackgroundColor();
    }

    // Socials
    renderSocials(user, githubUrl);
  } catch (err) {
    console.error(err);
    alert('Unable to fetch GitHub profile. Please check the username/URL and try again.');
  }
});