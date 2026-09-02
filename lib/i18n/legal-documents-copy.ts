import {
  LEGAL_DOCUMENTS,
  type LegalDocumentKey,
} from "@/lib/legal-documents";

import type { Locale } from "./locales";

export type LocalizedLegalDocument = {
  title: string;
  version: string;
  href: string;
  summary: string;
  sections: readonly {
    heading: string;
    paragraphs: readonly string[];
  }[];
};

type LegalDocumentCopy = Pick<
  LocalizedLegalDocument,
  "title" | "summary" | "sections"
>;

export type LegalPageCopy = {
  returnToSignup: string;
  eyebrow: string;
  versionLabel: string;
  effectiveLabel: string;
  questionsPrefix: string;
};

const legalPageCopy: Record<Locale, LegalPageCopy> = {
  "en-CA": {
    returnToSignup: "Return to signup",
    eyebrow: "Olea Connects™ legal document",
    versionLabel: "Version",
    effectiveLabel: "Effective",
    questionsPrefix: "Questions about this document? Email",
  },
  "fr-CA": {
    returnToSignup: "Retour à l'inscription",
    eyebrow: "Document juridique Olea Connects™",
    versionLabel: "Version",
    effectiveLabel: "En vigueur le",
    questionsPrefix: "Questions au sujet de ce document? Écrivez à",
  },
};

const frenchLegalDocuments: Record<LegalDocumentKey, LegalDocumentCopy> = {
  terms: {
    title: "Conditions d'utilisation",
    summary:
      "Ces conditions décrivent l'accès des membres, la facturation, les renouvellements, les annulations et l'utilisation acceptable d'Olea Connects™.",
    sections: [
      {
        heading: "1. Le service",
        paragraphs: [
          "Olea Connects™ fournit aux organismes abonnés des outils de gouvernance, des modèles aux couleurs de leur marque, des ressources communautaires, des webinaires, des flux de consultation et des services connexes.",
          "Votre organisme peut utiliser le service uniquement par l'intermédiaire de comptes autorisés et selon le forfait, les limites de sièges et les permissions d'accès liés à son abonnement.",
        ],
      },
      {
        heading: "2. Comptes et utilisation acceptable",
        paragraphs: [
          "Vous êtes responsable de garder vos identifiants confidentiels, de maintenir des renseignements de compte exacts et de nous aviser rapidement si vous soupçonnez un accès non autorisé.",
          "Vous ne devez pas utiliser Olea Connects™ pour enfreindre la loi, perturber le service, contourner les contrôles d'accès, téléverser du code malveillant ou soumettre du contenu que vous n'avez pas le droit de partager.",
        ],
      },
      {
        heading: "3. Facturation et annulation",
        paragraphs: [
          "Les frais d'adhésion sont facturés à l'avance selon la cadence de facturation choisie. Les taxes applicables sont calculées au paiement. Les changements d'abonnement, les renouvellements et les frais de sièges sont affichés avant confirmation lorsque cela s'applique.",
          "Vous pouvez annuler en tout temps. Sauf indication contraire dans une entente écrite, l'annulation prend effet à la fin de la période payée en cours et ne supprime pas les obligations déjà engagées.",
        ],
      },
      {
        heading: "4. Changements au service et soutien",
        paragraphs: [
          "Nous pouvons améliorer, modifier ou suspendre temporairement certaines parties du service afin d'en maintenir la sécurité, la fiabilité ou la qualité. Nous ferons des efforts raisonnables pour communiquer les changements importants.",
          "Les questions au sujet d'un compte ou d'un abonnement peuvent être envoyées à hello@olivesocialimpact.com.",
        ],
      },
    ],
  },
  privacy: {
    title: "Politique de confidentialité",
    summary:
      "Cette politique explique quels renseignements personnels Olea Connects™ recueille, pourquoi ils sont utilisés et comment ils sont protégés.",
    sections: [
      {
        heading: "1. Renseignements que nous recueillons",
        paragraphs: [
          "Nous recueillons les coordonnées de compte et de contact, les renseignements sur l'organisme, les dossiers d'abonnement et de facturation, le contenu soumis au service, les demandes de soutien et les renseignements techniques nécessaires au fonctionnement et à la sécurité de la plateforme.",
          "Les détails des cartes de paiement sont traités par notre fournisseur de paiement hébergé. Olea Connects™ reçoit les renseignements de paiement et d'abonnement nécessaires pour gérer l'accès et la facturation, mais pas le numéro complet de la carte ni le code de sécurité.",
        ],
      },
      {
        heading: "2. Comment nous utilisons les renseignements",
        paragraphs: [
          "Nous utilisons les renseignements pour fournir et personnaliser le service, authentifier les utilisateurs, traiter les abonnements, livrer les notifications, soutenir les membres, prévenir les abus, améliorer la fiabilité et respecter nos obligations légales et de sécurité.",
          "Nous ne vendons pas le contenu des membres ni les renseignements personnels. Nous pouvons faire appel à des fournisseurs de confiance pour l'hébergement, l'authentification, le traitement des paiements, l'envoi de courriels, l'analytique et le soutien opérationnel, avec des protections appropriées.",
        ],
      },
      {
        heading: "3. Conservation et protection",
        paragraphs: [
          "Nous conservons les renseignements aussi longtemps que nécessaire pour fournir le service, résoudre les différends, maintenir la sécurité, respecter les exigences légales et faire appliquer les ententes. Les périodes de conservation peuvent varier selon le type de renseignement.",
          "Nous utilisons des contrôles d'accès, le chiffrement en transit, l'accès aux services selon le principe du moindre privilège, la surveillance et d'autres protections raisonnables. Aucun service Internet ne peut garantir une sécurité absolue.",
        ],
      },
      {
        heading: "4. Vos choix",
        paragraphs: [
          "Vous pouvez écrire à hello@olivesocialimpact.com pour demander l'accès, la correction, la suppression ou poser des questions sur l'utilisation de vos renseignements. Nous pourrions devoir vérifier la demande et conserver certains dossiers requis pour des raisons légales ou de sécurité.",
        ],
      },
    ],
  },
  dataOwnership: {
    title: "Entente sur la propriété des données",
    summary:
      "Cette entente confirme que les organismes membres conservent la propriété du contenu et des dossiers qu'ils placent dans la plateforme.",
    sections: [
      {
        heading: "1. Le contenu de votre organisme",
        paragraphs: [
          "Votre organisme possède les documents, publications, calendriers, indicateurs, documents de réunion, demandes de consultation et autres contenus qu'il soumet à Olea Connects™.",
          "Vous êtes responsable de vous assurer que votre organisme possède les droits et permissions nécessaires pour téléverser, stocker et partager ce contenu avec les personnes que vous autorisez.",
        ],
      },
      {
        heading: "2. Licence limitée pour le service",
        paragraphs: [
          "Vous accordez à Olea Connects™ un droit limité et non exclusif d'héberger, sécuriser, sauvegarder, afficher, transformer et traiter votre contenu uniquement dans la mesure nécessaire pour fournir, maintenir et améliorer le service.",
          "Cette permission prend fin lorsque le contenu est supprimé ou que la relation de service se termine, sauf lorsque le traitement ou la conservation est requis pour la sécurité, la loi, l'audit, les sauvegardes ou la résolution de différends.",
        ],
      },
      {
        heading: "3. Exports et suppression",
        paragraphs: [
          "Les demandes d'exportation et de conservation sont traitées selon l'abonnement, les flux de produit documentés et les exigences légales applicables. Les fichiers générés peuvent être soumis à des contrôles distincts de nettoyage et de conservation.",
          "Nous ne revendiquons pas la propriété du contenu de votre organisme et nous ne le vendons pas à des tiers.",
        ],
      },
    ],
  },
  confidentiality: {
    title: "Politique de confidentialité des renseignements",
    summary:
      "Cette politique établit les attentes pour protéger les documents du conseil, les renseignements des membres et les autres contenus organisationnels sensibles.",
    sections: [
      {
        heading: "1. Renseignements confidentiels",
        paragraphs: [
          "Les renseignements confidentiels comprennent les documents du conseil, les renseignements personnels, les renseignements financiers, les plans non publiés, les identifiants, les demandes de consultation et tout autre contenu organisationnel non public partagé par Olea Connects™.",
        ],
      },
      {
        heading: "2. Responsabilités des membres",
        paragraphs: [
          "Les membres doivent utiliser les renseignements confidentiels uniquement à des fins organisationnelles autorisées, les partager seulement avec les personnes qui ont besoin d'y accéder et protéger leurs identifiants ainsi que les documents téléchargés.",
          "Ne téléversez pas de renseignements que vous n'êtes pas autorisé à partager. Retirez rapidement l'accès lorsqu'une personne n'en a plus besoin et signalez sans délai tout accès non autorisé soupçonné.",
        ],
      },
      {
        heading: "3. Responsabilités d'Olea Connects™",
        paragraphs: [
          "Le personnel et les fournisseurs de services d'Olea Connects™ peuvent accéder au contenu confidentiel uniquement lorsque cela est nécessaire pour exploiter, sécuriser, maintenir ou soutenir le service. L'accès est assujetti à des obligations appropriées de confidentialité et de sécurité.",
          "Nous pouvons divulguer des renseignements lorsque la loi, une procédure légale ou un besoin urgent de protéger les utilisateurs, le service ou le public l'exige, tout en prenant des mesures raisonnables pour limiter la divulgation.",
        ],
      },
      {
        heading: "4. Signaler une préoccupation",
        paragraphs: [
          "Signalez rapidement tout accès non autorisé soupçonné, divulgation accidentelle ou préoccupation de sécurité à hello@olivesocialimpact.com afin que nous puissions enquêter et répondre.",
        ],
      },
    ],
  },
};

export function getLegalPageCopy(locale: Locale) {
  return legalPageCopy[locale];
}

export function getLegalDocumentCopy(
  documentKey: LegalDocumentKey,
  locale: Locale,
): LocalizedLegalDocument {
  const document = LEGAL_DOCUMENTS[documentKey];

  if (locale === "en-CA") return document;

  return {
    ...document,
    ...frenchLegalDocuments[documentKey],
  };
}
