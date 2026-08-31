import type {
  ACQUISITION_SOURCES,
  ANNUAL_BUDGET_RANGES,
  BOARD_SIZE_RANGES,
  ORGANIZATION_KINDS,
} from "@/lib/signup-flow";

import type { Locale } from "./locales";

type OptionCopy<T extends readonly string[]> = Record<T[number], string>;

export type AuthFlowCopy = {
  shared: {
    backToLogin: string;
    emailAddress: string;
    hidePassword: string;
    showPassword: string;
  };
  signup: {
    step: (current: number, total: number) => string;
    plan: {
      title: string;
      description: string;
      quarterly: string;
      annual: string;
      bestValue: string;
      foundingEligibility: string;
      selected: string;
      selectPlan: string;
      policyNote: string;
      continueWith: (planName: string) => string;
    };
    account: {
      title: string;
      description: string;
      organizationName: string;
      fullName: string;
      organizationKind: string;
      organizationKindPlaceholder: string;
      boardSize: string;
      boardSizePlaceholder: string;
      annualBudget: string;
      annualBudgetPlaceholder: string;
      annualBudgetHelp: string;
      phone: string;
      phonePlaceholder: string;
      phoneHelp: string;
      acquisitionSource: string;
      acquisitionSourcePlaceholder: string;
      referralCode: string;
      referralCodePlaceholder: string;
      referralCodeHelp: string;
      password: string;
      passwordHelp: string;
      continueToPayment: string;
      backToPlan: string;
      organizationKinds: OptionCopy<typeof ORGANIZATION_KINDS>;
      boardSizes: OptionCopy<typeof BOARD_SIZE_RANGES>;
      annualBudgets: OptionCopy<typeof ANNUAL_BUDGET_RANGES>;
      acquisitionSources: OptionCopy<typeof ACQUISITION_SOURCES>;
    };
    payment: {
      title: string;
      description: string;
      secureCheckout: string;
      paymentSecureTitle: string;
      paymentSecureDescription: string;
      billingProvince: string;
      provincePlaceholder: string;
      legalTitle: string;
      legalDocuments: {
        confidentiality: string;
        dataOwnership: string;
        privacy: string;
        terms: string;
      };
      organization: string;
      plan: string;
      billing: string;
      includedSeats: string;
      billingCycle: Record<"annual" | "quarterly", string>;
      consentPrefix: string;
      consentVersion: (version: string) => string;
      continuePending: string;
      continueToCheckout: string;
      secureCheckoutLabel: string;
      orderSummary: string;
      billingSummary: (cycle: "annual" | "quarterly") => string;
      membershipStarts: string;
      membershipDescription: string;
      renewalNotice: string;
      canadianDollars: string;
      foundingEligibility: string;
      canceled: string;
      consentError: string;
      errors: {
        accountState: string;
        checkoutRateLimited: string;
        checkoutUnavailable: string;
        signupValidation: string;
      };
      fallbackError: string;
    };
    success: {
      titles: {
        failed: string;
        completed: string;
        received: string;
      };
      descriptions: {
        failed: string;
        completed: string;
        received: string;
      };
      messages: {
        failed: string;
        completed: string;
        pendingVerification: string;
        pending: string;
      };
      goToDashboard: string;
      continueToSignIn: string;
      finalizeError: string;
    };
  };
  login: {
    title: string;
    password: string;
    forgotPassword: string;
    paymentVerifyMessage: string;
    paymentSuccessMessage: string;
    fallbackError: string;
    remember: string;
    pending: string;
    submit: string;
    noAccount: string;
    signUp: string;
  };
  resetPassword: {
    title: string;
    sentTitle: string;
    description: string;
    sentDescription: (email: string) => string;
    sendAnother: string;
    pending: string;
    submit: string;
    fallbackError: string;
  };
  verifyEmail: {
    title: string;
    description: (email: string) => string;
    fallbackEmail: string;
    paymentMessage: string;
    defaultMessage: string;
    returnMessage: string;
    sentMessage: string;
    fallbackError: string;
    resendIn: (seconds: number) => string;
    resend: string;
  };
  updatePassword: {
    title: string;
    description: string;
    newPassword: string;
    confirmPassword: string;
    mismatch: string;
    pending: string;
    submit: string;
    fallbackError: string;
  };
  activationRetry: {
    confirmEmail: string;
    pendingPayment: string;
    processing: string;
    fallbackError: string;
    pending: string;
    submit: string;
  };
  invitation: {
    unavailableTitle: string;
    unavailableDescription: string;
    goToSignIn: string;
    acceptedTitle: string;
    joinTitle: string;
    acceptedDescription: string;
    sentTo: (email: string) => string;
    fallbackAcceptError: string;
    fullNameRequired: string;
    passwordTooShort: string;
    createAccountError: string;
    accountExists: string;
    continueToDashboard: string;
    confirmEmailTitle: string;
    confirmEmailDescription: string;
    fullName: string;
    invitedEmail: string;
    invitedEmailHelp: string;
    createPassword: string;
    passwordHelp: string;
    createPending: string;
    createSubmit: string;
    alreadyHaveAccount: string;
    signIn: string;
    wrongAccount: (email: string) => string;
    acceptPending: string;
    acceptSubmit: string;
  };
};

export const authFlowCopy: Record<Locale, AuthFlowCopy> = {
  "en-CA": {
    shared: {
      backToLogin: "Back to login",
      emailAddress: "Email address",
      hidePassword: "Hide password",
      showPassword: "Show password",
    },
    signup: {
      step: (current, total) => `Step ${current} of ${total}`,
      plan: {
        title: "Choose your plan",
        description: "Choose the support that fits your organization.",
        quarterly: "Quarterly",
        annual: "Annual",
        bestValue: "best value",
        foundingEligibility:
          "Founding-member eligibility is confirmed securely before payment.",
        selected: "Selected",
        selectPlan: "Select plan",
        policyNote:
          "Prices are shown before tax; GST/PST is calculated at secure checkout.",
        continueWith: (planName) => `Continue with ${planName}`,
      },
      account: {
        title: "Create your account",
        description: "Your organization workspace starts here.",
        organizationName: "Organization name *",
        fullName: "Your name *",
        organizationKind: "Organization type *",
        organizationKindPlaceholder: "Select type",
        boardSize: "Approximate board size *",
        boardSizePlaceholder: "Select size",
        annualBudget: "Annual organizational budget *",
        annualBudgetPlaceholder: "Select budget range",
        annualBudgetHelp: "This helps us recommend the right level of support.",
        phone: "Phone number",
        phonePlaceholder: "(555) 123-4567",
        phoneHelp:
          "Optional; numbers, spaces, parentheses, hyphens, and a leading + only.",
        acquisitionSource: "How did you hear about us?",
        acquisitionSourcePlaceholder: "Select source",
        referralCode: "Referral code",
        referralCodePlaceholder: "OLEA-ABC123",
        referralCodeHelp:
          "Optional. A valid code supports the referring organization's Olea Gives reward.",
        password: "Password *",
        passwordHelp: "Use at least 8 characters.",
        continueToPayment: "Continue to payment",
        backToPlan: "Back to plan",
        organizationKinds: {
          nonprofit: "Nonprofit",
          registered_charity: "Registered charity",
          society: "Society",
          community_organization: "Community organization",
          foundation: "Foundation",
          other: "Other",
        },
        boardSizes: {
          "3-5": "3-5 members",
          "6-10": "6-10 members",
          "11-15": "11-15 members",
          "16-20": "16-20 members",
          "20plus": "20+ members",
        },
        annualBudgets: {
          "under-250k": "Under $250,000",
          "250k-500k": "$250,000-$500,000",
          "500k-1m": "$500,000-$1M",
          "1m-2m": "$1M-$2M",
          "2m-5m": "$2M-$5M",
          "over-5m": "$5M+",
        },
        acquisitionSources: {
          referral: "Another organization",
          "web-search": "Web search",
          "social-media": "Social media",
          webinar: "Webinar or event",
          sponsor: "Through a sponsor",
          "word-of-mouth": "Word of mouth",
          other: "Other",
        },
      },
      payment: {
        title: "Activate your membership",
        description: "Review your plan and complete payment.",
        secureCheckout: "Secure checkout",
        paymentSecureTitle: "Payment is completed securely",
        paymentSecureDescription:
          "Olea Connects™ never receives or stores your card number or security code.",
        billingProvince: "Billing province",
        provincePlaceholder: "Select a province",
        legalTitle: "Review & legal agreements",
        legalDocuments: {
          confidentiality: "Confidentiality Policy",
          dataOwnership: "Data Ownership Agreement",
          privacy: "Privacy Policy",
          terms: "Terms of Service",
        },
        organization: "Organization",
        plan: "Plan",
        billing: "Billing",
        includedSeats: "Included seats",
        billingCycle: {
          annual: "Annual",
          quarterly: "Quarterly",
        },
        consentPrefix: "I agree to the",
        consentVersion: (version) => `(version ${version})`,
        continuePending: "Opening secure checkout...",
        continueToCheckout: "Continue to secure checkout",
        secureCheckoutLabel: "Secure checkout",
        orderSummary: "Order summary",
        billingSummary: (cycle) =>
          cycle === "annual" ? "Annual billing" : "Quarterly billing",
        membershipStarts: "Membership starts immediately",
        membershipDescription:
          "Your selected annual or quarterly billing amount is charged upfront when you activate your membership. GST/PST is calculated from your billing province.",
        renewalNotice: "30-day notice before renewal",
        canadianDollars: "Prices in Canadian dollars",
        foundingEligibility:
          "Founding-member eligibility is confirmed securely before payment.",
        canceled:
          "Checkout was canceled. Your account was created, so verify your email and sign in when you are ready to continue.",
        consentError:
          "Review and accept each required policy before continuing.",
        errors: {
          accountState:
            "Unable to continue with these account details. Sign in or reset your password, then try again.",
          checkoutRateLimited:
            "Verification emails are temporarily limited. Please wait a few minutes and try again.",
          checkoutUnavailable: "Unable to start secure checkout.",
          signupValidation: "Review your signup details and try again.",
        },
        fallbackError: "Unable to create your account.",
      },
      success: {
        titles: {
          failed: "Activation needs attention",
          completed: "Your membership is ready",
          received: "Payment received",
        },
        descriptions: {
          failed:
            "Your payment is safe, but workspace setup needs to be retried.",
          completed: "Your Olea Connects™ workspace is active.",
          received: "Your Olea Connects™ membership is being activated.",
        },
        messages: {
          failed:
            "Sign in if prompted, then retry. The activation record is preserved so no organization or subscription will be duplicated.",
          completed:
            "Continue to your dashboard. If you are asked to sign in, use the same email address you used during checkout.",
          pendingVerification:
            "We sent a confirmation email from Olea Connects™. Open that email and confirm your address before signing in.",
          pending:
            "We are finalizing your activation. If your dashboard is not ready yet, sign in and retry activation once.",
        },
        goToDashboard: "Go to dashboard",
        continueToSignIn: "Continue to sign in",
        finalizeError:
          "Workspace activation could not be finalized automatically.",
      },
    },
    login: {
      title: "Welcome back",
      password: "Password",
      forgotPassword: "Forgot password?",
      paymentVerifyMessage:
        "Payment received. Check your inbox for a confirmation email from Olea Connects™, confirm your address, then sign in.",
      paymentSuccessMessage:
        "Payment received. Sign in to finish setting up your membership.",
      fallbackError: "Unable to sign in.",
      remember: "Remember me for 30 days",
      pending: "Signing in...",
      submit: "Sign in",
      noAccount: "Don't have an account?",
      signUp: "Sign up",
    },
    resetPassword: {
      title: "Reset your password",
      sentTitle: "Check your email",
      description: "Enter your email and we'll send a secure reset link.",
      sentDescription: (email) =>
        `If an account exists for ${email}, a reset link is on its way.`,
      sendAnother: "Send another link",
      pending: "Sending...",
      submit: "Send reset link",
      fallbackError: "Unable to send the reset link.",
    },
    verifyEmail: {
      title: "Check your email",
      description: (email) => `We sent a verification link to ${email}.`,
      fallbackEmail: "your email address",
      paymentMessage:
        "Your payment was received. Confirm your email before accessing the dashboard.",
      defaultMessage: "Confirm your email before accessing the dashboard.",
      returnMessage:
        "The secure link will return you to Olea Connects™ and continue setup automatically.",
      sentMessage: "A new verification email has been sent.",
      fallbackError: "Unable to resend the verification email.",
      resendIn: (seconds) => `Resend available in ${seconds}s`,
      resend: "Resend verification email",
    },
    updatePassword: {
      title: "Choose a new password",
      description: "Use at least 8 characters for your new password.",
      newPassword: "New password",
      confirmPassword: "Confirm password",
      mismatch: "Passwords do not match.",
      pending: "Updating...",
      submit: "Update password",
      fallbackError: "Unable to update your password.",
    },
    activationRetry: {
      confirmEmail: "Confirm your email address, then retry activation.",
      pendingPayment:
        "Payment is not confirmed for this account yet. If you already paid, sign out and use the email address from checkout, or contact support.",
      processing:
        "Payment confirmation is still processing. Try again shortly.",
      fallbackError:
        "Activation could not be checked. Please try again shortly.",
      pending: "Checking activation...",
      submit: "Retry activation",
    },
    invitation: {
      unavailableTitle: "Invitation unavailable",
      unavailableDescription:
        "This invitation is invalid, expired, or has already been accepted.",
      goToSignIn: "Go to sign in",
      acceptedTitle: "Invitation accepted",
      joinTitle: "Join the organization",
      acceptedDescription: "Your team access is ready.",
      sentTo: (email) => `This invitation was sent to ${email}.`,
      fallbackAcceptError: "Unable to accept this invitation.",
      fullNameRequired: "Enter your full name to continue.",
      passwordTooShort: "Password must contain at least 8 characters.",
      createAccountError:
        "We could not create this account. Check the details and try again.",
      accountExists:
        "An account already exists for this email. Sign in with the invited email to accept the invitation.",
      continueToDashboard: "Continue to dashboard",
      confirmEmailTitle: "Check your email to confirm your account.",
      confirmEmailDescription:
        "The confirmation link returns you here and finishes joining the workspace.",
      fullName: "Full name",
      invitedEmail: "Invited email",
      invitedEmailHelp:
        "This invitation can only create an account for this email address.",
      createPassword: "Create a password",
      passwordHelp: "Use at least 8 characters.",
      createPending: "Creating account...",
      createSubmit: "Create account and join",
      alreadyHaveAccount: "Already have an account?",
      signIn: "Sign in",
      wrongAccount: (email) =>
        `This invitation was sent to ${email}. Sign out, then sign in with that email address to continue.`,
      acceptPending: "Accepting...",
      acceptSubmit: "Accept invitation",
    },
  },
  "fr-CA": {
    shared: {
      backToLogin: "Retour à la connexion",
      emailAddress: "Adresse courriel",
      hidePassword: "Masquer le mot de passe",
      showPassword: "Afficher le mot de passe",
    },
    signup: {
      step: (current, total) => `Étape ${current} sur ${total}`,
      plan: {
        title: "Choisissez votre forfait",
        description: "Choisissez le soutien qui convient à votre organisme.",
        quarterly: "Trimestriel",
        annual: "Annuel",
        bestValue: "meilleure valeur",
        foundingEligibility:
          "L'admissibilité comme membre fondateur est confirmée de façon sécurisée avant le paiement.",
        selected: "Sélectionné",
        selectPlan: "Choisir le forfait",
        policyNote:
          "Les prix sont indiqués avant taxes; la TPS/TVP est calculée à la caisse sécurisée.",
        continueWith: (planName) => `Continuer avec ${planName}`,
      },
      account: {
        title: "Créez votre compte",
        description: "Votre espace de travail d'organisme commence ici.",
        organizationName: "Nom de l'organisme *",
        fullName: "Votre nom *",
        organizationKind: "Type d'organisme *",
        organizationKindPlaceholder: "Sélectionner un type",
        boardSize: "Taille approximative du conseil *",
        boardSizePlaceholder: "Sélectionner une taille",
        annualBudget: "Budget annuel de l'organisme *",
        annualBudgetPlaceholder: "Sélectionner une fourchette",
        annualBudgetHelp:
          "Cela nous aide à recommander le bon niveau de soutien.",
        phone: "Numéro de téléphone",
        phonePlaceholder: "(555) 123-4567",
        phoneHelp:
          "Facultatif; chiffres, espaces, parenthèses, traits d'union et un + initial seulement.",
        acquisitionSource: "Comment avez-vous entendu parler de nous?",
        acquisitionSourcePlaceholder: "Sélectionner une source",
        referralCode: "Code de référence",
        referralCodePlaceholder: "OLEA-ABC123",
        referralCodeHelp:
          "Facultatif. Un code valide soutient la récompense Olea Gives de l'organisme référent.",
        password: "Mot de passe *",
        passwordHelp: "Utilisez au moins 8 caractères.",
        continueToPayment: "Continuer au paiement",
        backToPlan: "Retour au forfait",
        organizationKinds: {
          nonprofit: "Organisme sans but lucratif",
          registered_charity: "Organisme de bienfaisance enregistré",
          society: "Société",
          community_organization: "Organisme communautaire",
          foundation: "Fondation",
          other: "Autre",
        },
        boardSizes: {
          "3-5": "3 à 5 membres",
          "6-10": "6 à 10 membres",
          "11-15": "11 à 15 membres",
          "16-20": "16 à 20 membres",
          "20plus": "20 membres et plus",
        },
        annualBudgets: {
          "under-250k": "Moins de 250 000 $",
          "250k-500k": "250 000 $ à 500 000 $",
          "500k-1m": "500 000 $ à 1 M$",
          "1m-2m": "1 M$ à 2 M$",
          "2m-5m": "2 M$ à 5 M$",
          "over-5m": "5 M$ et plus",
        },
        acquisitionSources: {
          referral: "Un autre organisme",
          "web-search": "Recherche Web",
          "social-media": "Médias sociaux",
          webinar: "Webinaire ou événement",
          sponsor: "Par un commanditaire",
          "word-of-mouth": "Bouche-à-oreille",
          other: "Autre",
        },
      },
      payment: {
        title: "Activez votre adhésion",
        description: "Vérifiez votre forfait et complétez le paiement.",
        secureCheckout: "Caisse sécurisée",
        paymentSecureTitle: "Le paiement est effectué de façon sécurisée",
        paymentSecureDescription:
          "Olea Connects™ ne reçoit ni ne stocke jamais votre numéro de carte ni votre code de sécurité.",
        billingProvince: "Province de facturation",
        provincePlaceholder: "Sélectionner une province",
        legalTitle: "Vérification et ententes juridiques",
        legalDocuments: {
          confidentiality: "Politique de confidentialité",
          dataOwnership: "Entente sur la propriété des données",
          privacy: "Politique de protection des renseignements personnels",
          terms: "Conditions d'utilisation",
        },
        organization: "Organisme",
        plan: "Forfait",
        billing: "Facturation",
        includedSeats: "Sièges inclus",
        billingCycle: {
          annual: "Annuelle",
          quarterly: "Trimestrielle",
        },
        consentPrefix: "J'accepte",
        consentVersion: (version) => `(version ${version})`,
        continuePending: "Ouverture de la caisse sécurisée...",
        continueToCheckout: "Continuer à la caisse sécurisée",
        secureCheckoutLabel: "Caisse sécurisée",
        orderSummary: "Résumé de la commande",
        billingSummary: (cycle) =>
          cycle === "annual"
            ? "Facturation annuelle"
            : "Facturation trimestrielle",
        membershipStarts: "L'adhésion commence immédiatement",
        membershipDescription:
          "Le montant annuel ou trimestriel choisi est facturé à l'avance lorsque vous activez votre adhésion. La TPS/TVP est calculée selon votre province de facturation.",
        renewalNotice: "Préavis de 30 jours avant le renouvellement",
        canadianDollars: "Prix en dollars canadiens",
        foundingEligibility:
          "L'admissibilité comme membre fondateur est confirmée de façon sécurisée avant le paiement.",
        canceled:
          "La caisse a été annulée. Votre compte a été créé; vérifiez donc votre courriel et connectez-vous lorsque vous serez prêt à continuer.",
        consentError:
          "Vérifiez et acceptez chaque politique requise avant de continuer.",
        errors: {
          accountState:
            "Impossible de continuer avec ces renseignements de compte. Connectez-vous ou réinitialisez votre mot de passe, puis réessayez.",
          checkoutRateLimited:
            "Les courriels de vérification sont temporairement limités. Attendez quelques minutes, puis réessayez.",
          checkoutUnavailable: "Impossible de démarrer la caisse sécurisée.",
          signupValidation:
            "Vérifiez vos renseignements d'inscription, puis réessayez.",
        },
        fallbackError: "Impossible de créer votre compte.",
      },
      success: {
        titles: {
          failed: "L'activation demande votre attention",
          completed: "Votre adhésion est prête",
          received: "Paiement reçu",
        },
        descriptions: {
          failed:
            "Votre paiement est sécurisé, mais la configuration de l'espace de travail doit être réessayée.",
          completed: "Votre espace Olea Connects™ est actif.",
          received: "Votre adhésion Olea Connects™ est en cours d'activation.",
        },
        messages: {
          failed:
            "Connectez-vous si demandé, puis réessayez. Le dossier d'activation est conservé afin qu'aucun organisme ni abonnement ne soit créé en double.",
          completed:
            "Continuez vers votre tableau de bord. Si on vous demande de vous connecter, utilisez la même adresse courriel que lors du paiement.",
          pendingVerification:
            "Nous avons envoyé un courriel de confirmation d'Olea Connects™. Ouvrez ce courriel et confirmez votre adresse avant de vous connecter.",
          pending:
            "Nous finalisons votre activation. Si votre tableau de bord n'est pas encore prêt, connectez-vous et réessayez l'activation une fois.",
        },
        goToDashboard: "Aller au tableau de bord",
        continueToSignIn: "Continuer vers la connexion",
        finalizeError:
          "L'activation de l'espace de travail n'a pas pu être finalisée automatiquement.",
      },
    },
    login: {
      title: "Bon retour",
      password: "Mot de passe",
      forgotPassword: "Mot de passe oublié?",
      paymentVerifyMessage:
        "Paiement reçu. Vérifiez votre boîte de réception pour un courriel de confirmation d'Olea Connects™, confirmez votre adresse, puis connectez-vous.",
      paymentSuccessMessage:
        "Paiement reçu. Connectez-vous pour terminer la configuration de votre adhésion.",
      fallbackError: "Impossible de vous connecter.",
      remember: "Se souvenir de moi pendant 30 jours",
      pending: "Connexion en cours...",
      submit: "Se connecter",
      noAccount: "Vous n'avez pas de compte?",
      signUp: "S'inscrire",
    },
    resetPassword: {
      title: "Réinitialisez votre mot de passe",
      sentTitle: "Vérifiez votre courriel",
      description:
        "Entrez votre courriel et nous vous enverrons un lien de réinitialisation sécurisé.",
      sentDescription: (email) =>
        `Si un compte existe pour ${email}, un lien de réinitialisation est en route.`,
      sendAnother: "Envoyer un autre lien",
      pending: "Envoi en cours...",
      submit: "Envoyer le lien de réinitialisation",
      fallbackError: "Impossible d'envoyer le lien de réinitialisation.",
    },
    verifyEmail: {
      title: "Vérifiez votre courriel",
      description: (email) =>
        `Nous avons envoyé un lien de vérification à ${email}.`,
      fallbackEmail: "votre adresse courriel",
      paymentMessage:
        "Votre paiement a été reçu. Confirmez votre courriel avant d'accéder au tableau de bord.",
      defaultMessage:
        "Confirmez votre courriel avant d'accéder au tableau de bord.",
      returnMessage:
        "Le lien sécurisé vous ramènera à Olea Connects™ et poursuivra automatiquement la configuration.",
      sentMessage: "Un nouveau courriel de vérification a été envoyé.",
      fallbackError: "Impossible de renvoyer le courriel de vérification.",
      resendIn: (seconds) => `Renvoi disponible dans ${seconds} s`,
      resend: "Renvoyer le courriel de vérification",
    },
    updatePassword: {
      title: "Choisissez un nouveau mot de passe",
      description:
        "Utilisez au moins 8 caractères pour votre nouveau mot de passe.",
      newPassword: "Nouveau mot de passe",
      confirmPassword: "Confirmer le mot de passe",
      mismatch: "Les mots de passe ne correspondent pas.",
      pending: "Mise à jour en cours...",
      submit: "Mettre à jour le mot de passe",
      fallbackError: "Impossible de mettre à jour votre mot de passe.",
    },
    activationRetry: {
      confirmEmail:
        "Confirmez votre adresse courriel, puis réessayez l'activation.",
      pendingPayment:
        "Le paiement n'est pas confirmé pour ce compte. Si vous avez déjà payé, déconnectez-vous et utilisez l'adresse courriel du paiement, ou contactez le soutien.",
      processing:
        "La confirmation du paiement est encore en cours. Réessayez sous peu.",
      fallbackError:
        "L'activation n'a pas pu être vérifiée. Veuillez réessayer sous peu.",
      pending: "Vérification de l'activation...",
      submit: "Réessayer l'activation",
    },
    invitation: {
      unavailableTitle: "Invitation non disponible",
      unavailableDescription:
        "Cette invitation est invalide, expirée ou a déjà été acceptée.",
      goToSignIn: "Aller à la connexion",
      acceptedTitle: "Invitation acceptée",
      joinTitle: "Rejoindre l'organisme",
      acceptedDescription: "Votre accès à l'équipe est prêt.",
      sentTo: (email) => `Cette invitation a été envoyée à ${email}.`,
      fallbackAcceptError: "Impossible d'accepter cette invitation.",
      fullNameRequired: "Entrez votre nom complet pour continuer.",
      passwordTooShort: "Le mot de passe doit contenir au moins 8 caractères.",
      createAccountError:
        "Impossible de créer ce compte. Vérifiez les renseignements et réessayez.",
      accountExists:
        "Un compte existe déjà pour ce courriel. Connectez-vous avec l'adresse invitée pour accepter l'invitation.",
      continueToDashboard: "Continuer vers le tableau de bord",
      confirmEmailTitle: "Vérifiez votre courriel pour confirmer votre compte.",
      confirmEmailDescription:
        "Le lien de confirmation vous ramènera ici et terminera l'ajout à l'espace de travail.",
      fullName: "Nom complet",
      invitedEmail: "Courriel invité",
      invitedEmailHelp:
        "Cette invitation peut seulement créer un compte pour cette adresse courriel.",
      createPassword: "Créer un mot de passe",
      passwordHelp: "Utilisez au moins 8 caractères.",
      createPending: "Création du compte...",
      createSubmit: "Créer le compte et rejoindre",
      alreadyHaveAccount: "Vous avez déjà un compte?",
      signIn: "Se connecter",
      wrongAccount: (email) =>
        `Cette invitation a été envoyée à ${email}. Déconnectez-vous, puis connectez-vous avec cette adresse courriel pour continuer.`,
      acceptPending: "Acceptation...",
      acceptSubmit: "Accepter l'invitation",
    },
  },
};

export function getAuthFlowCopy(locale: Locale) {
  return authFlowCopy[locale];
}
