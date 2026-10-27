// Version 2.2 (Cath: "it should lead me to the next step"): logging a salary before any
// salary is set up. The New transaction form sends you to Income's "Add income" form;
// once you've added it, you come straight back to the New transaction form with that
// salary already picked (and the amount and account you'd entered kept).
type Back = (sourceId: string) => void;
let back: Back | null = null;

export function startSalaryHandoff(fn: Back) {
  back = fn;
}

// Income calls this after adding a new salary: returns what to do next (if a form is
// waiting for it), and forgets it.
export function takeSalaryHandoff(): Back | null {
  const f = back;
  back = null;
  return f;
}

// A form is waiting to come back with a new salary (so its form host stays around).
export function salaryHandoffPending(): boolean {
  return back !== null;
}

export function cancelSalaryHandoff() {
  back = null;
}
