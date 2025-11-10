(function () {
  const root = document.documentElement;
  const toggle = document.getElementById("themeToggle");

  const prefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  const stored = localStorage.getItem("theme");
  const initial = stored || (prefersLight ? "light" : "dark");

  if (initial === "light") root.classList.add("light");

  toggle?.addEventListener("click", () => {
    const isLight = root.classList.toggle("light");
    localStorage.setItem("theme", isLight ? "light" : "dark");
  });
})();