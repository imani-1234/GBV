/**
 * Anonymous reporters can access their own reports, but cases remain an
 * officer workspace. Keeping this decision in one place prevents accidental
 * 403-generating fetches as reporter screens evolve.
 */
export function mayFetchReporterCases(isAnonymous: boolean): boolean {
  return !isAnonymous;
}

export function mayOpenReporterCaseMessages(isAnonymous: boolean, caseId?: string | null): boolean {
  return !isAnonymous && Boolean(caseId);
}
