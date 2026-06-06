import { createSignal } from 'solid-js';

// Simple chat-pill placeholder. Real chat panel arrives with the agent backend.
export default function ChatButton(props: { label: string }) {
  const [online] = createSignal(true);

  return (
    <button
      type="button"
      class="chat-btn"
      aria-label={props.label}
      onClick={() => {
        document.dispatchEvent(new CustomEvent('studio:open-chat'));
      }}
    >
      <span class="lg-effect" aria-hidden="true" />
      <span class="lg-tint"   aria-hidden="true" />
      <span class="lg-shine"  aria-hidden="true" />
      <span class="pill-inner">
        <span class={`chat-btn__dot${online() ? ' is-on' : ''}`} aria-hidden="true" />
        <span class="chat-btn__label">{props.label}</span>
      </span>
    </button>
  );
}
