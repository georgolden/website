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
        <span class="lg-effect" aria-hidden="true" />
        <span class="lg-tint"   aria-hidden="true" />
        <span class="lg-shine"  aria-hidden="true" />
        <span class="pill-inner">
          <svg width="20" height="20" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M128,26A102,102,0,1,0,230,128,102.12,102.12,0,0,0,128,26Zm81.57,64H169.19a132.58,132.58,0,0,0-25.73-50.67A90.29,90.29,0,0,1,209.57,90ZM218,128a89.7,89.7,0,0,1-3.83,26H171.81a155.43,155.43,0,0,0,0-52h42.36A89.7,89.7,0,0,1,218,128Zm-90,87.83a110,110,0,0,1-15.19-19.45A124.24,124.24,0,0,1,99.35,166h57.3a124.24,124.24,0,0,1-13.46,30.38A110,110,0,0,1,128,215.83ZM96.45,154a139.18,139.18,0,0,1,0-52h63.1a139.18,139.18,0,0,1,0,52ZM38,128a89.7,89.7,0,0,1,3.83-26H84.19a155.43,155.43,0,0,0,0,52H41.83A89.7,89.7,0,0,1,38,128Zm90-87.83a110,110,0,0,1,15.19,19.45A124.24,124.24,0,0,1,156.65,90H99.35a124.24,124.24,0,0,1,13.46-30.38A110,110,0,0,1,128,40.17Zm-15.46-.84A132.58,132.58,0,0,0,86.81,90H46.43A90.29,90.29,0,0,1,112.54,39.33ZM46.43,166H86.81a132.58,132.58,0,0,0,25.73,50.67A90.29,90.29,0,0,1,46.43,166Zm97,50.67A132.58,132.58,0,0,0,169.19,166h40.38A90.29,90.29,0,0,1,143.46,216.67Z"/>
          </svg>
          <span>{current().toUpperCase()}</span>
        </span>
      </button>
      {open() && (
        <ul class="lang__menu" role="listbox">
          <span class="lg-effect" aria-hidden="true" />
          <span class="lg-tint"   aria-hidden="true" />
          <span class="lg-shine"  aria-hidden="true" />
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
