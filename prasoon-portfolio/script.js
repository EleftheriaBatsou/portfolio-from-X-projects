/* Year */
document.getElementById('year').textContent = new Date().getFullYear();

/* Theme toggle */
const toggle = document.getElementById('themeToggle');
let dark = true;
toggle.addEventListener('click', () => {
  dark = !dark;
  document.documentElement.style.setProperty('--bg', dark ? '#0b0f1a' : '#f6f7fb');
  document.body.style.background = dark
    ? 'radial-gradient(1200px 600px at 10% 10%, #0f162a 0%, #0b0f1a 35%, #0b0f1a 100%)'
    : 'radial-gradient(1000px 600px at 10% 10%, #ffffff 0%, #f6f7fb 35%, #eef1f7 100%)';
  toggle.textContent = dark ? '☾' : '☼';
});

/* Subtle starfield background */
const canvas = document.getElementById('bg');
const ctx = canvas.getContext('2d');
let w, h, stars;

function resize() {
  w = canvas.width = window.innerWidth;
  h = canvas.height = window.innerHeight;
  stars = Array.from({ length: Math.min(160, Math.floor(w * h / 25000)) }, () => ({
    x: Math.random() * w,
    y: Math.random() * h,
    r: Math.random() * 1.2 + 0.2,
    a: Math.random() * 0.6 + 0.2,
    s: Math.random() * 0.6 + 0.1
  }));
}
window.addEventListener('resize', resize);
resize();

function draw() {
  ctx.clearRect(0,0,w,h);
  for (const st of stars) {
    ctx.globalAlpha = st.a;
    ctx.fillStyle = '#8ac9ff';
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.r, 0, Math.PI * 2);
    ctx.fill();
    st.y += st.s * 0.08;
    if (st.y > h + 2) { st.y = -2; st.x = Math.random() * w; }
  }
  requestAnimationFrame(draw);
}
draw();

/* Tilt effect */
function addTilt(el) {
  const strength = 10;
  el.addEventListener('mousemove', (e) => {
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rx = ((y / rect.height) - 0.5) * -strength;
    const ry = ((x / rect.width) - 0.5) * strength;
    el.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(10px)`;
  });
  el.addEventListener('mouseleave', () => {
    el.style.transform = 'rotateX(0) rotateY(0) translateZ(0)';
  });
}
document.querySelectorAll('.tilt').forEach(addTilt);

/* Scroll reveal */
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.transition = 'transform 600ms ease, opacity 600ms ease';
      entry.target.style.transform = 'translateY(0)';
      entry.target.style.opacity = '1';
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll('.section, .card, .edu-card, .cta-card').forEach((el) => {
  el.style.transform = 'translateY(12px)';
  el.style.opacity = '0';
  observer.observe(el);
});