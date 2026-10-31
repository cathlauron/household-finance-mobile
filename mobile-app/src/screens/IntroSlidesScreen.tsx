import React from 'react';
import WelcomeScreen from './WelcomeScreen';

// The welcome reached from sign-in ("Create a new account"). Since 2026-10-31 it is the same
// welcome as for new people (mockup O3a): Get started creates a profile; "I already have an
// account" goes back to sign in.

type Props = {
  onDone: () => void;
  onBack?: () => void;
  onSignIn?: () => void;
};

export default function IntroSlidesScreen({ onDone, onBack, onSignIn }: Props) {
  return <WelcomeScreen onStart={onDone} onSignIn={onSignIn ?? onBack ?? onDone} />;
}
