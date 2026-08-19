import { useEffect, useState } from "react";
import { grantAnalyticsConsent } from "@/lib/analytics";

const STORAGE_KEY = "sgcc-accepted";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "1") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
    grantAnalyticsConsent();
    // FixDigital's cookie writer + call-tracking script are held back in <head>
    // until this point, so start them as soon as the visitor accepts rather than
    // making them wait for the next navigation.
    try {
      (window as unknown as { __fixdigitalBoot?: () => void }).__fixdigitalBoot?.();
    } catch {
      /* noop */
    }
    setVisible(false);
  };

  return (
    <aside
      className={`sgcc-main-wrapper layout-full position-bottom${visible ? "" : " hidden"}`}
      data-layout="full_width"
    >
      <div className="sgcc-container">
        <div className="sgcc-notice-content">
          <span className="cookie-icon">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              aria-label="Cookie icon"
              role="img"
              viewBox="0 0 24 24"
              width="32"
              height="32"
            >
              <g>
                <circle cx="9.5" cy="9.5" r="1.5" />
                <circle cx="18.5" cy="1.5" r="1.5" />
                <circle cx="21.5" cy="6.5" r="1.5" />
                <circle cx="9.5" cy="14.5" r="1.5" />
                <circle cx="14.5" cy="14.5" r="1.5" />
                <path d="M12,24A12,12,0,0,1,12,0c.387,0,.769.021,1.146.057l.824.077.078.824a10,10,0,0,0,8.994,8.994l.824.078.077.824c.036.377.057.759.057,1.146A12.013,12.013,0,0,1,12,24ZM12,2A10,10,0,1,0,22,12c0-.057,0-.113,0-.17A12.006,12.006,0,0,1,12.17,2Z" />
              </g>
            </svg>
          </span>
          <div className="message-block">
            <p>
              באתר זה נעשה שימוש בעוגיות וטכנולוגיות איסוף מידע לחוויית גלישה משופרת ומטרות
              סטטיסטיקה ושיווק. המשך הגלישה מהווה הסכמתך ל
              <a
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 font-normal underline hover:text-blue-600"
                href="/מדיניות-פרטיות/"
              >
                מדיניות הפרטיות
              </a>{" "}
              שלנו.
            </p>
          </div>
          <div className="cookie-compliance-button-block">
            <button
              type="button"
              id="sgcc-accept-button"
              className="close-sgcc cookie-compliance-button"
              aria-label="Accept Cookies"
              onClick={dismiss}
            >
              הבנתי
            </button>
          </div>
        </div>
        <button
          type="button"
          id="close-sgcc-button"
          className="close close-sgcc"
          aria-label="סגור"
          onClick={dismiss}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            role="img"
            viewBox="0 0 24 24"
            fill="currentColor"
            width="16"
            height="16"
          >
            <path d="M11.9997 10.5865L16.9495 5.63672L18.3637 7.05093L13.4139 12.0007L18.3637 16.9504L16.9495 18.3646L11.9997 13.4149L7.04996 18.3646L5.63574 16.9504L10.5855 12.0007L5.63574 7.05093L7.04996 5.63672L11.9997 10.5865Z"></path>
          </svg>
        </button>
      </div>
    </aside>
  );
}
