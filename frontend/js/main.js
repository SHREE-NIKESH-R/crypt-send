// Landing page — terminal animation + scroll reveals

// Terminal stagger animation
const lines = document.querySelectorAll('#termLines .tl');
lines.forEach((l, i) => {
  l.style.opacity = '0';
  setTimeout(() => {
    l.style.transition = 'opacity 0.3s ease';
    l.style.opacity = '1';
  }, 700 + i * 260);
});

// Scroll reveal for step cards
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
}, { threshold: 0.12 });
document.querySelectorAll('.step-card').forEach(el => io.observe(el));

// Smooth scroll anchors
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const el = document.getElementById(a.getAttribute('href').slice(1));
    if (el) { e.preventDefault(); el.scrollIntoView({ behavior:'smooth', block:'start' }); }
  });
});
