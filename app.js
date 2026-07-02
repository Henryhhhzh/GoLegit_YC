// --- Config: adjust before launch ---
const COVERED_CITIES = ['Auckland']; // TODO: set to your real launch city
const FORM_ENDPOINT = null;          // TODO: Tally/Formspree/API URL — null = local stub
const DEFAULT_PRICE = 59;            // price ladder via ?p=39|59|79

// Price ladder from URL param
const priceParam = Number(new URLSearchParams(location.search).get('p'));
const price = [39, 59, 79].includes(priceParam) ? priceParam : DEFAULT_PRICE;
document.querySelectorAll('[data-price]').forEach(el => (el.textContent = price));

// Header shadow on scroll
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

// Form: coverage check + submit stub
const form = document.getElementById('check-form');
const done = document.getElementById('form-done');
const doneTitle = document.getElementById('done-title');
const doneCopy = document.getElementById('done-copy');

form.addEventListener('submit', async e => {
  e.preventDefault();
  if (!form.reportValidity()) return;

  const data = Object.fromEntries(new FormData(form));
  data.price = price;
  data.covered = COVERED_CITIES.includes(data.city);
  data.submittedAt = new Date().toISOString();

  if (FORM_ENDPOINT) {
    await fetch(FORM_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
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
