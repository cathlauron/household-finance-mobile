// Version 2.2 (approved P3, Impeccable "clarify"): error messages say what didn't happen,
// that nothing was lost, and the one thing to do, naming the item ("this bill", "this
// pot"). They replace the old "Failed to save. Please try again." lines everywhere.

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// A line shown inside a form, under the fields.
export function notSaved(thing: string): string {
  return `${cap(thing)} wasn't saved. Your changes are still here, so tap Save to try again.`;
}

export function notDeleted(thing: string): string {
  return `${cap(thing)} wasn't deleted. Nothing was removed, so you can try again.`;
}

// A pop-up: [title, message], used as Alert.alert(...alertNotSaved('this transfer')).
export function alertNotSaved(thing: string): [string, string] {
  return [`Couldn't save ${thing}`, 'Nothing was lost. Please try again in a moment.'];
}

export function alertNotDeleted(thing: string): [string, string] {
  return [`Couldn't delete ${thing}`, 'Nothing was removed. Please try again in a moment.'];
}

export function alertDidntWork(what: string): [string, string] {
  return [`Couldn't ${what}`, 'Nothing changed. Please try again in a moment.'];
}

export const TRY_AGAIN = "That didn't work this time. Nothing changed, so please try again in a moment.";
