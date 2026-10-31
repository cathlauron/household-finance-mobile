// Where a bell item opens. Cath's phone test 2026-10-30: a "sign-in help request" opened
// Profile; it now opens the Household page, where the request is approved.
export function recoveryRequestRoute(): { screen: 'Profile'; params: { section: 'household' } } {
  return { screen: 'Profile', params: { section: 'household' } };
}
