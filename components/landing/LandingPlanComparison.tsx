import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { Locale } from "@/lib/i18n/locales";
import type { PublicSiteCopy } from "@/lib/i18n/public-site-copy";
import { fixedPriceOffers, formatCad } from "@/lib/pricing";

type PricingCopy = PublicSiteCopy["pricing"];
type AddOnId = PricingCopy["addOns"][number]["id"];
type Availability = "included" | "unavailable" | AddOnId;

const features: Array<{ id: AddOnId; availability: [Availability, Availability, Availability] }> = [
  { id: "boardRecruitment", availability: ["boardRecruitment", "included", "included"] },
  { id: "kpiDashboard", availability: ["kpiDashboard", "included", "included"] },
  { id: "boardEvaluation", availability: ["boardEvaluation", "included", "included"] },
  { id: "ceoReview", availability: ["ceoReview", "ceoReview", "included"] },
  { id: "strategicPlanning", availability: ["strategicPlanning", "strategicPlanning", "included"] },
  { id: "boardTraining", availability: ["boardTraining", "boardTraining", "included"] },
  { id: "smallBoardTraining", availability: ["smallBoardTraining", "unavailable", "unavailable"] },
  { id: "accreditationPrep", availability: ["accreditationPrep", "accreditationPrep", "accreditationPrep"] },
];

const labels = {
  "en-CA": {
    title: "Compare plans and optional modules",
    description: "Annual add-on prices are shown for plans where a module is optional. Contact us to arrange an add-on.",
    feature: "Feature",
    seats: "Included seats",
    core: "Board calendar, grant tools, webinars and community",
    included: "Included",
    notAvailable: "—",
    addOn: "Add-on",
    perYear: "year",
  },
  "fr-CA": {
    title: "Comparer les forfaits et les modules optionnels",
    description: "Les prix annuels des modules optionnels sont affichés pour les forfaits concernés. Communiquez avec nous pour les ajouter.",
    feature: "Fonctionnalité",
    seats: "Sièges inclus",
    core: "Calendrier du conseil, outils de subvention, webinaires et communauté",
    included: "Inclus",
    notAvailable: "—",
    addOn: "Option",
    perYear: "an",
  },
} as const;

export function LandingPlanComparison({ copy, locale }: { copy: PricingCopy; locale: Locale }) {
  const label = labels[locale];
  const renderAvailability = (availability: Availability) => {
    if (availability === "included") return label.included;
    if (availability === "unavailable") return <span aria-label={locale === "fr-CA" ? "Non offert" : "Not available"}>{label.notAvailable}</span>;
    return `${label.addOn} ${formatCad(fixedPriceOffers[availability].amount, locale)}/${label.perYear}`;
  };

  return (
    <section aria-labelledby="comparison-title" className="mt-14">
      <h3 id="comparison-title" className="text-center text-2xl font-bold text-olea-dark sm:text-3xl">{label.title}</h3>
      <p className="mx-auto mt-3 max-w-2xl text-center text-sm leading-6 text-slate-600">{label.description}</p>
      <div className="mt-7 rounded-2xl border bg-white">
        <Table className="min-w-[700px]">
          <TableHeader>
            <TableRow>
              <TableHead scope="col" className="w-[36%]">{label.feature}</TableHead>
              {(["seedling", "roots", "canopy"] as const).map((tier) => (
                <TableHead scope="col" key={tier}>{copy.plans[tier].name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow>
              <TableHead scope="row" className="normal-case tracking-normal text-slate-800">{label.seats}</TableHead>
              {[5, 10, 15].map((seats) => <TableCell key={seats}>{seats}</TableCell>)}
            </TableRow>
            <TableRow>
              <TableHead scope="row" className="normal-case tracking-normal text-slate-800">{label.core}</TableHead>
              {[0, 1, 2].map((tier) => <TableCell key={tier}>{label.included}</TableCell>)}
            </TableRow>
            {features.map((feature) => (
              <TableRow key={feature.id}>
                <TableHead scope="row" className="normal-case tracking-normal text-slate-800">{copy.addOns.find((item) => item.id === feature.id)?.name}</TableHead>
                {feature.availability.map((availability, index) => (
                  <TableCell key={index} className="text-xs font-medium text-slate-700 sm:text-sm">{renderAvailability(availability)}</TableCell>
                ))}
              </TableRow>
            ))}
            <TableRow>
              <TableHead scope="row" className="normal-case tracking-normal text-slate-800">{locale === "fr-CA" ? "Siège supplémentaire" : "Additional seat"}</TableHead>
              {[0, 1, 2].map((tier) => <TableCell key={tier}>{formatCad(15, locale)} {locale === "fr-CA" ? "une fois" : "one-time"}</TableCell>)}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </section>
  );
}
