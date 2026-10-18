import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFixture, type DemoState, type DemoScenario } from './demoData';

const storageKey = 'meditrack.demo-care.v1';

export async function loadDemoState(scenario: DemoScenario) {
  const stored = await AsyncStorage.getItem(storageKey);
  if (!stored) return getFixture(scenario);
  try {
    const parsed = JSON.parse(stored) as DemoState;
    return parsed.scenario === scenario ? parsed : getFixture(scenario);
  } catch {
    return getFixture(scenario);
  }
}

export async function saveDemoState(state: DemoState) {
  await AsyncStorage.setItem(storageKey, JSON.stringify(state));
}

export async function resetDemoState(scenario: DemoScenario) {
  const next = getFixture(scenario);
  await saveDemoState(next);
  return next;
}
