(function () {
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Dev.to API - fetch latest articles
  const articlesGrid = document.getElementById('articles-grid');
  async function loadArticles() {
    // If articles grid isn't present, don't attempt to load articles.
    if (!articlesGrid) return;
    try {
      const res = await fetch('https://dev.to/api/articles?username=andrewbaisden&per_page=9');
      if (!res.ok) throw new Error('Failed to load articles');
      const articles = await res.json();

      if (!Array.isArray(articles)) return;

      const cards = articles.map((a) => {
        const url = a.url || a.canonical_url;
        const title = a.title;
        const desc = a.description || '';
        const readableDate = a.readable_publish_date || '';
        const tags = (a.tags || []).slice(0, 4);

        return `
          <article class="card">
            <a href="${url}" target="_blank" rel="noopener" aria-label="${title}">
              <h3 class="card-title">${escapeHtml(title)}</h3>
            </a>
            <p class="card-desc">${escapeHtml(desc)}</p>
            <div class="card-meta">
              <span>${readableDate}</span>
              <a href="${url}" target="_blank" rel="noopener">Read →</a>
            </div>
            <div class="card-tags">
              ${tags.map(t => `<span class="tag">#${escapeHtml(t)}</span>`).join('')}
            </div>
          </article>
        `;
      }).join('');

      articlesGrid.innerHTML = cards;
    } catch (e) {
      // If the grid exists, show a message; otherwise just log.
      if (articlesGrid) {
        articlesGrid.innerHTML = `
          <div class="card">
            <p class="card-desc">Unable to load Dev.to articles at the moment.</p>
          </div>
        `;
      }
      console.error(e);
    }
  }

  // GitHub API - fetch highlighted repos
  const projectsGrid = document.getElementById('projects-grid');
  async function loadProjects() {
    try {
      // Fetch user repos and pick a few with stars
      const res = await fetch('https://api.github.com/users/andrewbaisden/repos?per_page=100&sort=updated');
      if (!res.ok) throw new Error('Failed to load repos');
      const repos = await res.json();

      // Filter fork=false, has topics if available, and some stars
      const topRepos = repos
        .filter(r => !r.fork)
        .sort((a, b) => (b.stargazers_count || 0) - (a.stargazers_count || 0))
        .slice(0, 6);

      const cards = topRepos.map((r) => {
        const url = r.html_url;
        const name = r.name;
        const desc = r.description || '';
        const stars = r.stargazers_count || 0;
        const lang = r.language || '—';

        return `
          <article class="card">
            <a href="${url}" target="_blank" rel="noopener" aria-label="${name}">
              <h3 class="card-title">${escapeHtml(name)}</h3>
            </a>
            <p class="card-desc">${escapeHtml(desc)}</p>
            <div class="card-meta">
              <span>${lang}</span>
              <span>★ ${stars}</span>
            </div>
          </article>
        `;
      }).join('');

      projectsGrid.innerHTML = cards;
    } catch (e) {
      projectsGrid.innerHTML = `
        <div class="card">
          <p class="card-desc">Unable to load GitHub projects at the moment.</p>
        </div>
      `;
      console.error(e);
    }
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  loadArticles();
  loadProjects();
})();