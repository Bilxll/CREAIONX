(() => {
  const nav = document.querySelector('.nav');
  const toggle = document.querySelector('.home-nav-toggle');
  const menu = document.querySelector('.nav-pills');
  if (!nav || !toggle || !menu) return;

  const closeMenu = () => {
    nav.classList.remove('nav-open');
    toggle.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  };

  const openMenu = () => {
    nav.classList.add('nav-open');
    toggle.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  };

  toggle.addEventListener('click', () => {
    nav.classList.contains('nav-open') ? closeMenu() : openMenu();
  });

  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
  window.addEventListener('resize', () => { if (window.innerWidth > 820) closeMenu(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
})();
