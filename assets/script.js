/**
 * Portfolio interactions and dynamic content loader
 * - Fetch latest GitHub repositories for @masterdevsabith
 * - Update footer year
 * - Configure optional YouTube embed via a single video ID
 */

const GITHUB_USERNAME = "masterdevsabith";
const REPOS_CONTAINER = document.getElementById("repo-cards");
const YEAR_EL = document.getElementById("year");

// Optionally set a YouTube video ID from @sabiiiiifx for the embed
const YOUTUBE_VIDEO_ID = "dQw4w9WgXcQ"; // replace with a recent video id
const ytIframe = document.getElementById("yt-iframe");

function setCurrentYear() {
  const now = new Date();
  if (YEAR_EL) YEAR_EL.textContent = String(now.getFullYear());
}

async function fetchGitHubRepos() {
  if (!REPOS_CONTAINER) return;
  REPOS_CONTAINER.innerHTML = `
    <article class="card">
      <div class="card-head">
        <h3>Loading Repositories</h3>
        <span class="badge">GitHub</span>
      </div>
      <p>Fetching latest repositories from GitHub…</p>
    </article>
  `;
  try {
    const url = `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=12`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);
    const data = await res.json();

    const projects = data
      .filter(r => !r.fork)
      .slice(0, 6)
      .map(repo => {
        const topics = (repo.topics || []).slice(0, 3);
        const lang = repo.language ? `<span class="badge">${repo.language}</span>` : "";
        const desc = repo.description || "No description provided.";
        const homepage = repo.homepage ? `<a class="chip" href="${repo.homepage}" target="_blank" rel="noopener">Live</a>` : "";
        const topicsHtml = topics.map(t => `<span class="chip">#${t}</span>`).join(" ");
        return `
          <article class="card">
            <div class="card-head">
              <h3>${repo.name}</h3>
              ${lang}
            </div>
            <p>${desc}</p>
            <div class="card-actions">
              <a class="chip" href="${repo.html_url}" target="_blank" rel="noopener">Repository</a>
              ${homepage}
              ${topicsHtml}
            </div>
          </article>
        `;
      })
      .join("");

    REPOS_CONTAINER.innerHTML = projects || `
      <article class="card">
        <div class="card-head">
          <h3>No repositories found</h3>
          <span class="badge">GitHub</span>
        </div>
        <p>It looks quiet here. Check back later.</p>
      </article>
    `;
  } catch (err) {
    REPOS_CONTAINER.innerHTML = `
      <article class="card">
        <div class="card-head">
          <h3>GitHub API Error</h3>
          <span class="badge">Error</span>
        </div>
        <p>${err.message}</p>
        <div class="card-actions">
          <a class="chip" href="https://github.com/${GITHUB_USERNAME}?tab=repositories" target="_blank" rel="noopener">View on GitHub</a>
        </div>
      </article>
    `;
  }
}

function setYouTubeEmbed() {
  if (!ytIframe) return;
  ytIframe.src = `https://www.youtube.com/embed/${YOUTUBE_VIDEO_ID}`;
}

function init() {
  setCurrentYear();
  setYouTubeEmbed();
  fetchGitHubRepos();
}

document.addEventListener("DOMContentLoaded", init);