// Minimal client-side interactions and GitHub integration

const USERNAME = "brisqdev";

// Footer year
(function setYear() {
  const els = document.querySelectorAll("#year");
  const y = new Date().getFullYear();
  els.forEach(el => (el.textContent = y));
})();

// Reveal on scroll
(function revealOnScroll() {
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => e.isIntersecting && e.target.classList.add("visible")),
    { threshold: 0.08 }
  );
  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
})();

// GitHub profile card (on Home)
async function loadGithubCard() {
  const card = document.getElementById("github-card");
  if (!card) return;
  try {
    const res = await fetch(`https://api.github.com/users/${USERNAME}`);
    if (!res.ok) throw new Error("GitHub profile API error");
    const data = await res.json();

    const avatarEl = document.getElementById("gh-avatar");
    const nameEl = document.getElementById("gh-name");
    const followersEl = document.getElementById("gh-followers");
    const reposEl = document.getElementById("gh-repos");
    const linkEl = document.getElementById("gh-link");

    if (avatarEl) {
      avatarEl.style.backgroundImage = `url(${data.avatar_url})`;
      avatarEl.style.backgroundSize = "cover";
      avatarEl.style.backgroundPosition = "center";
    }
    if (nameEl) nameEl.textContent = data.name || data.login;
    if (followersEl) followersEl.textContent = `Followers: ${data.followers}`;
    if (reposEl) reposEl.textContent = `Public Repos: ${data.public_repos}`;
    if (linkEl) linkEl.href = data.html_url;
  } catch (e) {
    console.warn(e);
  }
}

// Projects page
async function loadProjects() {
  const wrap = document.getElementById("projects");
  if (!wrap) return;
  const empty = document.getElementById("projects-empty");

  try {
    // Fetch up to 100 repos and sort by stargazers then recent updates
    const res = await fetch(`https://api.github.com/users/${USERNAME}/repos?per_page=100`);
    if (!res.ok) throw new Error("GitHub repos API error");
    const repos = await res.json();

    const sorted = repos
      .filter(r => !r.fork) // primary work
      .sort((a, b) => {
        if (b.stargazers_count !== a.stargazers_count) return b.stargazers_count - a.stargazers_count;
        return new Date(b.pushed_at) - new Date(a.pushed_at);
      })
      .slice(0, 9);

    if (!sorted.length) {
      empty?.classList.remove("hidden");
      return;
    }

    const frag = document.createDocumentFragment();
    sorted.forEach(repo => {
      const div = document.createElement("div");
      div.className = "project-card reveal visible";

      const desc = (repo.description || "").trim();
      const topics = Array.isArray(repo.topics) ? repo.topics : [];
      const language = repo.language ? [repo.language] : [];

      div.innerHTML = `
        <h3 class="project-title">${repo.name}</h3>
        <p class="project-desc">${desc || "No description provided."}</p>
        <div class="project-meta">
          <div class="tags">
            ${[...language, ...topics].slice(0, 4).map(t => `<span class="tag">${t}</span>`).join("")}
            <span class="tag">★ ${repo.stargazers_count}</span>
          </div>
          <div class="project-links">
            <a class="link" href="${repo.html_url}" target="_blank" rel="noopener">Repository</a>
            ${repo.homepage ? `<a class="link" href="${repo.homepage}" target="_blank" rel="noopener">Live</a>` : ""}
          </div>
        </div>
      `;
      frag.appendChild(div);
    });

    wrap.appendChild(frag);
  } catch (e) {
    console.warn(e);
    empty?.classList.remove("hidden");
  }
}

// Init
(function init() {
  loadGithubCard();
  loadProjects();
})();