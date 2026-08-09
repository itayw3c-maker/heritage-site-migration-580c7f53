import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  Waves,
  Building2,
  PanelTop,
  ArrowRight,
  ArrowLeft,
  Calculator,
  Phone,
  MessageCircle,
  CheckCircle2,
  Info,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { sendLeadPayload, type FormPayload } from "@/lib/elementor-enhance";
import {
  WDC_CONFIG,
  DAMAGE_TYPE_CARDS,
  EMPTY_INPUT,
  calculate,
  formatILS,
  buildLeadSummary,
  type CalcInput,
  type DamageTypeId,
  type NumInput,
  type PanelsMethod,
  type RoomChoice,
} from "@/lib/water-damage-calculator";

const GOLD = "#CBA436";
const GOLD_DARK = "#B8912D";

type StepId =
  | "select"
  | "panels-method"
  | "panels-area"
  | "rooms"
  | "flood-type"
  | "flood-method"
  | "flood-input";

function buildSteps(input: CalcInput): StepId[] {
  switch (input.damageType) {
    case "panels":
      return ["select", "panels-method", "panels-area"];
    case "ceiling":
    case "neighbor":
      return ["select", "rooms"];
    case "flood":
      return ["select", "flood-type", "flood-method", "flood-input"];
    default:
      return ["select"];
  }
}

const ICONS = {
  wall: PanelTop,
  ceiling: Building2,
  neighbor: ArrowRight,
  flood: Waves,
} as const;

export function WaterDamageCalculator() {
  const [input, setInput] = useState<CalcInput>(EMPTY_INPUT);
  const [stepIndex, setStepIndex] = useState(0);
  const [showResult, setShowResult] = useState(false);
  const [stepError, setStepError] = useState<string | null>(null);

  const steps = useMemo(() => buildSteps(input), [input]);
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];
  const result = useMemo(() => calculate(input), [input]);

  // total logical stages = each question step + the result screen
  const totalStages = steps.length + 1;
  const currentStage = showResult ? totalStages : stepIndex + 1;
  const progressPct = Math.round((currentStage / totalStages) * 100);

  function patch(p: Partial<CalcInput>) {
    setInput((prev) => ({ ...prev, ...p }));
    setStepError(null);
  }

  function selectDamageType(id: DamageTypeId) {
    // Reset all type-specific inputs when switching types.
    setInput({ ...EMPTY_INPUT, damageType: id });
    setShowResult(false);
    setStepError(null);
    setStepIndex(1);
  }

  function validateStep(step: StepId): string | null {
    switch (step) {
      case "select":
        return input.damageType ? null : "יש לבחור סוג נזק מים";
      case "panels-method":
        return input.panelsMethod ? null : "יש לבחור דרך חישוב";
      case "panels-area": {
        const needDry =
          input.panelsMethod === "drying" || input.panelsMethod === "both";
        const needFloor =
          input.panelsMethod === "flooring" || input.panelsMethod === "both";
        if (needDry && !(Number(input.panelsDryingSqm) > 0))
          return 'יש להזין שטח לייבוש (מ"ר) גדול מאפס';
        if (needFloor && !(Number(input.panelsFlooringSqm) > 0))
          return 'יש להזין שטח להחלפת ריצוף (מ"ר) גדול מאפס';
        return null;
      }
      case "rooms":
        return input.rooms != null ? null : "יש לבחור מספר חללים";
      case "flood-type":
        return input.floodType ? null : "יש לבחור סוג הצפה";
      case "flood-method":
        return input.floodMethod ? null : "יש לבחור דרך חישוב";
      case "flood-input": {
        if (input.floodMethod === "rooms")
          return Number(input.floodRooms) > 0
            ? null
            : "יש להזין מספר חללים גדול מאפס";
        const anyArea =
          Number(input.floodDryingSqm) > 0 || Number(input.floodFlooringSqm) > 0;
        return anyArea ? null : 'יש להזין שטח אחד לפחות (מ"ר) גדול מאפס';
      }
      default:
        return null;
    }
  }

  function goNext() {
    const err = validateStep(currentStep);
    if (err) {
      setStepError(err);
      return;
    }
    if (stepIndex >= steps.length - 1) {
      // last question step -> compute
      setShowResult(true);
      setStepError(null);
      // scroll result into view on the next paint
      requestAnimationFrame(() => {
        document
          .getElementById("wdc-result")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
      return;
    }
    setStepIndex((i) => i + 1);
    setStepError(null);
  }

  function goBack() {
    if (showResult) {
      setShowResult(false);
      return;
    }
    if (stepIndex > 0) setStepIndex((i) => i - 1);
    setStepError(null);
  }

  function reset() {
    setInput(EMPTY_INPUT);
    setStepIndex(0);
    setShowResult(false);
    setStepError(null);
    requestAnimationFrame(() =>
      document.getElementById("wdc-top")?.scrollIntoView({ behavior: "smooth" }),
    );
  }

  const isLastQuestion = stepIndex >= steps.length - 1;

  return (
    <div dir="rtl" className="mx-auto w-full max-w-3xl px-4 py-8" id="wdc-top">
      {/* The site theme applies an UNLAYERED reset to every bare <button>/<a>:
          pink (#CC3366) text + 1px pink border at rest, and a pink background
          on hover/focus. Because unlayered CSS beats Tailwind's @layer
          utilities regardless of specificity, our controls can't style their
          own color/background/border via utility classes — so we drive them
          from this unlayered, #wdc-top-scoped stylesheet via marker classes
          (.wdc-opt/.wdc-cta/.wdc-wa/.wdc-outline/.wdc-ghost). */}
      <style>{`
        /* Neutral reset for every control: theme's 1px pink border + pink text
           + transparent bg are cancelled. Categories below re-apply our design.
           These rules are unlayered so they beat the theme (higher specificity)
           and Tailwind's @layer utilities (unlayered always wins over layers),
           which is why color/background/border are driven from here, not from
           utility classes, for the calculator's <button>/<a> elements. */
        #wdc-top button, #wdc-top a {
          color: inherit;
          background-color: transparent;
          border: 0 solid transparent;
          text-decoration: none;
        }
        #wdc-top button:hover, #wdc-top button:focus,
        #wdc-top a:hover, #wdc-top a:focus { color: inherit; background-color: transparent; }

        /* selectable card / option / room */
        #wdc-top .wdc-opt { border-width: 2px; border-style: solid; border-color: #e5e7eb; color: #111827; }
        #wdc-top .wdc-opt:hover, #wdc-top .wdc-opt:focus { border-color: rgba(203,164,54,.6); background-color: rgba(203,164,54,.06); color: #111827; }
        #wdc-top .wdc-opt.is-active { border-color: #CBA436; background-color: rgba(203,164,54,.09); color: #111827; }

        /* primary gold CTA */
        #wdc-top .wdc-cta { background-color: #CBA436; color: #fff; }
        #wdc-top .wdc-cta:hover, #wdc-top .wdc-cta:focus { background-color: #B8912D; color: #fff; }
        #wdc-top .wdc-cta:disabled { opacity: .6; }

        /* WhatsApp */
        #wdc-top .wdc-wa { background-color: #25D366; color: #fff; }
        #wdc-top .wdc-wa:hover, #wdc-top .wdc-wa:focus { background-color: #1fb457; color: #fff; }

        /* outline gold (call) */
        #wdc-top .wdc-outline { border-width: 2px; border-style: solid; border-color: #CBA436; color: #B8912D; }
        #wdc-top .wdc-outline:hover, #wdc-top .wdc-outline:focus { background-color: rgba(203,164,54,.08); color: #B8912D; }

        /* ghost (back / new-calculation) */
        #wdc-top .wdc-ghost { color: #4b5563; }
        #wdc-top .wdc-ghost:hover, #wdc-top .wdc-ghost:focus { background-color: #f3f4f6; color: #374151; }
      `}</style>
      <header className="mb-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
          מחשבון להערכת נזקי מים
        </h1>
        <p className="mx-auto mt-2 max-w-xl text-sm text-gray-600 sm:text-base">
          השיבו על מספר שאלות קצרות וקבלו הערכת נזק ראשונית בהתאם לסוג הנזק ולהיקפו.
        </p>
      </header>

      {/* progress bar */}
      <div className="mb-6" aria-hidden="true">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{ width: `${progressPct}%`, backgroundColor: GOLD }}
          />
        </div>
        <div className="mt-1 text-center text-xs text-gray-500">
          שלב {currentStage} מתוך {totalStages}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
        {!showResult && (
          <StepBody
            step={currentStep}
            input={input}
            patch={patch}
            onSelectType={selectDamageType}
          />
        )}

        {showResult && <ResultView result={result} />}

        {stepError && (
          <p
            role="alert"
            className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-700"
          >
            {stepError}
          </p>
        )}

        {/* navigation */}
        <div className="mt-6 flex items-center justify-between gap-3">
          {stepIndex > 0 || showResult ? (
            <button
              type="button"
              onClick={goBack}
              className="wdc-ghost inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              <ArrowRight className="h-4 w-4" />
              חזרה
            </button>
          ) : (
            <span />
          )}

          {!showResult && currentStep !== "select" && (
            <button
              type="button"
              onClick={goNext}
              className="wdc-cta inline-flex items-center gap-2 rounded-lg px-6 py-3 text-base font-bold shadow-sm transition-colors"
            >
              {isLastQuestion ? (
                <>
                  <Calculator className="h-5 w-5" />
                  חשב הערכת נזק
                </>
              ) : (
                <>
                  המשך
                  <ArrowLeft className="h-4 w-4" />
                </>
              )}
            </button>
          )}

          {showResult && (
            <button
              type="button"
              onClick={reset}
              className="wdc-ghost inline-flex items-center gap-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
              חישוב חדש
            </button>
          )}
        </div>
      </div>

      {showResult && result.ok && (
        <>
          <ContactBar />
          <Disclaimer />
          <LeadForm result={result} />
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Step bodies                                                         */
/* ------------------------------------------------------------------ */

function StepBody({
  step,
  input,
  patch,
  onSelectType,
}: {
  step: StepId;
  input: CalcInput;
  patch: (p: Partial<CalcInput>) => void;
  onSelectType: (id: DamageTypeId) => void;
}) {
  switch (step) {
    case "select":
      return (
        <fieldset>
          <legend className="mb-4 block text-lg font-semibold text-gray-900">
            איזה סוג נזק מים יש לך?
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {DAMAGE_TYPE_CARDS.map((card) => {
              const Icon = ICONS[card.icon];
              const active = input.damageType === card.id;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => onSelectType(card.id)}
                  className={cn(
                    "wdc-opt flex h-full items-start gap-3 rounded-xl p-4 text-right transition-all",
                    active && "is-active",
                  )}
                >
                  <span
                    className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-white"
                    style={{ backgroundColor: GOLD }}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <span>
                    <span className="block font-semibold text-gray-900">
                      {card.title}
                    </span>
                    <span className="mt-1 block text-sm text-gray-600">
                      {card.description}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>
      );

    case "panels-method":
      return (
        <QuestionWrap
          title="באיזו דרך תרצה לחשב את הערכת הנזק?"
          hint="ניתן לבחור ייבוש בלבד, החלפת ריצוף בלבד, או שילוב של שניהם."
        >
          <OptionList
            value={input.panelsMethod}
            onChange={(v) => patch({ panelsMethod: v as PanelsMethod })}
            options={[
              { value: "drying", label: "ייבוש תת-רצפתי", sub: `${formatILS(WDC_CONFIG.prices.dryingPerSqm)} למ"ר (כולל מע"מ)` },
              { value: "flooring", label: "החלפת ריצוף", sub: `${formatILS(WDC_CONFIG.prices.flooringPerSqm)} למ"ר (כולל עבודות נלוות)` },
              { value: "both", label: "שילוב: ייבוש + החלפת ריצוף", sub: "הזנת שטח נפרד לכל פעולה" },
            ]}
          />
        </QuestionWrap>
      );

    case "panels-area": {
      const needDry =
        input.panelsMethod === "drying" || input.panelsMethod === "both";
      const needFloor =
        input.panelsMethod === "flooring" || input.panelsMethod === "both";
      return (
        <QuestionWrap title="מהו השטח המשוער הדרוש?">
          <div className="space-y-4">
            {needDry && (
              <SqmField
                label='שטח לייבוש תת-רצפתי (מ"ר)'
                value={input.panelsDryingSqm}
                onChange={(v) => patch({ panelsDryingSqm: v })}
              />
            )}
            {needFloor && (
              <SqmField
                label='שטח להחלפת ריצוף (מ"ר)'
                value={input.panelsFlooringSqm}
                onChange={(v) => patch({ panelsFlooringSqm: v })}
              />
            )}
          </div>
        </QuestionWrap>
      );
    }

    case "rooms":
      return (
        <QuestionWrap title="בכמה חללים מדובר?">
          <RoomsSelect
            value={input.rooms}
            onChange={(v) => patch({ rooms: v })}
          />
        </QuestionWrap>
      );

    case "flood-type":
      return (
        <QuestionWrap
          title="באיזה סוג הצפה מדובר?"
          hint="הצפת ביוב עשויה לחייב ניקוי וחיטוי נוספים; אין לכך תוספת מחיר אוטומטית במחשבון."
        >
          <OptionList
            value={input.floodType}
            onChange={(v) => patch({ floodType: v as CalcInput["floodType"] })}
            options={[
              { value: "water", label: "הצפת מים" },
              { value: "sewage", label: "הצפת ביוב" },
            ]}
          />
        </QuestionWrap>
      );

    case "flood-method":
      return (
        <QuestionWrap title="כיצד תרצה לחשב את הערכת הנזק?">
          <OptionList
            value={input.floodMethod}
            onChange={(v) => patch({ floodMethod: v as CalcInput["floodMethod"] })}
            options={[
              { value: "rooms", label: "לפי מספר חללים" },
              { value: "area", label: 'לפי שטח במ"ר' },
            ]}
          />
        </QuestionWrap>
      );

    case "flood-input":
      if (input.floodMethod === "rooms")
        return (
          <QuestionWrap title="על כמה חללים חלה ההצפה?">
            <SqmField
              label="מספר חללים"
              value={input.floodRooms}
              onChange={(v) => patch({ floodRooms: v })}
              integer
            />
          </QuestionWrap>
        );
      return (
        <QuestionWrap
          title="מהו השטח המשוער הדרוש?"
          hint="ניתן להזין שטח לייבוש, שטח להחלפת ריצוף, או שניהם."
        >
          <div className="space-y-4">
            <SqmField
              label='שטח לייבוש תת-רצפתי (מ"ר)'
              value={input.floodDryingSqm}
              onChange={(v) => patch({ floodDryingSqm: v })}
            />
            <SqmField
              label='שטח להחלפת ריצוף (מ"ר)'
              value={input.floodFlooringSqm}
              onChange={(v) => patch({ floodFlooringSqm: v })}
            />
          </div>
        </QuestionWrap>
      );

    default:
      return null;
  }
}

function QuestionWrap({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold text-gray-900">{title}</h2>
      {hint && <p className="mb-4 text-sm text-gray-500">{hint}</p>}
      {!hint && <div className="mb-4" />}
      {children}
    </div>
  );
}

function OptionList({
  value,
  onChange,
  options,
}: {
  value: string | null;
  onChange: (v: string) => void;
  options: { value: string; label: string; sub?: string }[];
}) {
  return (
    <div className="space-y-3">
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "wdc-opt flex w-full items-center gap-3 rounded-xl p-4 text-right transition-all",
              active && "is-active",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                active ? "border-[#CBA436]" : "border-gray-300",
              )}
            >
              {active && (
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: GOLD }}
                />
              )}
            </span>
            <span className="flex-1">
              <span className="block font-medium text-gray-900">{opt.label}</span>
              {opt.sub && (
                <span className="mt-0.5 block text-sm text-gray-500">
                  {opt.sub}
                </span>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function SqmField({
  label,
  value,
  onChange,
  integer = false,
}: {
  label: string;
  value: NumInput;
  onChange: (v: NumInput) => void;
  integer?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </span>
      <input
        type="number"
        inputMode={integer ? "numeric" : "decimal"}
        min={0}
        step={integer ? 1 : "any"}
        value={value === "" ? "" : value}
        onChange={(e) => {
          const raw = e.target.value;
          if (raw === "") return onChange("");
          let n = Number(raw);
          if (!Number.isFinite(n) || n < 0) return; // reject negatives / junk
          if (integer) n = Math.floor(n);
          onChange(n);
        }}
        onKeyDown={(e) => {
          // block minus sign / exponent so no negatives can be typed
          if (["-", "e", "E", "+"].includes(e.key)) e.preventDefault();
        }}
        className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-gray-900 outline-none transition-colors focus:border-[#CBA436] focus:ring-2 focus:ring-[#CBA436]/30"
        placeholder="0"
      />
    </label>
  );
}

function RoomsSelect({
  value,
  onChange,
}: {
  value: RoomChoice | null;
  onChange: (v: RoomChoice) => void;
}) {
  const options: { v: RoomChoice; label: string }[] = [
    { v: 1, label: "חלל 1" },
    { v: 2, label: "2 חללים" },
    { v: 3, label: "3 חללים" },
    { v: 4, label: "4 חללים" },
    { v: 5, label: "5 חללים" },
    { v: "over5", label: "מעל 5 חללים" },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {options.map((opt) => {
        const active = value === opt.v;
        return (
          <button
            key={String(opt.v)}
            type="button"
            onClick={() => onChange(opt.v)}
            className={cn(
              "wdc-opt rounded-xl px-3 py-3 text-center text-sm font-medium transition-all",
              active && "is-active",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Result                                                              */
/* ------------------------------------------------------------------ */

function ResultView({ result }: { result: ReturnType<typeof calculate> }) {
  if (!result.ok) {
    return (
      <p className="text-center text-gray-600">
        חסרים נתונים לחישוב. חזרו אחורה והשלימו את השאלות.
      </p>
    );
  }
  const headline = result.isRange
    ? `${formatILS(result.min ?? 0)} – ${formatILS(result.max ?? 0)}`
    : formatILS(result.total ?? 0);

  return (
    <div id="wdc-result">
      <div
        className="rounded-2xl border-2 p-5 sm:p-6"
        style={{ borderColor: GOLD, backgroundColor: `${GOLD}0d` }}
      >
        <div className="text-sm font-semibold text-gray-500">
          הערכת נזק משוערת
        </div>
        <div
          className="mt-1 text-3xl font-extrabold sm:text-4xl"
          style={{ color: GOLD_DARK }}
        >
          {headline}
        </div>

        <div className="mt-4 space-y-2 border-t border-gray-200 pt-4">
          <ResultRow label="סוג הנזק" value={result.damageTypeLabel} />
          {result.floodTypeLabel && (
            <ResultRow label="סוג ההצפה" value={result.floodTypeLabel} />
          )}
          {result.lines.map((line, i) => (
            <ResultRow key={i} label={line.label} value={line.value} />
          ))}
        </div>

        {result.extraNote && (
          <p className="mt-4 flex gap-2 rounded-lg bg-white/70 p-3 text-xs text-gray-600">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
            {result.extraNote}
          </p>
        )}

        <p className="mt-4 text-sm font-medium text-gray-700">
          {WDC_CONFIG.resultNote}
        </p>
      </div>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="text-left font-medium text-gray-900">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Contact bar (WhatsApp / call) — shown right after the result       */
/* ------------------------------------------------------------------ */

function ContactBar() {
  const wa = `https://wa.me/${WDC_CONFIG.contact.whatsapp}?text=${encodeURIComponent(
    "שלום, השתמשתי במחשבון נזקי המים באתר ואשמח לקבל הערכה מקצועית ומדויקת יותר.",
  )}`;
  return (
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      <a
        href={wa}
        target="_blank"
        rel="noopener noreferrer"
        className="wdc-wa inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold shadow-sm transition-colors"
      >
        <MessageCircle className="h-5 w-5" />
        יצירת קשר בוואטסאפ
      </a>
      <a
        href={`tel:${WDC_CONFIG.contact.phoneDigits}`}
        className="wdc-outline inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 font-bold transition-colors"
      >
        <Phone className="h-5 w-5" />
        חיוג ישיר: {WDC_CONFIG.contact.phoneDisplay}
      </a>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Disclaimer                                                          */
/* ------------------------------------------------------------------ */

function Disclaimer() {
  return (
    <div className="mt-6 rounded-xl bg-gray-50 p-4 text-xs leading-relaxed text-gray-500">
      <div className="mb-1 font-semibold text-gray-600">גילוי נאות</div>
      {WDC_CONFIG.disclaimer}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Lead form                                                          */
/* ------------------------------------------------------------------ */

function LeadForm({ result }: { result: ReturnType<typeof calculate> }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const phoneDigits = phone.replace(/\D/g, "");
    if (!name.trim()) return setError("יש להזין שם מלא");
    if (phoneDigits.length !== 10)
      return setError("מספר הטלפון חייב להכיל בדיוק 10 ספרות");
    if (!consent) return setError("יש לאשר את מדיניות הפרטיות");

    const damageType = result.floodTypeLabel
      ? `${result.damageTypeLabel} (${result.floodTypeLabel})`
      : result.damageTypeLabel;

    const messageParts = [
      address.trim() ? `כתובת הנכס / יישוב: ${address.trim()}` : "",
      message.trim() ? `תיאור: ${message.trim()}` : "",
      buildLeadSummary(result),
    ].filter(Boolean);

    const payload: FormPayload = {
      name: name.trim(),
      phone: phoneDigits,
      email: null,
      damage_type: damageType,
      message: messageParts.join("\n\n"),
      page_url: typeof window !== "undefined" ? window.location.href : "",
      form_name: "מחשבון נזקי מים",
    };

    setSubmitting(true);
    try {
      await sendLeadPayload(payload);
      setDone(true);
      requestAnimationFrame(() =>
        document
          .getElementById("wdc-lead")
          ?.scrollIntoView({ behavior: "smooth", block: "center" }),
      );
    } catch (err) {
      console.error("water-damage lead failed", err);
      setError("אירעה שגיאה בשליחת הטופס. אנא נסו שוב או צרו קשר טלפונית.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <div
        id="wdc-lead"
        className="mt-6 rounded-2xl border-2 p-6 text-center"
        style={{ borderColor: GOLD, backgroundColor: `${GOLD}0d` }}
      >
        <CheckCircle2 className="mx-auto h-10 w-10" style={{ color: GOLD_DARK }} />
        <h3 className="mt-2 text-lg font-bold text-gray-900">הפרטים נשלחו בהצלחה</h3>
        <p className="mt-1 text-sm text-gray-600">
          תודה! נחזור אליכם בהקדם לצורך בדיקה ראשונית של המקרה.
        </p>
      </div>
    );
  }

  return (
    <form
      id="wdc-lead"
      onSubmit={submit}
      className="mt-6 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7"
    >
      <h3 className="text-lg font-bold text-gray-900">
        רוצה לקבל הערכה מקצועית ומדויקת יותר?
      </h3>
      <p className="mt-1 text-sm text-gray-600">
        השאירו פרטים ונחזור אליכם לצורך בדיקה ראשונית של המקרה.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <Field label="שם מלא *">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-[#CBA436] focus:ring-2 focus:ring-[#CBA436]/30"
          />
        </Field>
        <Field label="מספר טלפון *">
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-[#CBA436] focus:ring-2 focus:ring-[#CBA436]/30"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="כתובת הנכס או יישוב">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-[#CBA436] focus:ring-2 focus:ring-[#CBA436]/30"
          />
        </Field>
      </div>

      <div className="mt-4">
        <Field label="תיאור קצר (לא חובה)">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 outline-none focus:border-[#CBA436] focus:ring-2 focus:ring-[#CBA436]/30"
          />
        </Field>
      </div>

      <label className="mt-4 flex items-start gap-2 text-sm text-gray-600">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-[#CBA436]"
        />
        <span>אני מאשר/ת את מדיניות הפרטיות ואת יצירת הקשר עמי בנוגע לפנייה זו.</span>
      </label>

      {error && (
        <p role="alert" className="mt-3 text-sm font-medium text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="wdc-cta mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-base font-bold shadow-sm transition-colors"
      >
        {submitting ? "שולח..." : "שליחת פרטים"}
      </button>
    </form>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </span>
      {children}
    </label>
  );
}
