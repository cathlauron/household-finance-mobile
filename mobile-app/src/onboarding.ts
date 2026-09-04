import AsyncStorage from '@react-native-async-storage/async-storage';

function onboardingKey(username: string): string {
  return `profile:${username}:onboarding-completed`;
}

export async function hasCompletedOnboarding(username: string): Promise<boolean> {
  const val = await AsyncStorage.getItem(onboardingKey(username));
  return val === 'true';
}

export async function markOnboardingCompleted(username: string): Promise<void> {
  await AsyncStorage.setItem(onboardingKey(username), 'true');
}
