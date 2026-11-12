// French-Canadian translation of the final respondent-facing HTML content.
// Section and question positions match prototype-content.ts for stable IDs.
export const annualSurveySectionsFr = [
  { name: "Mission, vision et orientation stratégique", prompt: "Dans quelle mesure le conseil comprend-il et fait-il progresser la mission et les objectifs à long terme de l’organisme?", qs: [
    "Je peux expliquer clairement la mission et la vision de notre organisme.",
    "Le conseil revoit régulièrement la mission pour s’assurer qu’elle demeure pertinente et porteuse d’impact.",
    "Le conseil contribue de façon significative à la planification stratégique.",
    "Le conseil suit les progrès vers les objectifs stratégiques à chaque réunion.",
    "Le conseil évalue efficacement les changements dans son environnement et y réagit.",
  ] },
  { name: "Gouvernance et structure du conseil", prompt: "Dans quelle mesure le conseil est-il bien organisé et remplit-il son rôle de gouvernance?", qs: [
    "Les rôles et responsabilités du conseil sont clairement définis.",
    "Les membres distinguent la gouvernance de la gestion.",
    "Le conseil agit conformément à ses règlements et documents constitutifs.",
    "Les réunions du conseil sont bien organisées et utilisent efficacement le temps disponible.",
    "La présidence du conseil exerce un leadership efficace.",
  ] },
  { name: "Surveillance financière", prompt: "Dans quelle mesure le conseil assume-t-il ses responsabilités de surveillance financière et de reddition de comptes?", qs: [
    "Je reçois des rapports financiers clairs, exacts et à jour.",
    "Je possède les connaissances financières nécessaires pour comprendre les états financiers de l’organisme.",
    "Le conseil surveille activement la santé financière de l’organisme tout au long de l’année.",
    "Le conseil veille à la mise en place de contrôles financiers et de processus d’audit appropriés.",
    "Le conseil comprend et approuve les décisions financières et les dépenses importantes.",
  ] },
  { name: "Relation avec la direction générale", prompt: "Dans quelle mesure le conseil soutient-il la direction générale et collabore-t-il avec elle?", qs: [
    "Le conseil donne à la direction générale une orientation et un soutien clairs.",
    "Le conseil réalise une évaluation du rendement de la direction générale juste, transparente et en temps opportun.",
    "La direction générale fournit au conseil des renseignements suffisants et utiles entre les réunions.",
    "La relation entre le conseil et la direction générale est collaborative et respectueuse.",
    "Le conseil délègue de façon appropriée l’autorité opérationnelle à la direction générale.",
  ] },
  { name: "Composition et recrutement du conseil", prompt: "Dans quelle mesure le conseil recrute-t-il, renouvelle-t-il et soutient-il ses membres?", qs: [
    "Le conseil réunit les compétences, l’expérience et les points de vue nécessaires à une gouvernance efficace.",
    "Le conseil repère et comble de façon proactive les lacunes dans sa composition.",
    "Le conseil dispose d’un processus clair et efficace pour recruter et accueillir de nouveaux membres.",
    "Le conseil reflète la diversité des communautés qu’il sert.",
    "Le conseil favorise activement l’équité, la diversité et l’inclusion dans ses pratiques de gouvernance.",
  ] },
  { name: "Engagement individuel des membres", prompt: "Réfléchissez honnêtement à votre propre participation et contribution au conseil.", qs: [
    "J’assiste régulièrement aux réunions du conseil et des comités.",
    "J’arrive aux réunions préparé, après avoir examiné les documents à l’avance.",
    "Je participe activement aux discussions et aux délibérations du conseil.",
    "Je respecte les engagements que je prends comme membre du conseil.",
    "Je trouve ma participation au conseil utile et porteuse d’impact.",
  ] },
  { name: "Collecte de fonds et développement des ressources", prompt: "Dans quelle mesure le conseil contribue-t-il à obtenir des ressources pour l’organisme?", qs: [
    "Le conseil comprend son rôle dans la collecte de fonds et le développement des ressources.",
    "Les membres du conseil participent aux activités de collecte de fonds.",
    "Le conseil examine et suit régulièrement les résultats de collecte de fonds.",
    "Je suis à l’aise de demander à d’autres personnes de soutenir financièrement l’organisme.",
  ] },
  { name: "Gestion des risques et conformité légale", prompt: "Dans quelle mesure le conseil protège-t-il l’organisme et veille-t-il à sa conformité légale?", qs: [
    "Le conseil a examiné et comprend les principaux risques de l’organisme.",
    "Le conseil examine et surveille le respect des lois et règlements applicables.",
    "Les membres du conseil déclarent chaque année leurs conflits d’intérêts potentiels.",
    "Le conseil reconnaît les préoccupations éthiques et y répond lorsqu’elles surviennent.",
  ] },
  { name: "Relations communautaires et représentation", prompt: "Dans quelle mesure le conseil fait-il rayonner la réputation et la mission de l’organisme?", qs: [
    "Les membres du conseil font activement connaître l’organisme dans la communauté.",
    "Le conseil connaît les principales parties prenantes et les communautés servies par l’organisme.",
    "Les membres du conseil défendent efficacement la mission de l’organisme.",
  ] },
  { name: "Équité, inclusion et culture organisationnelle", prompt: "Dans quelle mesure le conseil s’engage-t-il envers l’équité et une gouvernance inclusive?", qs: [
    "La culture du conseil est accueillante et inclusive pour tous les membres.",
    "Le conseil demande à l’organisme de rendre compte de ses politiques et pratiques équitables.",
    "Le conseil veille à ce que les voix des personnes les plus touchées par sa mission soient représentées dans la gouvernance.",
  ] },
] as const;

export const annualOpenQuestionsFr = [
  "Qu’est-ce que le conseil fait particulièrement bien et devrait continuer à faire?",
  "Quel est le domaine le plus important que le conseil doit améliorer?",
  "Quelles ressources, formations ou formes de soutien vous aideraient à être un membre plus efficace?",
  "Souhaitez-vous ajouter quelque chose au sujet de la gouvernance du conseil cette année?",
] as const;

export const meetingSurveyGroupsFr = [
  { name: "Efficacité de la réunion", qs: [
    "Comment évalueriez-vous l’efficacité globale de la réunion d’aujourd’hui?",
    "Dans quelle mesure avons-nous bien utilisé notre temps aujourd’hui?",
    "Dans quelle mesure étiez-vous préparé pour la réunion d’aujourd’hui?",
  ] },
  { name: "Prise de décision et discussion", qs: [
    "Comment évalueriez-vous la qualité des discussions du conseil aujourd’hui?",
    "Dans quelle mesure avez-vous confiance dans les décisions prises aujourd’hui?",
  ] },
  { name: "Participation et inclusion", qs: [
    "Dans quelle mesure vous êtes-vous senti engagé pendant la réunion d’aujourd’hui?",
    "Dans quelle mesure vous êtes-vous senti à l’aise de soulever des questions ou des préoccupations aujourd’hui?",
  ] },
] as const;
