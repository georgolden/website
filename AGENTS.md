# AGENTS.md — GO Studio Portfolio

## Astro + SolidJS: Mistakes Made & Rules Never to Repeat

### 1. Solid `ref` must be used with displayed size, not natural size

**Mistake:** Used `img.naturalHeight` (intrinsic pixels: 21927px) in `translate3d()` which operates in CSS pixels (~3900px at display scale). Caused the image to scroll 5x past its visible end, showing blank space.

**Rule:** Always use `getBoundingClientRect().height` (CSS rendered height) for DOM transforms, never `naturalHeight`/`naturalWidth` which are in device pixels.

```ts
// ❌ WRONG — naturalHeight is device pixels, not CSS pixels
const maxScroll = img.naturalHeight - frameH;

// ✅ RIGHT — getBoundingClientRect returns CSS rendered dimensions
const displayedH = img.getBoundingClientRect().height;
const maxScroll = displayedH - frameH;
```

### 2. Solid islands: return real DOM, never `null`

**Mistake:** `NavInverter` returned `null`. In Astro SSR, Solid's `Suspense` wrapper + Astro's double-render (check + actual render) means a null-returning component may not properly register its reactive root, causing "computations created outside createRoot" warnings.

**Rule:** Every Solid island must return a real DOM node — even `<span hidden />` for invisible components.

```tsx
// ❌ WRONG
export default function NavInverter() {
  onMount(() => { /* ... */ });
  return null;
}

// ✅ RIGHT
export default function NavInverter() {
  onMount(() => { /* ... */ });
  return <span hidden />; // or <div style="display:none" />
```

### 3. `<script>` in Astro pages gets hoisted and bundled by default

**Mistake:** Used bare `<script>` in `.astro` files expecting it to run at DOM position. Astro hoists scripts to `<head>` and wraps them as `<script type="module">`, breaking DOM-dependent code that isn't deferred-safe.

**Rule:** Always use `is:inline` for vanilla scripts that depend on DOM position, or use Solid/Svelte islands for dynamic behavior. Never rely on a bare `<script>` tag's position in `.astro` files.

```astro
<!-- ❌ WRONG — gets hoisted to <head>, DOM not ready -->
<script>document.querySelector('.intro')</script>

<!-- ✅ RIGHT — stays in place -->
<script is:inline>document.querySelector('.intro')</script>

<!-- ✅ BETTER — use framework island -->
<MyIsland client:load />
```

### 4. Astro double-renders Solid components — plan for it

**Mistake:** Assumed Solid components render once during SSR. Astro calls every island component **twice** on the server:
1. `check()` — sync render to detect which renderer to use
2. Actual `renderToStaticMarkup()` — async render with Suspense

This is not fixable at the component level (it's Astro core behavior, PR #12131 was closed without merging). 

**Rule:** Design Solid islands to be idempotent across double-render. Use `onMount` for all client-only logic (it only runs after hydration, not during SSR). Never use `createResource` without an explicit `id` parameter to avoid ID collision between the two render passes.

```tsx
// ❌ RISKY — may get duplicate IDs from double-render
const [data] = createResource(() => fetchData());

// ✅ SAFE — explicit ID prevents collision
const [data] = createResource(() => 'my-data', () => fetchData());
```

### 5. Vite HMR can create multiple Solid instances (dev only)

**Mistake:** "You appear to have multiple instances of Solid" warning during development. This is `solid-refresh` (HMR) piling new reactive instances on top of old ones without cleanup between hot reloads.

**Rule:** This is a dev-only issue. A cold restart (`pkill -f astro && npm run dev`) always fixes it. The warning does NOT appear in production builds. Do not add defensive code to work around HMR — just restart the dev server.

### 6. CSS custom properties in global stylesheets can't override Astro scoped component styles

**Mistake:** Put nav color overrides in `case.css` (global) targeting `.nav__links a` which is scoped by Astro's component styles. The scoped `[data-astro-cid]` attribute selectors have higher specificity than global class selectors, silently preventing overrides.

**Rule:** To override a scoped component's styles, add the override inside THAT component's `<style>` block using `:global()` wrappers on the parent selector:

```css
/* ✅ Inside Nav.astro <style> — :global() makes the condition global */
:global(.nav-white) .nav__links a { color: #fff; }
/* Output: .nav-white .nav__links[data-astro-cid] a[data-astro-cid] { color: #fff } */
/* This beats: .nav__links[data-astro-cid] a[data-astro-cid] { color: var(--ink-soft) } */
```

### 7. IntersectionObserver with multiple targets needs per-element state tracking

**Mistake:** Used `entries.some(e => e.isIntersecting)` which only checks the CURRENT callback batch. If separate callbacks fire for different targets (`.intro` fires first with `false`, removing the class, then `.next` fires with `true` but the damage is done), the state is corrupted.

**Rule:** Maintain a `Map<Element, boolean>` tracking per-element intersection state. Compute the aggregate state from the full map, not from the current callback's entries:

```ts
// ❌ WRONG — only sees current batch
const any = entries.some(e => e.isIntersecting);

// ✅ RIGHT — full state survives separate callbacks
const state = new Map();
entries.forEach(e => state.set(e.target, e.isIntersecting));
const any = [...state.values()].some(Boolean);
```

### 8. Video codecs: HEVC/H.265 is NOT universally supported

**Mistake:** Dropped HEVC-encoded `.mp4` files into `public/` expecting them to work. Firefox never supports HEVC. Chrome only supports it with hardware decoder. Result: users see nothing.

**Rule:** Always encode videos as H.264 (AVC) for universal browser support. Use ffmpeg: `-c:v libx264 -preset medium -crf 23 -movflags +faststart`.

### 9. CSS `height: 100%` on absolutely positioned element + padding-based parent works

**Rule:** An absolutely-positioned video with `inset: 0; width: 100%; height: 100%; object-fit: cover` inside a `position: relative; overflow: hidden` parent with padding-based height does work correctly. The parent's height from padding+content becomes the containing block for the absolute child. No explicit `height` property needed on parent.

### 10. `.mp4` videos go in `public/`, not project root

**Rule:** Astro serves static assets from `public/` at root URL path. Files at project root are not accessible via URL. Move to `public/video/` → accessible at `/video/filename.mp4`.
