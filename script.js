(function () {
  'use strict';

  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var header = document.querySelector('[data-header]');

  function updateHeader() {
    header.classList.toggle('is-compact', window.scrollY > 40);
  }

  updateHeader();
  window.addEventListener('scroll', updateHeader, { passive: true });

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function () {
      var target = document.querySelector(link.getAttribute('href'));
      if (!target) return;
      window.setTimeout(function () { target.setAttribute('tabindex', '-1'); }, 0);
    });
  });

  var dialog = document.querySelector('#cart-dialog');
  var count = document.querySelector('[data-cart-count]');
  var quantity = 1;
  var inCart = false;
  var price = 3200;
  var shipping = 980;

  function yen(number) {
    return number.toLocaleString('ja-JP') + '円';
  }

  function showStep(name) {
    document.querySelectorAll('[data-cart-step]').forEach(function (step) {
      step.hidden = step.getAttribute('data-cart-step') !== name;
    });
    var visibleTitle = dialog.querySelector('[data-cart-step="' + name + '"] h2');
    if (visibleTitle) {
      visibleTitle.setAttribute('tabindex', '-1');
      window.setTimeout(function () { visibleTitle.focus({ preventScroll: true }); }, 20);
    }
  }

  function updateTotals() {
    document.querySelectorAll('[data-qty]').forEach(function (node) { node.textContent = quantity; });
    document.querySelectorAll('[data-subtotal]').forEach(function (node) { node.textContent = yen(price * quantity); });
    document.querySelectorAll('[data-total]').forEach(function (node) { node.textContent = yen(price * quantity + shipping); });
    count.value = inCart ? quantity : 0;
    count.textContent = inCart ? quantity : 0;
  }

  function openCart(step) {
    showStep(step || (inCart ? 'cart' : 'empty'));
    dialog.showModal();
    document.body.classList.add('dialog-open');
  }

  document.querySelectorAll('[data-open-cart]').forEach(function (button) {
    button.addEventListener('click', function () { openCart(); });
  });

  document.querySelectorAll('[data-add-cart]').forEach(function (button) {
    button.addEventListener('click', function () {
      inCart = true;
      quantity = Math.max(quantity, 1);
      updateTotals();
      openCart('cart');
    });
  });

  document.querySelector('[data-qty-minus]').addEventListener('click', function () {
    quantity = Math.max(1, quantity - 1);
    updateTotals();
  });

  document.querySelector('[data-qty-plus]').addEventListener('click', function () {
    quantity = Math.min(5, quantity + 1);
    updateTotals();
  });

  document.querySelectorAll('[data-next]').forEach(function (button) {
    button.addEventListener('click', function () {
      var next = button.getAttribute('data-next');
      if (next === 'complete') {
        inCart = false;
        count.value = 0;
        count.textContent = 0;
      }
      showStep(next);
    });
  });

  document.querySelectorAll('[data-back]').forEach(function (button) {
    button.addEventListener('click', function () { showStep(button.getAttribute('data-back')); });
  });

  dialog.addEventListener('close', function () { document.body.classList.remove('dialog-open'); });
  dialog.addEventListener('click', function (event) {
    if (event.target !== dialog) return;
    var box = dialog.getBoundingClientRect();
    var outside = event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom;
    if (outside) dialog.close();
  });

  updateTotals();

  if (reduceMotion || !window.gsap || !window.ScrollTrigger) return;

  try {
    window.gsap.registerPlugin(window.ScrollTrigger);
    root.classList.add('motion-ready');

    var opening = document.querySelector('[data-opening]');
    var intro = window.gsap.timeline({ defaults: { ease: 'power3.out' } });
    intro
      .fromTo('.opening__paper span', { opacity: 0, filter: 'blur(5px)' }, { opacity: 1, filter: 'blur(0px)', duration: .55, stagger: .08 }, .12)
      .fromTo('.opening__knot', { opacity: 0, scale: .9, rotate: -14 }, { opacity: 1, scale: 1, rotate: -7, duration: .42 }, .24)
      .to('.opening__paper--left', { xPercent: -101, duration: .82, ease: 'power4.inOut' }, .82)
      .to('.opening__paper--right', { xPercent: 101, duration: .82, ease: 'power4.inOut' }, .82)
      .to('.opening__knot', { opacity: 0, scale: .94, duration: .2 }, .82)
      .fromTo('.hero__copy > *', { opacity: 0, y: 18, filter: 'blur(4px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: .65, stagger: .075 }, 1.05)
      .fromTo('.hero__photo img', { scale: 1.06 }, { scale: 1, duration: 1.25, ease: 'power2.out' }, 1.0)
      .fromTo('.hero__seal', { opacity: 0, scale: .92, rotate: 2 }, { opacity: 1, scale: 1, rotate: 7, duration: .5 }, 1.35)
      .add(function () { if (opening) opening.remove(); });

    window.gsap.utils.toArray('[data-photo-reveal]').forEach(function (figure) {
      if (figure.closest('.hero')) {
        window.gsap.set(figure, { clipPath: 'inset(0 0 0 0)' });
        return;
      }
      window.gsap.to(figure, {
        clipPath: 'inset(0 0 0% 0)',
        duration: 1.05,
        ease: 'power4.inOut',
        scrollTrigger: { trigger: figure, start: 'top 84%', once: true }
      });
    });

    window.gsap.utils.toArray('[data-product]').forEach(function (row, index) {
      window.gsap.from(row, {
        x: index % 2 ? 12 : -12,
        opacity: 0,
        duration: .48,
        ease: 'power3.out',
        scrollTrigger: { trigger: row, start: 'top 91%', once: true }
      });
    });

    var mobile = window.matchMedia('(max-width: 760px)').matches;
    window.gsap.to('[data-route-line]', {
      scaleX: mobile ? 1 : 1,
      scaleY: mobile ? 1 : undefined,
      duration: 1.15,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.route', start: 'top 72%', once: true }
    });

    window.gsap.from('[data-parcel]', {
      y: 24,
      rotate: -1.5,
      opacity: 0,
      duration: .8,
      ease: 'power3.out',
      scrollTrigger: { trigger: '[data-parcel]', start: 'top 80%', once: true }
    });

    window.gsap.from('.weekly-note', {
      y: 18,
      rotate: -1,
      opacity: 0,
      duration: .55,
      ease: 'power3.out',
      scrollTrigger: { trigger: '.weekly-note', start: 'top 88%', once: true }
    });

    window.addEventListener('load', function () { window.ScrollTrigger.refresh(); });
  } catch (error) {
    root.classList.remove('motion-ready');
    var failedOpening = document.querySelector('[data-opening]');
    if (failedOpening) failedOpening.remove();
  }
})();
