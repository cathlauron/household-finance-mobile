import React, { useEffect, useRef } from 'react';

// Cath, 2026-11-06 (mockup C): anything in Plan can be added from the Calendar. Each Plan screen
// can draw just its form, opened on the picked day, so you never leave the Calendar.
export type PlanFormProps = {
  formOnly?: boolean;
  addDate?: string; // the day picked on the Calendar
  addNonce?: number; // a new number opens the form again
  onFormClosed?: () => void;
  onAdded?: () => void;
};

export function useFormOnly({ formOnly, addNonce, onFormClosed }: PlanFormProps, open: boolean, start: () => void) {
  useEffect(() => {
    if (formOnly && addNonce) start();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addNonce]);
  const wasOpen = useRef(false);
  useEffect(() => {
    if (formOnly && wasOpen.current && !open) onFormClosed?.();
    wasOpen.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
}

// Stands in for a page's scrolling wrapper when only its form is drawn.
export function FormOnlyBox({ children }: { children?: React.ReactNode; [key: string]: unknown }) {
  return <>{children}</>;
}
