// Screen-reader announcements: one shared polite live region per document, rate-limited.
// The same contract as Fizlet's `fizlet/announce` brick; this vendored Fizlet predates it, so a
// later `npm run sync` can swap this import for the brick's.
export interface Announcer {
  /** Queue `text` under `key`; a newer text for the same key replaces the pending one. */
  say(key: string, text: string): void;
  /** Write what is pending now. */
  flush(): void;
  destroy(): void;
}

export function announcer({ gap = 1, doc = document }: { gap?: number; doc?: Document } = {}): Announcer {
  const pending = new Map<string, string>(); // a Map keeps first-queued order when a key is replaced
  let el: HTMLElement | null = null, own = false, next = 0, timer: ReturnType<typeof setTimeout> | undefined;
  const flush = () => {
    clearTimeout(timer);
    timer = undefined;
    if (!pending.size) return;
    if (!el?.isConnected) {
      el = doc.querySelector<HTMLElement>("[data-fz-announce]");
      if (!el) {
        el = doc.createElement("div");
        el.setAttribute("data-fz-announce", "");
        el.setAttribute("role", "status");
        el.setAttribute("aria-live", "polite");
        el.setAttribute("aria-atomic", "true");
        el.style.cssText = "position:fixed;width:1px;height:1px;overflow:hidden;clip-path:inset(50%);white-space:nowrap";
        doc.body.append(el);
        own = true;
      }
    }
    const text = [...pending.values()].join(". ");
    pending.clear();
    // The same words again still change the region (a trailing space), so they are read again.
    el.textContent = el.textContent === text ? text + " " : text;
    next = Date.now() + gap * 1000;
  };
  return {
    say(key, text) {
      pending.set(key, text);
      // A timer, never a frame: what is queued in the same task goes out together.
      timer ??= setTimeout(flush, Math.max(0, next - Date.now()));
    },
    flush,
    destroy() {
      clearTimeout(timer);
      timer = undefined;
      pending.clear();
      if (own) el?.remove();
      el = null;
      own = false;
    },
  };
}
