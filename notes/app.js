/*
  Simple Notes App
  - LocalStorage persistence
  - Create, edit, delete, pin
  - Search filter
  - Colorful cards (Figma-like palette)
  - Import/Export JSON
*/

const STORAGE_KEY = "colorful-notes:v1";

const els = {
  search: document.getElementById("search"),
  newBtn: document.getElementById("newNote"),
  startNew: document.getElementById("startNew"),
  composer: document.getElementById("composer"),
  title: document.getElementById("titleInput"),
  body: document.getElementById("bodyInput"),
  save: document.getElementById("saveNote"),
  cancel: document.getElementById("cancelCompose"),
  palette: document.getElementById("colorPalette"),
  grid: document.getElementById("grid"),
  empty: document.getElementById("empty"),
  tmpl: document.getElementById("noteTmpl"),
  more: document.getElementById("more"),
  sheet: document.getElementById("menuSheet"),
  exportBtn: document.getElementById("exportNotes"),
  importInput: document.getElementById("importNotes"),
  clearBtn: document.getElementById("clearNotes"),
};

let notes = [];
let editingId = null;
let currentColor = "grape";

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    notes = raw ? JSON.parse(raw) : [];
  } catch {
    notes = [];
  }
}

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

function showComposer(show) {
  els.composer.classList.toggle("hidden", !show);
  els.empty.classList.toggle("hidden", show || notes.length > 0);
  if (show) {
    els.title.focus();
  } else {
    clearComposer();
  }
}

function clearComposer() {
  editingId = null;
  els.title.value = "";
  els.body.value = "";
  setActiveColor("grape");
}

function setActiveColor(color) {
  currentColor = color;
  [...els.palette.querySelectorAll(".swatch")].forEach(s => {
    s.classList.toggle("active", s.dataset.color === color);
  });
}

function handlePaletteClick(e) {
  const btn = e.target.closest(".swatch");
  if (!btn) return;
  setActiveColor(btn.dataset.color);
}

function createNote({ title, body, color }) {
  const n = {
    id: uid(),
    title: (title || "").trim(),
    body: (body || "").trim(),
    color: color || "grape",
    pinned: false,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  notes.unshift(n);
  saveToStorage();
  render();
}

function updateNote(id, patch) {
  const i = notes.findIndex(n => n.id === id);
  if (i === -1) return;
  notes[i] = { ...notes[i], ...patch, updatedAt: Date.now() };
  saveToStorage();
  render();
}

function deleteNote(id) {
  notes = notes.filter(n => n.id !== id);
  saveToStorage();
  render();
}

function togglePin(id) {
  const n = notes.find(n => n.id === id);
  if (!n) return;
  n.pinned = !n.pinned;
  n.updatedAt = Date.now();
  // keep pinned notes at the top
  notes.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });
  saveToStorage();
  render();
}

function filteredNotes() {
  const q = (els.search.value || "").toLowerCase().trim();
  if (!q) return notes;
  return notes.filter(n =>
    (n.title && n.title.toLowerCase().includes(q)) ||
    (n.body && n.body.toLowerCase().includes(q))
  );
}

function render() {
  const list = filteredNotes().slice();
  // pin-first ordering within filtered results
  list.sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
    return b.updatedAt - a.updatedAt;
  });

  els.grid.innerHTML = "";
  if (!list.length) {
    els.empty.classList.remove("hidden");
  } else {
    els.empty.classList.add("hidden");
  }

  const frag = document.createDocumentFragment();
  list.forEach(n => {
    const node = els.tmpl.content.firstElementChild.cloneNode(true);
    node.dataset.id = n.id;
    node.dataset.color = n.color;
    node.querySelector(".date").textContent = formatDate(n.updatedAt) + (n.pinned ? " • Pinned" : "");
    node.querySelector(".note-title").textContent = n.title || "Untitled";
    node.querySelector(".note-body").textContent = n.body || "";

    node.querySelector(".pin").addEventListener("click", () => togglePin(n.id));
    node.querySelector(".delete").addEventListener("click", () => {
      if (confirm("Delete this note?")) deleteNote(n.id);
    });
    node.querySelector(".edit").addEventListener("click", () => {
      editingId = n.id;
      els.title.value = n.title || "";
      els.body.value = n.body || "";
      setActiveColor(n.color || "grape");
      showComposer(true);
    });

    frag.appendChild(node);
  });
  els.grid.appendChild(frag);
}

function handleSave() {
  const title = els.title.value;
  const body = els.body.value;
  const color = currentColor;

  if (!title.trim() && !body.trim()) {
    showComposer(false);
    return;
  }

  if (editingId) {
    updateNote(editingId, { title, body, color });
  } else {
    createNote({ title, body, color });
  }
  showComposer(false);
}

function handleCancel() {
  showComposer(false);
}

function bindUI() {
  els.newBtn.addEventListener("click", () => {
    editingId = null;
    clearComposer();
    showComposer(true);
  });
  els.startNew.addEventListener("click", () => {
    editingId = null;
    clearComposer();
    showComposer(true);
  });
  els.save.addEventListener("click", handleSave);
  els.cancel.addEventListener("click", handleCancel);
  els.palette.addEventListener("click", handlePaletteClick);
  els.search.addEventListener("input", render);

  // menu
  els.more.addEventListener("click", () => {
    els.sheet.classList.toggle("hidden");
  });
  document.addEventListener("click", (e) => {
    if (!els.sheet.contains(e.target) && e.target !== els.more) {
      els.sheet.classList.add("hidden");
    }
  });

  // export
  els.exportBtn.addEventListener("click", () => {
    const dataStr = JSON.stringify(notes, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "notes-export.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    els.sheet.classList.add("hidden");
  });

  // import
  els.importInput.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error("Invalid file");
      // naive merge: imported first (older), keep ids if present
      const existingIds = new Set(notes.map(n => n.id));
      const sanitized = arr
        .filter(x => x && (x.title || x.body))
        .map(x => ({
          id: x.id && !existingIds.has(x.id) ? x.id : uid(),
          title: String(x.title || ""),
          body: String(x.body || ""),
          color: String(x.color || "grape"),
          pinned: Boolean(x.pinned),
          createdAt: Number(x.createdAt || Date.now()),
          updatedAt: Number(x.updatedAt || Date.now()),
        }));
      notes = [...sanitized, ...notes];
      saveToStorage();
      render();
    } catch (err) {
      alert("Failed to import. Make sure it's a valid export JSON.");
    } finally {
      e.target.value = "";
      els.sheet.classList.add("hidden");
    }
  });

  // clear
  els.clearBtn.addEventListener("click", () => {
    if (confirm("Clear all notes? This cannot be undone.")) {
      notes = [];
      saveToStorage();
      render();
      els.sheet.classList.add("hidden");
    }
  });

  // keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
      e.preventDefault();
      editingId = null;
      clearComposer();
      showComposer(true);
    }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
      if (!els.composer.classList.contains("hidden")) {
        e.preventDefault();
        handleSave();
      }
    }
    if (e.key === "Escape" && !els.composer.classList.contains("hidden")) {
      handleCancel();
    }
  });
}

function init() {
  loadFromStorage();
  bindUI();
  render();
}

init();