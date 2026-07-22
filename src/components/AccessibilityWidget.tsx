import { useEffect, useRef, useState, useCallback } from "react";

type StateShape = {
  fontStep: number; // -3..+3
  grayscale: boolean;
  highContrast: boolean;
  invert: boolean;
  lightBg: boolean;
  linksHl: boolean;
  readableFont: boolean;
  stopAnim: boolean;
  bigFocus: boolean;
};

const DEFAULT: StateShape = {
  fontStep: 0,
  grayscale: false,
  highContrast: false,
  invert: false,
  lightBg: false,
  linksHl: false,
  readableFont: false,
  stopAnim: false,
  bigFocus: false,
};

const STORAGE_KEY = "rr-a11y-v1";

function apply(state: StateShape) {
  const html = document.documentElement;
  const cls = [
    ["a11y-grayscale", state.grayscale],
    ["a11y-contrast", state.highContrast],
    ["a11y-invert", state.invert],
    ["a11y-light", state.lightBg],
    ["a11y-links", state.linksHl],
    ["a11y-font", state.readableFont],
    ["a11y-noanim", state.stopAnim],
    ["a11y-focus", state.bigFocus],
  ] as const;
  cls.forEach(([c, on]) => html.classList.toggle(c, !!on));
  const pct = 100 + state.fontStep * 10;
  html.style.fontSize = state.fontStep === 0 ? "" : `${pct}%`;
}

function load(): StateShape {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    /* noop */
  }
  return DEFAULT;
}

export function AccessibilityWidget() {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<StateShape>(DEFAULT);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const s = load();
    setState(s);
    apply(s);
  }, []);

  const update = useCallback((patch: Partial<StateShape>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      apply(next);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });
  }, []);

  const reset = () => {
    apply(DEFAULT);
    setState(DEFAULT);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* noop */
    }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        btnRef.current?.focus();
      }
      if (e.key === "Tab" && panelRef.current) {
        const focusables = panelRef.current.querySelectorAll<HTMLElement>(
          'button, a[href], [tabindex]:not([tabindex="-1"])',
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(t) &&
        btnRef.current &&
        !btnRef.current.contains(t)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDoc);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDoc);
    };
  }, [open]);

  const Toggle = ({
    label,
    on,
    onClick,
  }: {
    label: string;
    on: boolean;
    onClick: () => void;
  }) => (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`a11y-item${on ? " is-on" : ""}`}
    >
      {label}
    </button>
  );

  return (
    <>
      <a href="#main-content" className="a11y-skip">דלג לתוכן</a>
      <button
        ref={btnRef}
        type="button"
        className="a11y-fab"
        aria-label="פתח תפריט נגישות"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true">
          <circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="12" cy="5.5" r="1.6" fill="currentColor" />
          <path
            d="M5 8.5c2 .8 4.4 1.2 7 1.2s5-.4 7-1.2M12 9.7v4.3m0 0l-2.8 6M12 14l2.8 6"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
      {open && (
        <div
          ref={panelRef}
          className="a11y-panel"
          role="dialog"
          aria-label="תפריט נגישות"
          dir="rtl"
        >
          <div className="a11y-head">
            <h2>נגישות</h2>
            <button
              type="button"
              className="a11y-close"
              aria-label="סגור תפריט נגישות"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>
          <div className="a11y-row">
            <span>גודל טקסט</span>
            <div className="a11y-steps">
              <button
                type="button"
                aria-label="הקטן טקסט"
                onClick={() => update({ fontStep: Math.max(-3, state.fontStep - 1) })}
              >
                A-
              </button>
              <span className="a11y-step-val" aria-live="polite">
                {state.fontStep === 0 ? "רגיל" : `${state.fontStep > 0 ? "+" : ""}${state.fontStep}`}
              </span>
              <button
                type="button"
                aria-label="הגדל טקסט"
                onClick={() => update({ fontStep: Math.min(3, state.fontStep + 1) })}
              >
                A+
              </button>
            </div>
          </div>
          <div className="a11y-grid">
            <Toggle label="גווני אפור" on={state.grayscale} onClick={() => update({ grayscale: !state.grayscale })} />
            <Toggle label="ניגודיות גבוהה" on={state.highContrast} onClick={() => update({ highContrast: !state.highContrast })} />
            <Toggle label="ניגודיות הפוכה" on={state.invert} onClick={() => update({ invert: !state.invert })} />
            <Toggle label="רקע בהיר" on={state.lightBg} onClick={() => update({ lightBg: !state.lightBg })} />
            <Toggle label="הדגשת קישורים" on={state.linksHl} onClick={() => update({ linksHl: !state.linksHl })} />
            <Toggle label="פונט קריא" on={state.readableFont} onClick={() => update({ readableFont: !state.readableFont })} />
            <Toggle label="עצירת אנימציות" on={state.stopAnim} onClick={() => update({ stopAnim: !state.stopAnim })} />
            <Toggle label="הדגשת פוקוס" on={state.bigFocus} onClick={() => update({ bigFocus: !state.bigFocus })} />
          </div>
          <div className="a11y-actions">
            <button type="button" className="a11y-reset" onClick={reset}>איפוס הכול</button>
            <a className="a11y-link" href="/הסדרי-נגישות/">הצהרת נגישות</a>
          </div>
        </div>
      )}
    </>
  );
}