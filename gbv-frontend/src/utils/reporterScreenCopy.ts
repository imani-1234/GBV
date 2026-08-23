export const reporterHeroTitle = (isAnonymous: boolean) =>
  isAnonymous ? "Your reports,\nyour privacy." : "Your voice\nmatters.";

export const reporterDetailFallbackTitle = "Incident\nreport";
export const reporterWizardTitle = "Create\nreport";

export const reporterMessagesEmptyTitle = (isAnonymous: boolean) =>
  isAnonymous ? "Your report\nis protected." : "No messages\nyet.";

export const reporterNotificationsEmptyTitle = (isAnonymous: boolean) =>
  isAnonymous ? "Private updates\nstay here." : "Nothing new\nright now.";
