import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, shadows } from '../theme';
import { fmtNum, fmtTime } from '../utils/formatters';

export default function BlockCard({ bloc, isGenesis }) {
  const hashDisplay = bloc.hash.startsWith('000')
    ? { prefix: '000', rest: bloc.hash.substring(3, 16) + '…' }
    : { prefix: null,  rest: bloc.hash.substring(0, 16) + '…' };

  return (
    <View style={[styles.card, isGenesis && styles.genesis]}>
      <View style={styles.header}>
        <Text style={[styles.num, isGenesis && styles.numGenesis]}>
          Bloc #{bloc.index}{isGenesis ? ' ⚙' : ''}
        </Text>
        <View style={styles.validDot} />
      </View>

      <View style={styles.hashBox}>
        {hashDisplay.prefix
          ? <Text style={styles.hash}>
              <Text style={styles.hashZeros}>{hashDisplay.prefix}</Text>
              {hashDisplay.rest}
            </Text>
          : <Text style={styles.hash}>{hashDisplay.rest}</Text>
        }
      </View>

      <View style={styles.meta}>
        <Text style={styles.metaItem}>
          <Text style={styles.metaBold}>{bloc.nb_transactions}</Text> tx
        </Text>
        <Text style={styles.metaItem}>
          nonce <Text style={styles.metaBold}>{fmtNum(bloc.nonce)}</Text>
        </Text>
        {!isGenesis && (
          <Text style={styles.metaItem}>
            <Text style={styles.metaBold}>{bloc.temps_minage}s</Text>
          </Text>
        )}
        <Text style={styles.metaItem}>{fmtTime(bloc.horodatage)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.bg,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.border,
    padding: 14,
    minWidth: 200,
    marginRight: 12,
    ...shadows.sm,
  },
  genesis: {
    borderColor: '#FDE68A',
    backgroundColor: colors.orangeLight,
  },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginBottom: 10,
  },
  num:        { fontSize: 14, fontWeight: '800', color: colors.blue },
  numGenesis: { color: colors.orange },
  validDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.green },
  hashBox: {
    backgroundColor: colors.white, borderRadius: 6,
    borderWidth: 1, borderColor: colors.border,
    paddingHorizontal: 8, paddingVertical: 6, marginBottom: 10,
  },
  hash:       { fontFamily: 'monospace', fontSize: 11, color: colors.text3 },
  hashZeros:  { color: colors.green, fontWeight: '700' },
  meta:       { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  metaItem:   { fontSize: 11, color: colors.text3 },
  metaBold:   { fontWeight: '700', color: colors.text },
});
