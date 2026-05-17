/**
 * HeroBuilder — AI-driven website builder (pure DOM/Solid + SVG).
 *
 * Each element is a real hand-drawn SVG in /public/builder/svg/.
 * Placement uses a "top-left skyline" bin-packer over the interior's pixel
 * rect, so additions snap into a tidy mosaic (no overlaps, no random gaps).
 * Re-packs on resize.
 *
 * window.__builder API:
 *   add(type, opts?)     → id
 *   remove(id)
 *   replace(id, type)
 *   move(id, x, y)       (clamped within interior; will overlap until repacked)
 *   repack()             (re-runs packer over current elements)
 *   clear()
 *   list()
 */
import { createSignal, onMount, onCleanup, For, Show } from 'solid-js';

/* ─── Element catalog (aspect ratios from each SVG's viewBox) ─── */

export type ElementType =
  | 'loading' | 'dialog_yes_no' | 'speech' | 'love_notification'
  | 'closed_email' | 'email_opened' | 'folder' | 'file' | 'closable_file'
  | 'cloud' | 'star' | 'smile' | 'image' | 'volume_bar' | 'music_bar'
  | 'transparent_dialog'
  | 'calculator' | 'media_player' | 'dialog_window' | 'progress_window'
  | 'smiles_window' | 'reviews' | 'sad_message';

interface ElementMeta {
  src: string;
  /** Default rendered height as % of interior height. */
  hPct: number;
  /** Natural aspect ratio (w/h) from the SVG viewBox. */
  aspect: number;
}

const ELEMENTS: Record<ElementType, ElementMeta> = {
  loading:            { src: '/builder/svg/elements/loading.svg',                                hPct: 11, aspect: 3.016 },
  dialog_yes_no:      { src: '/builder/svg/elements/dialog_yes_no.svg',                          hPct: 32, aspect: 1.480 },
  speech:             { src: '/builder/svg/elements/notification_text.svg',                      hPct: 18, aspect: 2.749 },
  love_notification:  { src: '/builder/svg/elements/love_notification.svg',                      hPct: 24, aspect: 0.927 },
  closed_email:       { src: '/builder/svg/elements/closed_email.svg',                           hPct: 16, aspect: 1.459 },
  email_opened:       { src: '/builder/svg/elements/email_opened.svg',                           hPct: 18, aspect: 1.094 },
  folder:             { src: '/builder/svg/elements/folder.svg',                                 hPct: 18, aspect: 1.654 },
  file:               { src: '/builder/svg/elements/file.svg',                                   hPct: 22, aspect: 0.807 },
  closable_file:      { src: '/builder/svg/elements/closable_file.svg',                          hPct: 20, aspect: 1.381 },
  cloud:              { src: '/builder/svg/elements/cloud.svg',                                  hPct: 11, aspect: 1.658 },
  star:               { src: '/builder/svg/elements/star.svg',                                   hPct: 11, aspect: 1.044 },
  smile:              { src: '/builder/svg/elements/smile.svg',                                  hPct: 18, aspect: 1.000 },
  image:              { src: '/builder/svg/elements/image.svg',                                  hPct: 24, aspect: 1.172 },
  volume_bar:         { src: '/builder/svg/elements/volume_bar.svg',                             hPct: 9,  aspect: 3.744 },
  music_bar:          { src: '/builder/svg/elements/music_playing_progress_bar_not_player.svg',  hPct: 9,  aspect: 6.296 },
  transparent_dialog: { src: '/builder/svg/elements/dialog_windowless_transparent.svg',          hPct: 22, aspect: 2.398 },
  calculator:         { src: '/builder/svg/windows/calculator.svg',                              hPct: 40, aspect: 0.819 },
  media_player:       { src: '/builder/svg/windows/media_player.svg',                            hPct: 32, aspect: 1.689 },
  dialog_window:      { src: '/builder/svg/windows/dialog_window_yes_no.svg',                    hPct: 30, aspect: 1.705 },
  progress_window:    { src: '/builder/svg/windows/progress_bar_window.svg',                     hPct: 18, aspect: 2.587 },
  smiles_window:      { src: '/builder/svg/windows/smiles_window.svg',                           hPct: 34, aspect: 0.956 },
  reviews:            { src: '/builder/svg/windows/review_smile_angry_smile_sad_smile_heart.svg',hPct: 10, aspect: 3.992 },
  sad_message:        { src: '/builder/svg/windows/message_sad_smile.svg',                       hPct: 18, aspect: 1.314 },
};

/* ─── Bin-packing (top-left skyline) ──────────────────────── */

interface Rect { x: number; y: number; w: number; h: number; }

function findPlacement(
  w: number, h: number,
  placed: Rect[],
  bounds: { w: number; h: number },
  gap: number,
): { x: number; y: number } | null {
  const candidates: { x: number; y: number }[] = [{ x: 0, y: 0 }];
  for (const r of placed) {
    candidates.push({ x: r.x + r.w + gap, y: r.y });
    candidates.push({ x: r.x, y: r.y + r.h + gap });
  }
  candidates.sort((a, b) => a.y - b.y || a.x - b.x);
  for (const c of candidates) {
    if (c.x < 0 || c.y < 0) continue;
    if (c.x + w > bounds.w + 0.5) continue;
    if (c.y + h > bounds.h + 0.5) continue;
    let overlaps = false;
    for (const r of placed) {
      if (c.x < r.x + r.w + gap && c.x + w + gap > r.x &&
          c.y < r.y + r.h + gap && c.y + h + gap > r.y) {
        overlaps = true; break;
      }
    }
    if (!overlaps) return c;
  }
  return null;
}

/* ─── Placed element state ────────────────────────────────── */

interface Placed {
  id: string;
  type: ElementType;
  rect: Rect;                  // in interior px
  text?: string;
  phase: 'entering' | 'live' | 'leaving';
  seed: number;
}

interface AddOpts { x?: number; y?: number; hPct?: number; text?: string; id?: string; }

export default function HeroBuilder() {
  const [elements, setElements] = createSignal<Placed[]>([]);
  const [showDev, setShowDev] = createSignal(false);
  const [interiorSize, setInteriorSize] = createSignal({ w: 0, h: 0 });
  let interiorEl!: HTMLDivElement;
  let nextId = 1;
  const GAP = 14;

  const rectFor = (type: ElementType, hPct?: number): { w: number; h: number } => {
    const meta = ELEMENTS[type];
    const { h: ih } = interiorSize();
    const h = Math.max(20, ((hPct ?? meta.hPct) / 100) * ih);
    const w = h * meta.aspect;
    return { w, h };
  };

  /** Re-pack all current elements in order, mutating their rects. */
  const repack = () => {
    const bounds = interiorSize();
    if (bounds.w === 0) return;
    const placed: Rect[] = [];
    const updated = elements().map((el) => {
      const { w, h } = rectFor(el.type, (el.rect.h / bounds.h) * 100);
      const pos = findPlacement(w, h, placed, bounds, GAP)
        ?? { x: Math.max(0, bounds.w - w), y: Math.max(0, bounds.h - h) };
      const r = { x: pos.x, y: pos.y, w, h };
      placed.push(r);
      return { ...el, rect: r };
    });
    setElements(updated);
  };

  /* ── Command API ────────────────────────────────────────── */
  const builder = {
    add(type: ElementType, opts: AddOpts = {}): string {
      const id = opts.id ?? `el_${nextId++}`;
      const bounds = interiorSize();
      const { w, h } = rectFor(type, opts.hPct);
      const placedRects = elements().filter(e => e.phase !== 'leaving').map(e => e.rect);
      const pos = (opts.x != null && opts.y != null)
        ? { x: opts.x, y: opts.y }
        : findPlacement(w, h, placedRects, bounds, GAP)
          ?? { x: Math.max(0, (bounds.w - w) / 2), y: Math.max(0, bounds.h - h - 8) };
      const placed: Placed = {
        id, type,
        rect: { x: pos.x, y: pos.y, w, h },
        text: opts.text,
        phase: 'entering',
        seed: Math.random() * Math.PI * 2,
      };
      setElements([...elements(), placed]);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        setElements(elements().map(e => e.id === id ? { ...e, phase: 'live' } : e));
      }));
      return id;
    },
    remove(id: string): boolean {
      const el = elements().find(e => e.id === id);
      if (!el) return false;
      setElements(elements().map(e => e.id === id ? { ...e, phase: 'leaving' } : e));
      setTimeout(() => {
        setElements(elements().filter(e => e.id !== id));
        repack();
      }, 320);
      return true;
    },
    replace(id: string, type: ElementType, opts: AddOpts = {}): string | null {
      const el = elements().find(e => e.id === id);
      if (!el) return null;
      const { x, y } = el.rect;
      this.remove(id);
      return this.add(type, { ...opts, x, y });
    },
    move(id: string, x: number, y: number): boolean {
      const el = elements().find(e => e.id === id);
      if (!el) return false;
      const bounds = interiorSize();
      const clampedX = Math.max(0, Math.min(bounds.w - el.rect.w, x));
      const clampedY = Math.max(0, Math.min(bounds.h - el.rect.h, y));
      setElements(elements().map(e => e.id === id
        ? { ...e, rect: { ...e.rect, x: clampedX, y: clampedY } } : e));
      return true;
    },
    repack,
    clear(): void { for (const e of [...elements()]) this.remove(e.id); },
    list() {
      return elements().map(e => ({
        id: e.id, type: e.type,
        x: e.rect.x, y: e.rect.y, w: e.rect.w, h: e.rect.h,
      }));
    },
  };

  onMount(() => {
    if (typeof window !== 'undefined' && window.location.search.includes('dev=1')) {
      setShowDev(true);
    }
    (window as any).__builder = builder;

    const ro = new ResizeObserver(() => {
      const r = interiorEl.getBoundingClientRect();
      setInteriorSize({ w: r.width, h: r.height });
      repack();
    });
    ro.observe(interiorEl);
    onCleanup(() => ro.disconnect());
  });

  /* ── Dev panel ──────────────────────────────────────────── */
  const addType = (t: ElementType) => builder.add(t);
  const removeLast = () => {
    const live = elements().filter(e => e.phase !== 'leaving');
    if (live.length) builder.remove(live[live.length - 1].id);
  };

  const typeKeys = Object.keys(ELEMENTS) as ElementType[];

  return (
    <div class="hb">
      <div class="hb__frame">
        <img class="hb__frame-bg" src="/builder/svg/frame/background_orange.svg" alt="" />
        <img class="hb__chrome" src="/builder/svg/frame/top_menu.svg" alt="" />
        <div class="hb__interior" ref={interiorEl}>
          <For each={elements()}>
            {(el) => (
              <div
                class="hb__el-pos"
                style={{
                  transform: `translate3d(${el.rect.x}px, ${el.rect.y}px, 0)`,
                  width: `${el.rect.w}px`,
                  height: `${el.rect.h}px`,
                }}
              >
                <div
                  class={`hb__el hb__el--${el.phase}`}
                  style={{ '--delay': `${(el.seed * 0.7).toFixed(2)}s` }}
                >
                  <img src={ELEMENTS[el.type].src} alt="" draggable={false} />
                  <Show when={el.text}>
                    <span class="hb__el-text">{el.text}</span>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      <Show when={showDev()}>
        <div class="hb__dev">
          <div class="hb__dev-row hb__dev-row--wrap">
            <For each={typeKeys}>{(t) => <button onClick={() => addType(t)}>+ {t}</button>}</For>
          </div>
          <div class="hb__dev-row">
            <button onClick={removeLast}>− last</button>
            <button onClick={() => builder.clear()}>clear</button>
            <button onClick={() => builder.repack()}>repack</button>
            <span class="hb__dev-count">{elements().filter(e => e.phase !== 'leaving').length} placed · {interiorSize().w.toFixed(0)}×{interiorSize().h.toFixed(0)}px</span>
          </div>
        </div>
      </Show>

      <style>{`
        .hb {
          position: absolute; inset: 0;
          background: #FFE0D0;
          overflow: hidden;
          font-family: 'Fredoka', system-ui, sans-serif;
        }
        .hb__frame {
          position: absolute;
          left: 17.5%; right: 17.5%;
          top: 12%; bottom: -22%;
          overflow: hidden;
          filter: drop-shadow(0 12px 24px rgba(46, 2, 73, 0.22));
        }
        @media (max-width: 720px) {
          .hb__frame { left: 5%; right: 5%; top: 8%; bottom: -14%; }
        }
        .hb__frame-bg {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover; object-position: center top;
          user-select: none; pointer-events: none;
        }
        .hb__chrome {
          position: absolute;
          top: 3.5%; left: 3.5%; right: 3.5%;
          width: 93%; height: auto;
          user-select: none; pointer-events: none;
        }
        .hb__interior {
          position: absolute;
          top: 14%; left: 5%; right: 5%; bottom: 4%;
        }

        /* Outer wrapper handles position + size transitions (hardware-accelerated transform). */
        .hb__el-pos {
          position: absolute;
          left: 0; top: 0;
          transition: transform 540ms cubic-bezier(.22, 1, .36, 1),
                      width 540ms cubic-bezier(.22, 1, .36, 1),
                      height 540ms cubic-bezier(.22, 1, .36, 1);
          will-change: transform;
        }
        /* Inner element handles entrance / exit + idle bob. */
        .hb__el {
          width: 100%; height: 100%;
          transform-origin: center;
          transition: transform 440ms cubic-bezier(.34, 1.56, .64, 1),
                      opacity 280ms ease;
          opacity: 1;
          animation: hb-bob 5.5s ease-in-out infinite;
          animation-delay: var(--delay, 0s);
          position: relative;
        }
        .hb__el img {
          width: 100%; height: 100%;
          display: block;
          user-select: none;
        }
        .hb__el-text {
          position: absolute;
          left: 50%; top: 42%;
          transform: translate(-50%, -50%);
          font-weight: 700;
          font-size: clamp(11px, 1.1vw, 16px);
          color: #2E0249;
          text-align: center;
          max-width: 75%;
          pointer-events: none;
        }
        .hb__el--entering { transform: scale(0) rotate(-12deg); opacity: 0; }
        .hb__el--leaving  { transform: scale(0) rotate(18deg);  opacity: 0; }
        @keyframes hb-bob {
          0%, 100% { translate: 0 0; }
          50%      { translate: 2px -3px; }
        }

        .hb__dev {
          position: absolute; bottom: 10px; left: 10px; right: 10px;
          background: rgba(20,20,20,0.88); color: #fff;
          font-family: ui-monospace, monospace; font-size: 10.5px;
          padding: 8px 10px; border-radius: 10px; z-index: 50;
          display: flex; flex-direction: column; gap: 6px;
        }
        .hb__dev-row { display: flex; gap: 5px; align-items: center; flex-wrap: nowrap; }
        .hb__dev-row--wrap { flex-wrap: wrap; }
        .hb__dev button {
          background: #fff; color: #000; border: 0; padding: 3px 7px;
          border-radius: 4px; font-family: inherit; font-size: 10.5px;
          cursor: pointer;
        }
        .hb__dev button:hover { background: #FFD23F; }
        .hb__dev-count { opacity: 0.6; margin-left: auto; }
      `}</style>
    </div>
  );
}
