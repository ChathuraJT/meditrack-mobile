import { Tabs, TabSlot, TabList, TabTrigger } from 'expo-router/ui';

// Keep the tab navigator mounted so switching tabs preserves each screen's state.
// The visible navigation bar lives in the shared patient layout.
export function AppTabs() {
  return (
    <Tabs style={{ flex: 1 }}>
      <TabSlot style={{ flex: 1 }} />
      <TabList style={{ display: 'none' }}>
        <TabTrigger name="home" href="/" />
        <TabTrigger name="medications" href="/medications" />
        <TabTrigger name="recovery" href="/recovery" />
        <TabTrigger name="map" href="/map" />
      </TabList>
    </Tabs>
  );
}
