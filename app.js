document.documentElement.classList.add('js');

// --- Config: adjust before launch ---
const COVERED_CITIES = ['Auckland']; // TODO: set to your real launch city
const FORM_ENDPOINT = null;          // TODO: Tally/Formspree/API URL — null = local stub
const DEFAULT_PRICE = 59;            // price ladder via ?p=39|59|79

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Price ladder from URL param
const priceParam = Number(new URLSearchParams(location.search).get('p'));
const price = [39, 59, 79].includes(priceParam) ? priceParam : DEFAULT_PRICE;
document.querySelectorAll('[data-price]').forEach(el => (el.textContent = price));

// Header shadow + condense on scroll
const header = document.querySelector('header');
const onScroll = () => header.classList.toggle('scrolled', window.scrollY > 8);
window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

// Scroll reveal
const observer = new IntersectionObserver(
  entries => entries.forEach(e => e.isIntersecting && e.target.classList.add('in')),
  { threshold: 0.15 }
);
document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

// One-shot play sequences (money rail)
const playObserver = new IntersectionObserver(
  entries => entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('play');
    playObserver.unobserve(e.target);
  }),
  { threshold: 0.5 }
);
document.querySelectorAll('[data-play]').forEach(el => playObserver.observe(el));

// Hero report assembles once the page is in
const proof = document.querySelector('.proof');
if (proof) {
  window.addEventListener('load', () => setTimeout(() => proof.classList.add('play'), 250));
}

// Ghost letters float away as the cursor touches them; the hitbox stays put
const ghost = document.querySelector('.ghost');
if (ghost) {
  const letters = [...ghost.querySelectorAll('.gl:not(.gl-dot)')];
  const hit = document.createElement('span');
  hit.className = 'ghost-hit';
  hit.setAttribute('aria-hidden', 'true');
  ghost.appendChild(hit);

  const anims = new Map();
  const stop = gl => {
    (anims.get(gl) || []).forEach(a => a.cancel());
    anims.delete(gl);
  };

  const lift = gl => {
    if (gl.classList.contains('lift')) return;
    gl.classList.add('lift');
    if (reduceMotion) return;
    stop(gl);
    const cs = getComputedStyle(gl);
    const pose = `translateY(${cs.getPropertyValue('--y') || '-.5em'}) rotate(${cs.getPropertyValue('--r') || '-5deg'})`;
    const entry = [];
    const up = gl.animate(
      { transform: pose, opacity: .4 },
      { duration: 2400, easing: 'cubic-bezier(.18, .7, .3, 1)', fill: 'forwards' }
    );
    up.onfinish = () => entry.push(gl.animate(
      [{ transform: pose }, { transform: `${pose} translateY(-.06em)` }],
      { duration: 2200 + parseFloat(cs.getPropertyValue('--b') || 0) * 1000, direction: 'alternate', iterations: Infinity, easing: 'ease-in-out' }
    ));
    entry.push(up);
    anims.set(gl, entry);
  };

  const settle = gl => {
    gl.classList.remove('lift');
    if (!anims.has(gl)) return;
    const cs = getComputedStyle(gl);
    const pose = { transform: cs.transform, opacity: cs.opacity };
    stop(gl);
    if (pose.transform === 'none') return;
    anims.set(gl, [gl.animate(
      [pose, { transform: 'none', opacity: 1 }],
      { duration: 900, easing: 'cubic-bezier(.16, 1, .3, 1)' }
    )]);
  };

  hit.addEventListener('pointermove', e => {
    const x = e.clientX - ghost.getBoundingClientRect().left;
    letters.forEach(gl => {
      if (x >= gl.offsetLeft && x <= gl.offsetLeft + gl.offsetWidth) lift(gl);
    });
  });
  ghost.addEventListener('pointerleave', () => letters.forEach(settle));

  // Masks are only needed for the intro line reveal — unclip so letters can float
  const heroHeading = document.querySelector('.reveal-lines');
  window.addEventListener('load', () =>
    setTimeout(() => heroHeading.classList.add('unmasked'), 1300)
  );
}

// Stakes counter: $2,000 rolls down to $0
const statNum = document.querySelector('[data-countdown]');
if (statNum && !reduceMotion) {
  const from = Number(statNum.dataset.countdown);
  const DURATION = 1400;
  const statObserver = new IntersectionObserver(entries => {
    if (!entries.some(e => e.isIntersecting)) return;
    statObserver.disconnect();
    const t0 = performance.now();
    const tick = now => {
      const p = Math.min((now - t0) / DURATION, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      statNum.textContent = '$' + Math.round(from * (1 - eased)).toLocaleString('en-NZ');
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, { threshold: 0.6 });
  statObserver.observe(statNum);
}

// Form: coverage check + submit
const form = document.getElementById('check-form');
const done = document.getElementById('form-done');
const doneTitle = document.getElementById('done-title');
const doneCopy = document.getElementById('done-copy');
const formError = document.getElementById('form-error');
const submitBtn = form.querySelector('[type="submit"]');

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  const data = Object.fromEntries(new FormData(form));
  data.price = price;
  data.covered = COVERED_CITIES.includes(data.city);
  data.submittedAt = new Date().toISOString();

  formError.hidden = true;
  submitBtn.disabled = true;
  submitBtn.textContent = 'Sending…';

  if (FORM_ENDPOINT) {
    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(`Submit failed: ${res.status}`);
    } catch (err) {
      formError.hidden = false;
      submitBtn.disabled = false;
      submitBtn.textContent = 'Request my check — free';
      return;
    }
  } else {
    // Local stub: inspect submissions via console or localStorage
    const stash = JSON.parse(localStorage.getItem('golegit-requests') || '[]');
    stash.push(data);
    localStorage.setItem('golegit-requests', JSON.stringify(stash));
    console.log('GoLegit request (stub):', data);
  }

  if (data.covered) {
    doneTitle.textContent = 'Request in.';
    doneCopy.textContent =
      "We'll email you within a few hours once your checker is confirmed — that's when you choose to lock it in. You haven't paid anything.";
  } else {
    doneTitle.textContent = `We're not in ${data.city} yet.`;
    doneCopy.textContent =
      "You're on the waitlist — first to know the moment we cover your city. No payment, no commitment.";
  }
  form.hidden = true;
  done.hidden = false;
  done.scrollIntoView({ behavior: 'smooth', block: 'center' });
});
