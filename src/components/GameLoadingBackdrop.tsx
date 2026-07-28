import React from 'react';
import { View, StyleSheet, ActivityIndicator, Text, Platform } from 'react-native';

/** 全屏加载：自带底色，避免父级未衬图时出现「白屏只有一个小点」 */
export default function GameLoadingBackdrop() {
  return (
    <View style={styles.root} accessibilityLabel="Loading">
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#f5e6a8" />
        <Text style={styles.hint}>{Platform.OS === 'web' ? 'Loading…' : '加载中…'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000000' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 40,
  },
  hint: {
    marginTop: 16,
    color: 'rgba(255,248,232,0.85)',
    fontSize: 13,
  },
});
