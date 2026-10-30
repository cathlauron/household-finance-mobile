import { Alert } from 'react-native';

// H-49 (Cath, 2026-10-29): "for anything that would be deleted, or a similar action, make sure
// to ask for a confirmation first." One shared question for every Remove / Clear button, so
// they all ask the same way: Cancel, or a red Remove. tests/confirmRemove.test.mjs fails on a
// new Remove / Delete / Clear button that doesn't ask.
export function askToRemove(title: string, message: string, onYes: () => void, yesLabel = 'Remove') {
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: yesLabel, style: 'destructive', onPress: onYes },
  ]);
}
