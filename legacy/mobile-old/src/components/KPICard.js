import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, shadows } from '../theme';

export default function KPICard({ label, value, sub, color }) {
  return (
    <View style={[styles.card, { borderBottomColor: color }]}>
      <View style={[styles.dot, { backgroundColor: color + '22' }]}>
        <View style={[styles.dotInner, { backgroundColor: color }]} />
      </View>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, { color }]}>{value}</Text>
      {sub ? <Text style={styles.sub}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderBottomWidth: 3,
    padding: 14,
    ...shadows.sm,
  },
  dot: {
    width: 36, height: 36, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', marginBottom: 10,
  },
  dotInner: { width: 16, height: 16, borderRadius: 4 },
  label: {
    fontSize: 10, fontWeight: '700', color: colors.text3,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4,
  },
  value: { fontSize: 20, fontWeight: '800', letterSpacing: -0.5, marginBottom: 2 },
  sub:   { fontSize: 11, color: colors.text4 },
});
