import { createFileRoute } from "@tanstack/react-router";
import { WaterDamageCalculator } from "@/components/WaterDamageCalculator";

const TITLE = "מחשבון להערכת נזקי מים | רפאל שמאות רכוש";
const DESCRIPTION =
  "מחשבון להערכת נזקי מים ראשונית ומהירה: רטיבות בקיר, כתמים בתקרה, נזילה מהשכן או הצפה. קבלו הערכת נזק משוערת בהתאם לסוג הנזק ולהיקפו.";
const CANONICAL = "https://www.rrshamaut.co.il/water-damage-calculator";

export const Route = createFileRoute("/water-damage-calculator")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { property: "og:url", content: CANONICAL },
      { name: "twitter:card", content: "summary" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: CANONICAL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebApplication",
          name: "מחשבון להערכת נזקי מים",
          url: CANONICAL,
          applicationCategory: "BusinessApplication",
          operatingSystem: "Web",
          inLanguage: "he-IL",
          description: DESCRIPTION,
          offers: { "@type": "Offer", price: "0", priceCurrency: "ILS" },
          provider: {
            "@type": "ProfessionalService",
            name: "רפאל שמאות רכוש",
            url: "https://www.rrshamaut.co.il/",
            telephone: "+972-77-805-1266",
          },
        }),
      },
    ],
  }),
  component: WaterDamageCalculatorPage,
});

function WaterDamageCalculatorPage() {
  return (
    <main className="bg-gray-50 py-10">
      <WaterDamageCalculator />
    </main>
  );
}
