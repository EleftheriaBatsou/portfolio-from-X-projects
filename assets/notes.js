// Colorful Notes App (localStorage)
// Features: add, edit, delete, pin, duplicate, search, filter

const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));

const storeKey = "brisq.notes.v1";

const state = {
  notes: [],
  filter: "all",
  query: "",
  palette: "#FFD166"
};

function load() {
  try {
    const raw = localStorage.getItem(storeKey);
    state.notes = Array.isArray(JSON.parse(raw)) ? JSON.parse(raw) : [];
  } catch {
    state.notes = [];
  }
}

function save() {
  localStorage.setItem(storeKey, JSON.stringify(state.notes));
}

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function nowISO() {
  return new Date().toISOString();
}

function addNote({ title, content, color }) {
  const note = {
    id: uid(),
    title: title?.trim() || "Untitled",
    content: content?.trim() || "",
    color,
    pinned: false,
    createdAt: nowISO(),
    updatedAt: nowISO()
  };
  state.notes.unshift(note);
  save();
  render();
}

function updateNote(id, patch) {
  const i = state.notes.findIndex(n => n.id === id);
  if (i === -1) return;
  state.notes[i] = { ...state.notes[i], ...patch, updatedAt: nowISO() };
  save();
  render();
}

function removeNote(id) {
  state.notes = state.notes.filter(n => n.id !== id);
  save();
  render();
}

function duplicateNote(id) {
  const n = state.notes.find(n => n.id === id);
  if (!n) return;
  state.notes.unshift({ ...n, id: uid(), pinned: false, createdAt: nowISO(), updatedAt: nowISO() });
  save();
  render();
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString([], { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" });
}

function matches(n) {
  const inFilter = state.filter === "all"
    ? true
    : state.filter === "pinned"
      ? n.pinned
      : !n.pinned;

  const q = state.query.toLowerCase();
  const inQuery = !q || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q);
  return inFilter && inQuery;
}

function render() {
  const grid = $("#grid");
  const empty = $("#empty");
  grid.innerHTML = "";

  // Sort: pinned first, then updated desc
  const toShow = state.notes
    .filter(matches)
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || new Date(b.updatedAt) - new Date(a.updatedAt));

  if (!toShow.length) {
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";

  const frag = document.createDocumentFragment();
  toShow.forEach(n => frag.appendChild(renderNote(n)));
  grid.appendChild(frag);
}

function renderNote(n) {
  const el = document.createElement("article");
  el.className = "note";
  el.dataset.id = n.id;
  if (n.color) {
    el.dataset.color = n.color;
    el.style.setProperty("--note-color", n.color);
  }

  el.innerHTML = `
    <button class="pin" title="Toggle pin">${n.pinned ? "Pinned" : "Pin"}</button>
    <h3 class="title" contenteditable="true" spellcheck="false">${escapeHTML(n.title)}</h3>
    <div class="body" contenteditable="true" spellcheck="true">${escapeHTML(n.content).replace(/\n/g, "<br>")}</div>
    <div class="meta">
      <span>${formatDate(n.updatedAt)}</span>
      <div class="actions">
        <button class="action" data-act="color">Color</button>
        <button class="action" data-act="dup">Duplicate</button>
        <button class="action" data-act="del">Delete</button>
      </div>
    </div>
  `;

  // Listeners
  el.querySelector(".pin").addEventListener("click", () => updateNote(n.id, { pinned: !n.pinned }));
  const titleEl = el.querySelector(".title");
  const bodyEl = el.querySelector(".body");

  titleEl.addEventListener("input", debounce(() => {
    updateNote(n.id, { title: titleEl.textContent || "Untitled" });
  }, 300));

  bodyEl.addEventListener("input", debounce(() => {
    const text = bodyEl.innerHTML.replace(/<br>/g, "\n").replace(/&nbsp;/g, " ");
    updateNote(n.id, { content: stripHTML(text) });
  }, 400));

  el.querySelector("[data-act='del']").addEventListener("click", () => removeNote(n.id));
  el.querySelector("[data-act='dup']").addEventListener("click", () => duplicateNote(n.id));
  el.querySelector("[data-act='color']").addEventListener("click", (e) => openColorMenu(e.currentTarget, n));

  return el;
}

function openColorMenu(btn, note) {
  const colors = ["#FFD166","#EF476F","#06D6A0","#118AB2","#A78BFA","#F59E0B","#F97316","#34D399","#60A5FA","#F472B6"];
  const menu = document.createElement("div");
  menu.style.position = "absolute";
  const rect = btn.getBoundingClientRect();
  menu.style.left = `${rect.left}px`;
  menu.style.top = `${rect.bottom + 6 + window.scrollY}px`;
  menu.style.padding = "8px";
  menu.style.background = "#0b1218";
  menu.style.border = "1px solid var(--border)";
  menu.style.borderRadius = "12px";
  menu.style.display = "flex";
  menu.style.gap = "6px";
  menu.style.zIndex = "1000";

  colors.forEach(c => {
    const s = document.createElement("button");
    s.className = "swatch";
    s.style.setProperty("--sw", c);
    s.title = c;
    s.addEventListener("click", () => {
      updateNote(note.id, { color: c });
      document.body.removeChild(menu);
    });
    menu.appendChild(s);
  });

  function cleanup(ev) {
    if (!menu.contains(ev.target)) {
      document.body.removeChild(menu);
      document.removeEventListener("mousedown", cleanup, true);
      window.removeEventListener("blur", cleanup, true);
    }
  }

  document.body.appendChild(menu);
  setTimeout(() => {
    document.addEventListener("mousedown", cleanup, true);
    window.addEventListener("blur", cleanup, true);
  }, 0);
}

function bindUI() {
  const title = $("#title");
  const content = $("#content");
  const addBtn = $("#add");
  const newBtn = $("#new-note");
  const palette = $("#palette");
  const search = $("#search");

  palette.addEventListener("click", (e) => {
    const btn = e.target.closest(".swatch");
    if (!btn) return;
    state.palette = btn.dataset.color;
    // emphasize selection quickly
    btn.style.outline = "2px solid white";
    setTimeout(() => (btn.style.outline = ""), 250);
  });

  addBtn.addEventListener("click", () => {
    if (!title.value.trim() && !content.value.trim()) return;
    addNote({ title: title.value, content: content.value, color: state.palette });
    title.value = "";
    content.value = "";
    title.focus();
  });

  newBtn.addEventListener("click", () => {
    title.focus();
    window.scrollTo({ top: document.getElementById("composer").offsetTop - 80, behavior: "smooth" });
  });

  // Cmd/Ctrl + Enter => add
  content.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      addBtn.click();
    }
  });

  // Filters
  $$(".chip").forEach(ch => ch.addEventListener("click", () => {
    $$(".chip").forEach(c => c.classList.remove("active"));
    ch.classList.add("active");
    state.filter = ch.dataset.filter;
    render();
  }));

  // Search focus via "/" key
  window.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== search) {
      e.preventDefault();
      search.focus();
    }
  });

  search.addEventListener("input", debounce(() => {
    state.query = search.value.trim();
    render();
  }, 150));
}

// Utils
function debounce(fn, t = 200) {
  let id;
  return (...args) => {
    clearTimeout(id);
    id = setTimeout(() => fn(...args), t);
  };
}
function escapeHTML(s) {
  return (s || "").replace(/[&<>"']/g, m => ({ "&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;" }[m]));
}
function stripHTML(s) {
  const div = document.createElement("div");
  div.innerHTML = s;
  return div.textContent || div.innerText || "";
}

// Bootstrap
(function init() {
  load();
  bindUI();
  render();
})();