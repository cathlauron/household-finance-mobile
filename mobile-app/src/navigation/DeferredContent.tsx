import React, { useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';

// Opening a page: the fade starts straight away, and the page's contents are built a
// moment later (the next frame), while the fade is already moving. Building a busy page
// first used to hold the old screen still for a beat before anything moved.
export default function DeferredContent({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let frame2 = 0;
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(frame1);
      cancelAnimationFrame(frame2);
    };
  }, []);
  return <View style={styles.fill}>{ready ? children : null}</View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
