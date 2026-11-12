import { annualSurveySections, questionBankCategories } from "./prototype-content";
import { annualSurveySectionsFr } from "./prototype-content-fr";

const defaultRated = new Map<string, string>(annualSurveySections.flatMap((section, sectionIndex) =>
  section.qs.map((question, index) => [question, annualSurveySectionsFr[sectionIndex].qs[index]] as const)));

const ratedExtra: Record<number, string> = {
  4: "Je comprends les priorités stratégiques actuelles de l’organisme.",
  7: "Le conseil anticipe les défis et les possibilités à venir.",
  8: "Je suis convaincu que notre plan stratégique guide les décisions du conseil.",
  12: "Les politiques et procédures du conseil sont à jour et appliquées de façon constante.",
  13: "Le conseil dispose de comités appropriés pour accomplir son travail.",
  14: "Le travail des comités est utile et lié aux priorités de l’ensemble du conseil.",
  16: "Le conseil procède régulièrement à sa propre autoévaluation.",
  18: "Le conseil dispose d’un plan de relève clair et fonctionnel pour sa direction.",
  21: "Le conseil examine et approuve un budget annuel aligné sur les priorités stratégiques.",
  23: "Le conseil comprend et revoit régulièrement les politiques de réserves de l’organisme.",
  25: "Le conseil participe de manière appropriée à la collecte de fonds et au développement des ressources.",
  27: "Je suis à l’aise de soulever des questions ou préoccupations financières en réunion.",
  28: "Le conseil revoit et met régulièrement à jour sa politique de placement, s’il y a lieu.",
  29: "Le conseil partage une compréhension claire du rôle et des responsabilités de la direction générale.",
  32: "Le conseil établit des attentes de rendement appropriées avec la direction générale.",
  36: "Le conseil dispose d’un plan de relève pour la direction générale.",
  37: "Le conseil veille à offrir à la direction générale une rémunération concurrentielle et appropriée.",
  38: "Je suis à l’aise de parler du rendement de l’organisme avec la direction générale.",
  41: "Le conseil dispose d’un processus clair et efficace pour recruter de nouveaux membres.",
  42: "Les nouveaux membres du conseil reçoivent une orientation et un accueil adéquats.",
  45: "Les mandats et leurs limites contribuent efficacement au renouvellement du conseil.",
  46: "Je contribue activement à repérer de futurs membres du conseil.",
  50: "Je mets mes compétences et mon expertise au service du conseil.",
  51: "Je respecte mes engagements comme membre du conseil, notamment dans les comités, la collecte de fonds et la représentation.",
  52: "Je représente l’organisme dans ma communauté et mon réseau professionnel.",
  53: "J’ai fait une contribution financière personnelle à l’organisme cette année.",
  54: "Je comprends et assume mes obligations fiduciaires comme membre du conseil.",
  56: "Je recommanderais à d’autres personnes de siéger à ce conseil.",
  58: "Le conseil a approuvé un plan ou une stratégie de développement des ressources.",
  60: "Le conseil ouvre des portes et facilite des présentations qui appuient la collecte de fonds.",
  62: "Le conseil favorise une solide culture philanthropique dans l’organisme.",
  64: "Le conseil participe activement à la préparation ou au soutien des grandes activités et campagnes de financement.",
  67: "Le conseil veille à ce que les programmes de l’organisme répondent aux besoins de la communauté.",
  68: "Le conseil est prêt à prendre publiquement position sur des enjeux liés à la mission de l’organisme.",
  69: "Je parle régulièrement de l’organisme en termes positifs dans mon réseau.",
  70: "Le conseil surveille la réputation et l’image publique de l’organisme.",
  73: "Le conseil veille à ce que l’organisme dispose d’une couverture d’assurance appropriée.",
  75: "Le conseil a examiné et approuvé une politique sur les conflits d’intérêts.",
  77: "Le conseil a examiné et approuvé des politiques sur la dénonciation et la conservation des documents.",
  79: "L’organisme a examiné ses pratiques de protection des données et de cybersécurité.",
  80: "Le conseil s’est formé aux pratiques d’équité, de diversité et d’inclusion.",
  81: "Le conseil travaille activement à une participation équitable aux délibérations.",
  84: "Le conseil examine ses propres pratiques sous l’angle de l’équité.",
  86: "Je sens que je peux participer pleinement et authentiquement au conseil.",
};

const bankCategoryToAnnual = [0, 1, 2, 3, 4, 5, 6, 8, 7, 9] as const;

export const ratedBankFr = questionBankCategories.flatMap((category, categoryIndex) => {
  const localized = annualSurveySectionsFr[bankCategoryToAnnual[categoryIndex]];
  return category.qs.map(([number, english]) => ({
    id: `b${number}`,
    text: ratedExtra[number] ?? defaultRated.get(english) ?? english,
    category: localized.name,
    prompt: localized.prompt,
  }));
});

export const openBankFr = [
  "Qu’est-ce que le conseil fait particulièrement bien et devrait continuer à faire?",
  "Quel est le domaine le plus important que le conseil doit améliorer?",
  "Quelles ressources, formations ou formes de soutien vous aideraient à être un membre plus efficace?",
  "Y a-t-il un sujet que le conseil devrait aborder mais qu’il ne traite pas actuellement?",
  "Quel changement améliorerait le plus l’efficacité de nos réunions du conseil?",
  "Souhaitez-vous ajouter quelque chose sur l’état de la gouvernance du conseil?",
  "De quelle réalisation du conseil êtes-vous le plus fier cette année?",
  "Sur quel sujet aimeriez-vous avoir plus de clarté comme membre du conseil?",
].map((text, index) => ({ id: `o${index + 1}`, text }));

export const meetingBankFr = [
  ["m1", "Comment évalueriez-vous l’efficacité globale de la réunion d’aujourd’hui?"],
  ["m2", "Dans quelle mesure avons-nous bien utilisé notre temps aujourd’hui?"],
  ["m3", "Dans quelle mesure étiez-vous préparé pour la réunion d’aujourd’hui?"],
  ["m4", "Les documents transmis avant la réunion étaient-ils clairs?"],
  ["m5", "Êtes-vous satisfait du temps consacré à chaque point de l’ordre du jour?"],
  ["m6", "Comment évalueriez-vous la qualité des discussions du conseil aujourd’hui?"],
  ["m7", "Avez-vous le sentiment que tous les points de vue pertinents ont été entendus aujourd’hui?"],
  ["m8", "Dans quelle mesure avez-vous confiance dans les décisions prises aujourd’hui?"],
  ["m9", "Les décisions et prochaines étapes convenues aujourd’hui étaient-elles claires?"],
  ["m10", "Dans quelle mesure le conseil est-il resté concentré sur les questions stratégiques plutôt qu’opérationnelles?"],
  ["m11", "Dans quelle mesure vous êtes-vous senti engagé pendant la réunion d’aujourd’hui?"],
  ["m12", "Dans quelle mesure vous êtes-vous senti inclus dans les discussions d’aujourd’hui?"],
  ["m13", "Dans quelle mesure vous êtes-vous senti à l’aise de soulever des questions ou des préoccupations aujourd’hui?"],
  ["m14", "La réunion d’aujourd’hui était-elle accessible et accueillante?"],
  ["m15", "Dans quelle mesure les renseignements partagés aujourd’hui par le personnel et la direction ont-ils été utiles?"],
  ["m16", "Les mises à jour financières ou sur les programmes ont-elles été présentées clairement aujourd’hui?"],
  ["m17", "Aviez-vous assez d’informations de contexte pour participer pleinement?"],
] as const;

export const meetingCategoryFr: Record<string, string> = {
  "Meeting Effectiveness": "Efficacité de la réunion",
  "Decision-Making & Discussion Quality": "Prise de décision et qualité des discussions",
  "Engagement & Inclusion": "Participation et inclusion",
  "Information & Reporting": "Information et rapports",
};

export const meetingOpenBankFr = [
  "Quelle chose pourrions-nous faire autrement à notre prochaine réunion?",
  "Quelle a été la partie la plus utile de la réunion d’aujourd’hui?",
  "Y a-t-il un sujet non traité aujourd’hui qui devrait être prioritaire la prochaine fois?",
  "Que pourraient faire la présidence ou le personnel pour rendre la prochaine réunion plus productive?",
].map((text, index) => ({ id: `mo${index + 1}`, text }));
