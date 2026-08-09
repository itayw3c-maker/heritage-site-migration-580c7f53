/**
 * Water-damage estimate calculator — configuration + pure calc engine.
 *
 * Everything that a non-developer might want to tweak (prices, the room count
 * used for the "over 5" options, contact details, all copy, the disclaimer) is
 * centralised in WDC_CONFIG so prices can change without touching the calc
 * logic or the UI (spec §14). The functions below are pure and side-effect
 * free; the React component (WaterDamageCalculator.tsx) owns all state.
 *
 * IMPORTANT (per spec): this is a rough preliminary ESTIMATE, never a price
 * quote. Never surface the terms "הצעת מחיר" / "עלות סופית" in the result.
 */

export type DamageTypeId = "panels" | "ceiling" | "neighbor" | "flood";
export type PanelsMethod = "drying" | "flooring" | "both";
export type FloodType = "water" | "sewage";
export type FloodMethod = "rooms" | "area";
/** Ceiling / neighbor room dropdown value; "over5" == "מעל 5 חללים". */
export type RoomChoice = 1 | 2 | 3 | 4 | 5 | "over5";

export const WDC_CONFIG = {
  contact: {
    phoneDigits: "0778051266",
    phoneDisplay: "077-805-1266",
    // international format, no leading + / 0 — used for wa.me links
    whatsapp: "972502629120",
  },
  /** All monetary values in ₪. Change here to update the whole calculator. */
  prices: {
    dryingPerSqm: 550, // ייבוש תת-רצפתי, למ"ר (כולל מע"מ)
    flooringPerSqm: 1200, // החלפת ריצוף, למ"ר (כולל עבודות נלוות)
    ceilingPerRoom: 2000, // כתמי רטיבות בתקרה, לחלל (כולל מע"מ)
    neighborPerRoom: 1500, // נזילה מהשכן, לחלל
    floodPerRoomMin: 15000, // הצפה לפי חללים — מינימום לחלל
    floodPerRoomMax: 25000, // הצפה לפי חללים — מקסימום לחלל
  },
  /** Room count used when the user picks the "מעל 5 חללים" option (spec §5-6). */
  over5Rooms: {
    ceiling: 8,
    neighbor: 7,
  },
  disclaimer:
    "המידע והתוצאות המוצגים במחשבון מהווים אומדן ראשוני וגס בלבד. הערכת הנזק הסופית כרוכה בבדיקה מקצועית בשטח וכפופה לממצאי הבדיקה, לנסיבות המקרה ולתנאי הפוליסה הרלוונטית. המידע במחשבון אינו מהווה ייעוץ משפטי, ייעוץ שמאי או חוות דעת מקצועית, ואינו מהווה תחליף לייעוץ פרטני המותאם לנסיבות המקרה. לצורך בחינת הנזק, הכיסוי הביטוחי והזכויות הרלוונטיות, יש לקבל ייעוץ פרטני מאיש מקצוע מתאים.",
  resultNote: "מדובר בהערכת נזק גסה וראשונית בהתאם לנתונים שהוזנו.",
} as const;

/** Human-readable label for each damage type (used in results + lead payload). */
export const DAMAGE_TYPE_LABELS: Record<DamageTypeId, string> = {
  panels: "רטיבות מעל הפנלים",
  ceiling: "כתמי רטיבות בתקרה",
  neighbor: "נזילה מהשכן מלמעלה",
  flood: "הצפת מים מהדירה שלי",
};

export interface DamageTypeCard {
  id: DamageTypeId;
  title: string;
  description: string;
  /** icon key resolved to a lucide icon in the component */
  icon: "wall" | "ceiling" | "neighbor" | "flood";
}

export const DAMAGE_TYPE_CARDS: DamageTypeCard[] = [
  {
    id: "panels",
    title: "רטיבות מעל הפנלים",
    description: "בשליש התחתון של הקיר — עשוי להעיד על לחות או מים מתחת לריצוף.",
    icon: "wall",
  },
  {
    id: "ceiling",
    title: "כתמי רטיבות בתקרה",
    description: "כתמים או רטיבות המופיעים בתקרה של חלל אחד או יותר.",
    icon: "ceiling",
  },
  {
    id: "neighbor",
    title: "נזילה מהשכן מלמעלה",
    description: "בהנחה שהנזק ייתבע במסגרת הביטוח של השכן שמעליכם.",
    icon: "neighbor",
  },
  {
    id: "flood",
    title: "הצפת מים מהדירה שלי",
    description: "הצפת מים או ביוב מתוך הדירה, לפי מספר חללים או שטח.",
    icon: "flood",
  },
];

/** Numeric input value: a number, or "" while the field is empty. */
export type NumInput = number | "";

export interface CalcInput {
  damageType: DamageTypeId | null;
  // panels
  panelsMethod: PanelsMethod | null;
  panelsDryingSqm: NumInput;
  panelsFlooringSqm: NumInput;
  // ceiling / neighbor
  rooms: RoomChoice | null;
  // flood
  floodType: FloodType | null;
  floodMethod: FloodMethod | null;
  floodRooms: NumInput;
  floodDryingSqm: NumInput;
  floodFlooringSqm: NumInput;
}

export const EMPTY_INPUT: CalcInput = {
  damageType: null,
  panelsMethod: null,
  panelsDryingSqm: "",
  panelsFlooringSqm: "",
  rooms: null,
  floodType: null,
  floodMethod: null,
  floodRooms: "",
  floodDryingSqm: "",
  floodFlooringSqm: "",
};

export interface ResultLine {
  label: string;
  value: string;
}

export interface CalcResult {
  ok: boolean;
  isRange: boolean;
  /** point estimate (when isRange === false) */
  total?: number;
  /** range bounds (when isRange === true) */
  min?: number;
  max?: number;
  damageTypeLabel: string;
  /** flood sub-type label, when relevant */
  floodTypeLabel?: string;
  /** step-by-step breakdown shown in the result box */
  lines: ResultLine[];
  /** shown as an inline note next to neighbor results (indemnity values) */
  extraNote?: string;
}

/** Format a whole-shekel amount with a thousands separator and the ₪ sign. */
export function formatILS(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} ₪`;
}

function num(v: NumInput): number {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sqmLabel(v: number): string {
  return `${v.toLocaleString("en-US")} מ"ר`;
}

/**
 * Compute the estimate for the given input. Returns { ok: false } when the
 * input is incomplete/invalid — the caller gates the "calculate" button on
 * isInputComplete() so ok === false only reflects a genuinely empty state.
 */
export function calculate(input: CalcInput): CalcResult {
  const p = WDC_CONFIG.prices;
  switch (input.damageType) {
    case "panels":
      return calcPanels(input);
    case "ceiling": {
      const rooms = roomCount(input.rooms, WDC_CONFIG.over5Rooms.ceiling);
      if (!rooms) return notOk("ceiling");
      const total = rooms * p.ceilingPerRoom;
      return {
        ok: true,
        isRange: false,
        total,
        damageTypeLabel: DAMAGE_TYPE_LABELS.ceiling,
        lines: [
          { label: "שיטת חישוב", value: "לפי מספר חללים" },
          { label: "מספר חללים", value: roomsText(input.rooms, rooms) },
          { label: "מחיר בסיס", value: `${formatILS(p.ceilingPerRoom)} לחלל (כולל מע"מ)` },
          { label: "אופן החישוב", value: `${rooms} × ${formatILS(p.ceilingPerRoom)} = ${formatILS(total)}` },
        ],
      };
    }
    case "neighbor": {
      const rooms = roomCount(input.rooms, WDC_CONFIG.over5Rooms.neighbor);
      if (!rooms) return notOk("neighbor");
      const total = rooms * p.neighborPerRoom;
      return {
        ok: true,
        isRange: false,
        total,
        damageTypeLabel: DAMAGE_TYPE_LABELS.neighbor,
        lines: [
          { label: "שיטת חישוב", value: "לפי מספר חללים" },
          { label: "מספר חללים", value: roomsText(input.rooms, rooms) },
          { label: "מחיר בסיס", value: `${formatILS(p.neighborPerRoom)} לחלל` },
          { label: "אופן החישוב", value: `${rooms} × ${formatILS(p.neighborPerRoom)} = ${formatILS(total)}` },
        ],
        extraNote:
          "הסכום מבוסס על ערכי שיפוי משוערים, לאחר ניכוי בלאי/פחת, ובהנחה שהנזק נתבע במסגרת ביטוח השכן.",
      };
    }
    case "flood":
      return calcFlood(input);
    default:
      return notOk("panels");
  }
}

function calcPanels(input: CalcInput): CalcResult {
  const p = WDC_CONFIG.prices;
  const method = input.panelsMethod;
  const drying = num(input.panelsDryingSqm);
  const flooring = num(input.panelsFlooringSqm);
  const lines: ResultLine[] = [];
  let total = 0;

  const wantsDrying = method === "drying" || method === "both";
  const wantsFlooring = method === "flooring" || method === "both";

  if (wantsDrying) {
    if (drying <= 0) return notOk("panels");
    const sub = drying * p.dryingPerSqm;
    total += sub;
    lines.push({
      label: "ייבוש תת-רצפתי",
      value: `${sqmLabel(drying)} × ${formatILS(p.dryingPerSqm)} = ${formatILS(sub)}`,
    });
  }
  if (wantsFlooring) {
    if (flooring <= 0) return notOk("panels");
    const sub = flooring * p.flooringPerSqm;
    total += sub;
    lines.push({
      label: "החלפת ריצוף",
      value: `${sqmLabel(flooring)} × ${formatILS(p.flooringPerSqm)} = ${formatILS(sub)}`,
    });
  }
  if (!wantsDrying && !wantsFlooring) return notOk("panels");

  return {
    ok: true,
    isRange: false,
    total,
    damageTypeLabel: DAMAGE_TYPE_LABELS.panels,
    lines,
  };
}

function calcFlood(input: CalcInput): CalcResult {
  const p = WDC_CONFIG.prices;
  const floodTypeLabel = input.floodType === "sewage" ? "הצפת ביוב" : "הצפת מים";

  if (input.floodMethod === "rooms") {
    const rooms = num(input.floodRooms);
    if (rooms <= 0) return notOk("flood");
    const min = rooms * p.floodPerRoomMin;
    const max = rooms * p.floodPerRoomMax;
    return {
      ok: true,
      isRange: true,
      min,
      max,
      damageTypeLabel: DAMAGE_TYPE_LABELS.flood,
      floodTypeLabel,
      lines: [
        { label: "שיטת חישוב", value: "לפי מספר חללים" },
        { label: "מספר חללים", value: `${rooms}` },
        {
          label: "טווח לחלל",
          value: `${formatILS(p.floodPerRoomMin)}–${formatILS(p.floodPerRoomMax)}`,
        },
        {
          label: "אופן החישוב",
          value: `${rooms} × (${formatILS(p.floodPerRoomMin)}–${formatILS(p.floodPerRoomMax)}) = ${formatILS(min)}–${formatILS(max)}`,
        },
      ],
    };
  }

  if (input.floodMethod === "area") {
    const drying = num(input.floodDryingSqm);
    const flooring = num(input.floodFlooringSqm);
    const lines: ResultLine[] = [
      { label: "שיטת חישוב", value: 'לפי שטח במ"ר' },
    ];
    let total = 0;
    if (drying > 0) {
      const sub = drying * p.dryingPerSqm;
      total += sub;
      lines.push({
        label: "ייבוש תת-רצפתי",
        value: `${sqmLabel(drying)} × ${formatILS(p.dryingPerSqm)} = ${formatILS(sub)}`,
      });
    }
    if (flooring > 0) {
      const sub = flooring * p.flooringPerSqm;
      total += sub;
      lines.push({
        label: "החלפת ריצוף",
        value: `${sqmLabel(flooring)} × ${formatILS(p.flooringPerSqm)} = ${formatILS(sub)}`,
      });
    }
    if (total <= 0) return notOk("flood");
    return {
      ok: true,
      isRange: false,
      total,
      damageTypeLabel: DAMAGE_TYPE_LABELS.flood,
      floodTypeLabel,
      lines,
    };
  }

  return notOk("flood");
}

function roomCount(choice: RoomChoice | null, over5Value: number): number {
  if (choice == null) return 0;
  if (choice === "over5") return over5Value;
  return choice;
}

function roomsText(choice: RoomChoice | null, resolved: number): string {
  if (choice === "over5") return `מעל 5 (מחושב לפי ${resolved} חללים)`;
  return `${resolved}`;
}

function notOk(type: DamageTypeId): CalcResult {
  return {
    ok: false,
    isRange: false,
    damageTypeLabel: DAMAGE_TYPE_LABELS[type],
    lines: [],
  };
}

/** True when the input has everything needed to produce a valid estimate. */
export function isInputComplete(input: CalcInput): boolean {
  return calculate(input).ok;
}

/** Build the plain-text summary folded into the lead's `message` field. */
export function buildLeadSummary(result: CalcResult): string {
  const parts: string[] = [];
  parts.push(`סוג נזק: ${result.damageTypeLabel}`);
  if (result.floodTypeLabel) parts.push(`סוג הצפה: ${result.floodTypeLabel}`);
  for (const line of result.lines) parts.push(`${line.label}: ${line.value}`);
  parts.push(
    result.isRange
      ? `הערכת נזק משוערת: ${formatILS(result.min ?? 0)}–${formatILS(result.max ?? 0)}`
      : `הערכת נזק משוערת: ${formatILS(result.total ?? 0)}`,
  );
  return parts.join("\n");
}
