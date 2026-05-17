import { createSignal, onMount, onCleanup } from 'solid-js';
import { languages, detectLang, setLang, PREFIX_RE, type Lang } from '../i18n/translations';

export default function LanguageSwitcher() {
  const [current, setCurrent] = createSignal<Lang>('en');
  const [open, setOpen] = createSignal(false);
  let root!: HTMLDivElement;

  onMount(() => {
    setCurrent(detectLang());

    const onDocClick = (e: MouseEvent) => {
      if (!root.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', onDocClick);
    onCleanup(() => document.removeEventListener('click', onDocClick));
  });

  const switchTo = (lang: Lang) => {
    setLang(lang);
    setCurrent(lang);
    setOpen(false);

    const path = window.location.pathname;
    const isPrefixed = PREFIX_RE.test(path);
    const base = path.replace(PREFIX_RE, '/');

    if (lang === 'en') {
      window.location.href = base;
    } else if (isPrefixed) {
      window.location.href = path.replace(/^\/(de|et|fi|sv|fr|it|uk|ru)/, `/${lang}`);
    } else {
      window.location.href = `/${lang}${path === '/' ? '' : path}`;
    }
  };

  return (
    <div class="lang" ref={root!}>
      <button
        class="lang__btn"
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open()}
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
        <span>{current().toUpperCase()}</span>
      </button>
      {open() && (
        <ul class="lang__menu" role="listbox">
          {(Object.keys(languages) as Lang[]).map((l) => (
            <li>
              <button
                type="button"
                class={`lang__opt${l === current() ? ' is-active' : ''}`}
                onClick={() => switchTo(l)}
              >
                {languages[l]}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
