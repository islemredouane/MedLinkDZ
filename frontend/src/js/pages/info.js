import '../core/layout.js';

/* Legal pages (Conditions, Confidentialité): the "Sommaire" side menu highlights the
   section being read, with the same look as hover. */
const links = [...document.querySelectorAll('nav[aria-label="Sommaire"] a[href^="#"]')];
const sections = links.map((a) => document.querySelector(a.getAttribute('href'))).filter(Boolean);

if (sections.length) {
  let queued = false;

  const setActive = (id) => {
    links.forEach((a) => {
      if (a.getAttribute('href') === `#${id}`) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
  };

  // Current = the last section whose top has passed 35% of the screen height.
  // At the very bottom of the page, the last section wins (it may be too short to reach that line).
  const update = () => {
    queued = false;
    const line = innerHeight * 0.35;
    let current = sections[0];
    for (const s of sections) if (s.getBoundingClientRect().top <= line) current = s;
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) current = sections[sections.length - 1];
    setActive(current.id);
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };

  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  links.forEach((a) => a.addEventListener('click', () => setActive(a.getAttribute('href').slice(1))));
  update();
}
