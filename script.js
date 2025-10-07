const GITHUB_USER = "milisp"; // change to any username
const FEATURED = []; // e.g., ["cool-repo", "another-repo"] to pin explicitly
const MAX_PROJECTS = 8;

const $ = (sel) => document.querySelector(sel);
const el = (tag, attrs = {}, children = []) => {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "text") node.textContent = v;
    else if (k === "html") node.innerHTML = v;
    else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v);
  }
  for (const c of children) node.appendChild(c);
  return node;
};

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short" });
}

function number(n) {
  return Intl.NumberFormat("en-US", { notation: "compact" }).format(n ?? 0);
}

async function gh(path) {
  const url = `https://api.github.com${path}`;
  const res = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json"
    },
    cache: "no-cache"
  });
  if (!res.ok) throw new Error(`GitHub ${res.status} on ${path}`);
  return res.json();
}

async function loadProfile(username) {
  const data = await gh(`/users/${username}`);
  // Populate sidebar
  $("#avatar").src = data.avatar_url;
  $("#avatar").alt = `${data.name || data.login} avatar`;
  $("#avatarLink").href = data.html_url;
  $("#name").textContent = data.name || data.login;
  $("#headline").textContent = data.bio || (data.company ? `${data.company}` : "Software developer");
  $("#githubLink").href = data.html_url;
  const twitter = data.twitter_username ? `https://twitter.com/${data.twitter_username}` : "#";
  const blog = data.blog && data.blog.startsWith("http") ? data.blog : (data.blog ? `https://${data.blog}` : "#");
  $("#twitterLink").href = twitter;
  $("#websiteLink").href = blog || "#";

  // About/meta
  const meta = $("#meta");
  meta.innerHTML = "";
  if (data.location) meta.appendChild(el("li", {}, [el("span", { text: `📍 ${data.location}` })]));
  if (data.company) meta.appendChild(el("li", {}, [el("span", { text: `🏢 ${data.company}` })]));
  if (data.email) meta.appendChild(el("li", {}, [el("span", {}, [el("a", { href: `mailto:${data.email}`, text: "✉️ Email" })])]));
  $("#bio").textContent = data.bio || $("#bio").textContent;

  // Contact
  const contact = $("#contactList");
  contact.innerHTML = "";
  contact.appendChild(el("li", {}, [el("a", { href: data.html_url, target: "_blank", rel: "noopener", text: "GitHub Profile" })]));
  if (twitter !== "#") contact.appendChild(el("li", {}, [el("a", { href: twitter, target: "_blank", rel: "noopener", text: "Twitter" })]));
  if (blog && blog !== "#") contact.appendChild(el("li", {}, [el("a", { href: blog, target: "_blank", rel: "noopener", text: "Website" })]));
  if (data.email) contact.appendChild(el("li", {}, [el("a", { href: `mailto:${data.email}`, text: data.email })]));
}

function scoreRepo(r) {
  const s = (r.stargazers_count || 0);
  const wStars = s;
  const days = (Date.now() - new Date(r.pushed_at).getTime()) / (1000 * 60 * 60 * 24);
  const recency = Math.max(0, 365 - days); // more recent -> higher
  const forks = r.forks_count || 0;
  return wStars * 3 + recency + forks;
}

async function loadRepos(username) {
  // Collect repos (first few pages to be safe)
  let page = 1, all = [];
  while (page <= 3) {
    const chunk = await gh(`/users/${username}/repos?per_page=100&sort=updated&page=${page}`);
    all = all.concat(chunk);
    if (chunk.length < 100) break;
    page += 1;
  }

  // Filter out forks/archived by default, then score
  let repos = all.filter(r => !r.fork && !r.archived);
  if (FEATURED.length) {
    const byName = new Map(repos.map(r => [r.name.toLowerCase(), r]));
    repos = FEATURED.map(n => byName.get(n.toLowerCase())).filter(Boolean);
  } else {
    repos.sort((a, b) => scoreRepo(b) - scoreRepo(a));
    repos = repos.slice(0, MAX_PROJECTS);
  }

  const container = $("#projectsGrid");
  container.innerHTML = "";
  for (const r of repos) {
    const url = r.homepage && r.homepage.startsWith("http") ? r.homepage : r.html_url;
    const lang = r.language ? el("span", { class: "badge", text: r.language }) : null;
    const stars = el("span", { class: "badge", html: `⭐ ${number(r.stargazers_count)}` });
    const updated = el("span", { class: "badge", text: `Updated ${fmtDate(r.pushed_at)}` });
    const tags = el("div", { class: "tags" }, [stars, updated].concat(lang ? [lang] : []));

    const card = el("a", { class: "project", href: url, target: "_blank", rel: "noopener" });
    card.appendChild(el("h3", { text: r.name }));
    card.appendChild(el("p", { text: r.description || "No description" }));
    card.appendChild(tags);
    container.appendChild(card);
  }
}

async function loadOrgs(username) {
  const orgs = await gh(`/users/${username}/orgs`);
  const wrap = $("#orgsGrid");
  wrap.innerHTML = "";
  for (const o of orgs) {
    const item = el("a", { class: "org", href: `https://github.com/${o.login}`, target: "_blank", rel: "noopener" }, [
      el("img", { src: o.avatar_url, alt: `${o.login} avatar`, loading: "lazy" }),
      el("span", { text: o.login })
    ]);
    wrap.appendChild(item);
  }
}

function initTOCHighlight() {
  const links = Array.from(document.querySelectorAll(".toc-link"));
  const map = new Map(links.map(a => [a.getAttribute("href").slice(1), a]));
  const obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      const id = e.target.id;
      const link = map.get(id);
      if (!link) return;
      if (e.isIntersecting) {
        links.forEach(l => l.classList.remove("active"));
        link.classList.add("active");
      }
    });
  }, { threshold: 0.4 });
  document.querySelectorAll("main .section").forEach(sec => obs.observe(sec));
}

function init() {
  const user = GITHUB_USER;
  loadProfile(user).catch(console.error);
  loadRepos(user).catch(console.error);
  loadOrgs(user).catch(console.error);
  $("#year").textContent = new Date().getFullYear().toString();
  initTOCHighlight();
}

document.addEventListener("DOMContentLoaded", init);