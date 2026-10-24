// The independent About page has no terminal or homepage animation dependency.
(() => {
  const dataNode = document.getElementById('about-page-data');
  if (!dataNode) return;
  const data = JSON.parse(dataNode.textContent);
  const robot = document.querySelector('[data-ryr-button]');
  const reply = document.querySelector('[data-ryr-status]');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const forced = matchMedia('(forced-colors: active)');
  let greeting = 0;
  let timer;
  const stop = () => { clearTimeout(timer); robot.classList.remove('is-greeting'); };
  robot.disabled = false;
  robot.addEventListener('click', () => {
    stop();
    reply.textContent = data.greetings[greeting++ % data.greetings.length];
    if (!reduced.matches && !forced.matches) {
      // Restart the short hop even when the visitor clicks again mid-greeting.
      void robot.offsetWidth;
      robot.classList.add('is-greeting');
      timer = setTimeout(stop, 1440);
    }
  });
  reduced.addEventListener('change', stop);
  forced.addEventListener('change', stop);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });

  // Email picker: click the envelope to open the mailbox menu, click an option to copy it.
  const emailBtn = document.querySelector('[data-contact-email-menu]');
  const menu = document.querySelector('[data-email-menu]');
  const status = document.getElementById('about-email-status');
  if (!emailBtn || !menu) return;
  emailBtn.hidden = false;
  let menuOpen = false;
  const closeMenu = () => { menuOpen = false; menu.hidden = true; emailBtn.setAttribute('aria-expanded', 'false'); };
  emailBtn.addEventListener('click', () => {
    menuOpen = !menuOpen; menu.hidden = !menuOpen; emailBtn.setAttribute('aria-expanded', String(menuOpen));
    if (menuOpen) status.textContent = '';
  });
  menu.querySelectorAll('.email-option').forEach(option => {
    option.addEventListener('click', async () => {
      status.textContent = '';
      try {
        await navigator.clipboard.writeText(option.dataset.emailAddress);
        status.textContent = `${data.copied} · ${option.dataset.emailLabel}`;
      } catch {
        status.textContent = `${data.copy_failed} ${option.dataset.emailAddress}`;
      }
      closeMenu();
    });
  });
  document.addEventListener('click', event => {
    if (menuOpen && !event.target.closest('.about-contacts')) closeMenu();
  });
})();
