import type { TrainingLanguage } from "@/lib/board-training/content";

const frenchErrors: Record<string, string> = {
  "Only organization owners and administrators can manage training.": "Seuls les propriétaires et les administrateurs de l’organisme peuvent gérer la formation.",
  "Choose an active member as Board Chair.": "Choisissez un membre actif pour la présidence du conseil.",
  "Choose an available course.": "Choisissez une formation disponible.",
  "Complete Governance Essentials before the annual refresher.": "Terminez d’abord les fondements de la gouvernance.",
  "Training enrollment was not found.": "Inscription à la formation introuvable.",
  "This course is complete and can no longer be changed.": "Cette formation est terminée et ne peut plus être modifiée.",
  "Choose a rating from 1 to 5 for every area.": "Attribuez une note de 1 à 5 à chaque domaine.",
  "Pass the assessment before rating your progress.": "Réussissez l’évaluation avant de noter vos progrès.",
  "Choose a valid lesson.": "Choisissez une leçon valide.",
  "Complete your starting reflection first.": "Terminez d’abord votre bilan initial.",
  "Complete the previous lesson first.": "Terminez d’abord la leçon précédente.",
  "You have already passed this assessment.": "Vous avez déjà réussi cette évaluation.",
  "The test-out attempt is no longer available.": "La tentative d’exemption n’est plus disponible.",
  "Test-out is only available before lessons begin.": "L’exemption est disponible seulement avant le début des leçons.",
  "Complete every lesson before the assessment.": "Terminez toutes les leçons avant l’évaluation.",
  "Sign the organization declaration before the assessment.": "Signez la déclaration de l’organisme avant l’évaluation.",
  "This declaration has already been signed.": "Cette déclaration a déjà été signée.",
  "Complete the lessons or pass the assessment first.": "Terminez les leçons ou réussissez d’abord l’évaluation.",
  "Review the provided documents before signing.": "Consultez les documents fournis avant de signer.",
  "Confirm the code of conduct before signing.": "Acceptez le code de conduite avant de signer.",
  "Describe your interests, or select no interests.": "Décrivez vos intérêts ou indiquez que vous n’en avez aucun à déclarer.",
  "Enter your full name, 2 to 160 characters.": "Saisissez votre nom complet (2 à 160 caractères).",
  "Complete the assessment and declaration first.": "Terminez d’abord l’évaluation et la déclaration.",
  "This course has no action plan.": "Cette formation ne comporte pas de plan d’action.",
  "Rate every area after the course before saving your plan.": "Notez chaque domaine après la formation avant d’enregistrer votre plan.",
  "Choose Done, Partly, or Not yet for each follow-up.": "Choisissez Fait, En partie ou Pas encore pour chaque suivi.",
  "Choose a follow-up status for each action from the previous course.": "Indiquez l’état de chaque action de la formation précédente.",
  "Follow-up belongs to the annual refresher.": "Le suivi fait partie de la mise à jour annuelle.",
  "Complete the assessment, organization declaration, and action plan first.": "Terminez d’abord l’évaluation, la déclaration de l’organisme et le plan d’action.",
  "Confirm each director acknowledgement before continuing.": "Confirmez chaque attestation avant de continuer.",
  "Enter the full name for your certificate, 2 to 160 characters.": "Saisissez le nom complet à inscrire sur votre certificat (2 à 160 caractères).",
  "Upload a PDF document up to 5 MB.": "Téléversez un document PDF de 5 Mo maximum.",
  "Choose a PDF document up to 5 MB.": "Choisissez un document PDF de 5 Mo maximum.",
  "Enter a title from 2 to 160 characters.": "Saisissez un titre de 2 à 160 caractères.",
  "Choose a valid PDF document.": "Choisissez un document PDF valide.",
  "Document was not found.": "Document introuvable.",
  "Add this director to Team first, then send the training invitation.": "Ajoutez d’abord ce membre à l’équipe, puis envoyez l’invitation à la formation.",
  "This director must complete Governance Essentials first.": "Ce membre doit d’abord terminer les fondements de la gouvernance.",
  "The invitation email could not be sent. Try again.": "Impossible d’envoyer le courriel d’invitation. Réessayez.",
  "Only a pending invitation can be resent.": "Seule une invitation en attente peut être renvoyée.",
  "This invitation is unavailable for your account.": "Cette invitation n’est pas disponible pour votre compte.",
  "Certificate was not found.": "Certificat introuvable.",
  "Only the certificate holder can request delivery.": "Seule la personne titulaire du certificat peut demander son envoi.",
  "Certificate email delivery failed.": "Impossible d’envoyer le certificat par courriel.",
};

export function trainingErrorCopy(message: string, language: TrainingLanguage) {
  if (language === "en") return message;
  const commitments = /^Choose 1 to (\d+) commitments, up to 300 characters each\.$/.exec(message);
  if (commitments) return `Choisissez de 1 à ${commitments[1]} engagements de 300 caractères maximum chacun.`;
  return frenchErrors[message] ?? "Impossible d’enregistrer. Vérifiez les champs et réessayez.";
}
