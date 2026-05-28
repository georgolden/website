import { onMount, onCleanup } from 'solid-js';

export default function NavInverter() {
  onMount(() => {
    const state = new Map<Element, boolean>();

    const obs = new IntersectionObserver((entries) => {
      entries.forEach((e) => state.set(e.target, e.isIntersecting));
      const white = [...state.entries()]
        .filter(([el]) => (el as HTMLElement).dataset.navTheme === 'white')
        .some(([, v]) => v);
      document.body.classList.toggle('nav-white', white);
    }, { rootMargin: '-65px 0px 0px 0px', threshold: 0 });

    const els = document.querySelectorAll('[data-nav-theme]');
    els.forEach((el) => obs.observe(el));

    onCleanup(() => obs.disconnect());
  });

  return <span hidden />;
}
