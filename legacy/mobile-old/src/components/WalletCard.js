import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { fmtGNF } from '../utils/formatters';

export default function WalletCard({ nif, data }) {
  const pct = data.solde > 0
    ? Math.min((data.depenses_jour / 10000) * 100, 100)
    : 0;

  return (
    <View style={styles.card}>
      <View style={styles.left}>
        <Text style={styles.nif}>NIF {nif}</Text>
        <Text style={styles.ville}>📍 {data.ville}</Text>
      </View>
      <View style={styles.right}>
        <Text style={styles.solde}>{fmtGNF(data.solde)}</Text>
        <Text style={styles.depenses}>Dép. : {fmtGNF(data.depenses_jour)}</Text>
        <View style={styles.limitBar}>
          <View style={[styles.limitFill, { width: `${pct}%` }]} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  left:     {},
  nif:      { fontFamily: 'monospace', fontSize: 13, fontWeight: '700', color: colors.blue },
  ville:    { fontSize: 11, color: colors.text4, marginTop: 2 },
  right:    { alignItems: 'flex-end' },
  solde:    { fontSize: 15, fontWeight: '700', color: colors.green },
  depenses: { fontSize: 10, color: colors.text4, marginTop: 2 },
  limitBar: {
    width: 80, height: 4, backgroundColor: colors.border,
    borderRadius: 2, marginTop: 4, overflow: 'hidden',
  },
  limitFill: { height: '100%', backgroundColor: colors.orange, borderRadius: 2 },
});
