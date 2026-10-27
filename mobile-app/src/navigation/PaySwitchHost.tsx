// Version 2.2 (Cath): the Bill | Debt | Loan switch on a New form. The other kind's form
// opens in the same sheet with what was typed; the To-Pay list only changes to that kind
// once it's been added (so you see it land there).
// Sweep fix: these forms live here, next to the tabs (not inside the To-Pay tab), so they
// always work with your newest data, even when To-Pay isn't the tab on screen (for
// example a form opened from the Calendar).
import React, { useEffect, useState } from 'react';
import { goToMain } from './goToMain';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useData } from '../DataContext';
import { onToPaySwitchAdd, AddCarry, ToPaySub } from '../fabActions';
import { requestToPayTab } from '../openToPayTabRequest';
import { SHEET_CLOSE_WAIT } from '../components/BottomSheet';
import { expectArrival } from '../arrivalFocus';
import BillsScreen from '../screens/BillsScreen';
import DebtsScreen from '../screens/DebtsScreen';
import LoansScreen from '../screens/LoansScreen';

export default function PaySwitchHost() {
  const navigation = useNavigation<any>();
  const { getModel } = useData();
  // More than one can be there for a moment while one form hands over to the next.
  const [forms, setForms] = useState<{ sub: ToPaySub; carry: AddCarry; nonce: number }[]>([]);
  useEffect(
    () =>
      onToPaySwitchAdd((sub, carry) => {
        const m = getModel();
        // So the list can find, light up and scroll to the new one after Add.
        if (m) expectArrival(sub, (sub === 'bills' ? m.bills : sub === 'debts' ? m.debts : m.loans).map((x: { id: string }) => x.id));
        setForms((list) => [...list, { sub, carry, nonce: Date.now() }]);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  // After its sheet has slid away, the extra form is let go.
  const end = (nonce: number) => setTimeout(() => setForms((list) => list.filter((f) => f.nonce !== nonce)), 500);
  return (
    <>
      {forms.map((f) => {
        const common = {
          formOnly: true,
          addCarry: { ...f.carry, nonce: f.nonce },
          onFormClosed: () => end(f.nonce),
          // After the form has slid away, show that list (the new one slides in there).
          onAdded: () =>
            setTimeout(() => {
              requestToPayTab(f.sub);
              goToMain(navigation, { screen: 'To-Pay' });
            }, SHEET_CLOSE_WAIT),
        };
        return (
          <View key={f.nonce} pointerEvents="box-none" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden' }}>
            {f.sub === 'bills' ? <BillsScreen {...common} /> : f.sub === 'debts' ? <DebtsScreen {...common} /> : <LoansScreen {...common} />}
          </View>
        );
      })}
    </>
  );
}
