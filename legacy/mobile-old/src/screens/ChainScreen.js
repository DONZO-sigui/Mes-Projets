import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, FlatList, TouchableOpacity,
  StyleSheet, ActivityIndicator, RefreshControl, Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { colors, card, shadows } from '../theme';
import { fmtNum, fmtTime, fmtUSD } from '../utils/formatters';
import BlockCard from '../components/BlockCard';
import EmptyState from '../components/EmptyState';

export default function ChainScreen() {
  const [chain, setChain]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [refreshing, setRefresh] = useState(false);
  const [selected, setSelected] = useState(null);

  const loadChain = async () => {
    try {
      const data = await api.getChain();
      setChain(Array.isArray(data) ? data : []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadChain(); }, []));

  const onRefresh = async () => {
    setRefresh(true);
    await loadChain();
    setRefresh(false);
  };

  const blocs = chain.slice(1);   // exclure genesis pour le compte
  const nbTx  = chain.reduce((s, b) => s + b.nb_transactions, 0);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.blue} /></View>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      >
        {/* Stats rapides */}
        <View style={styles.statsRow}>
          {[
            { label: 'Blocs minés', val: blocs.length, color: colors.blue   },
            { label: 'Transactions', val: nbTx,         color: colors.green  },
            { label: 'Difficulté',   val: 'd = 3',      color: colors.orange },
          ].map(({ label, val, color }) => (
            <View key={label} style={[styles.statCard, { borderTopColor: color }]}>
              <Text style={[styles.statVal, { color }]}>{val}</Text>
              <Text style={styles.statLabel}>{label}</Text>
            </View>
          ))}
        </View>

        {/* Chaîne horizontale */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>Structure de la chaîne</Text>
            <View style={styles.badgeGreen}>
              <Text style={styles.badgeGreenText}>{blocs.length} blocs</Text>
            </View>
          </View>

          {chain.length <= 1 ? (
            <EmptyState icon="cube-outline" message="Lancez une simulation pour voir la chaîne" />
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -4 }}>
              {chain.map((bloc, i) => (
                <View key={bloc.index} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  {i > 0 && (
                    <Text style={styles.connector}>←</Text>
                  )}
                  <TouchableOpacity onPress={() => setSelected(bloc)}>
                    <BlockCard bloc={bloc} isGenesis={bloc.index === 0} />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>

        {/* Liste des blocs (vertical) */}
        {blocs.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Derniers blocs</Text>
            {[...blocs].reverse().slice(0, 10).map((bloc) => (
              <TouchableOpacity key={bloc.index} style={styles.blocRow} onPress={() => setSelected(bloc)}>
                <View style={styles.blocLeft}>
                  <Text style={styles.blocIdx}>#{bloc.index}</Text>
                  <View>
                    <Text style={styles.blocHash}>{bloc.hash.substring(0, 18)}…</Text>
                    <Text style={styles.blocMeta}>{bloc.nb_transactions} tx · nonce {fmtNum(bloc.nonce)} · {bloc.temps_minage}s</Text>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.text4} />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Modal détail bloc */}
      <Modal visible={!!selected} transparent animationType="slide" onRequestClose={() => setSelected(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bloc #{selected?.index}</Text>
              <TouchableOpacity onPress={() => setSelected(null)}>
                <Ionicons name="close" size={22} color={colors.text3} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Field label="Hash"         value={selected?.hash}           mono />
              <Field label="Hash précédent" value={selected?.hash_precedent} mono />
              <Field label="Nonce"        value={fmtNum(selected?.nonce)}  />
              <Field label="Temps minage" value={`${selected?.temps_minage}s`} />
              <Field label="Horodatage"   value={selected ? fmtTime(selected.horodatage) : '—'} />

              {selected?.transactions?.length > 0 && (
                <>
                  <Text style={styles.txTitle}>{selected.nb_transactions} transaction(s)</Text>
                  {selected.transactions.map((tx, i) => (
                    <View key={i} style={styles.txDetail}>
                      <Text style={styles.txDetailRoute}>{tx.source_ville} → {tx.ville_dest}</Text>
                      <View style={styles.txDetailRow}>
                        <Text style={styles.txDetailLabel}>Montant</Text>
                        <Text style={styles.txDetailVal}>{fmtUSD(tx.montant)}</Text>
                      </View>
                      <View style={styles.txDetailRow}>
                        <Text style={styles.txDetailLabel}>Frais</Text>
                        <Text style={[styles.txDetailVal, { color: colors.green }]}>{fmtUSD(tx.frais)}</Text>
                      </View>
                      <Text style={styles.txDetailSig}>#{tx.signature}</Text>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Field({ label, value, mono }) {
  return (
    <View style={fStyles.row}>
      <Text style={fStyles.label}>{label}</Text>
      <Text style={[fStyles.val, mono && fStyles.mono]} numberOfLines={2}>{value || '—'}</Text>
    </View>
  );
}

const fStyles = StyleSheet.create({
  row:   { marginBottom: 10 },
  label: { fontSize: 10, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 2 },
  val:   { fontSize: 13, color: colors.text, fontWeight: '500' },
  mono:  { fontFamily: 'monospace', fontSize: 11, color: colors.blue },
});

const styles = StyleSheet.create({
  center:  { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },
  content: { padding: 16, gap: 14, paddingBottom: 32 },

  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1, backgroundColor: colors.white, borderRadius: 10, borderWidth: 1,
    borderColor: colors.border, borderTopWidth: 3, padding: 12, alignItems: 'center', ...shadows.sm,
  },
  statVal:   { fontSize: 20, fontWeight: '800', marginBottom: 3 },
  statLabel: { fontSize: 10, color: colors.text3, fontWeight: '600', textAlign: 'center' },

  card:       { ...card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  cardTitle:  { fontSize: 14, fontWeight: '700', color: colors.text },
  badgeGreen: { backgroundColor: colors.greenLight, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3 },
  badgeGreenText: { fontSize: 11, fontWeight: '600', color: colors.green },
  connector:  { color: colors.border2, fontSize: 18, marginRight: 4 },

  blocRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderTopWidth: 1, borderTopColor: colors.border,
  },
  blocLeft:  { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  blocIdx:   { fontSize: 14, fontWeight: '800', color: colors.blue, width: 32 },
  blocHash:  { fontFamily: 'monospace', fontSize: 11, color: colors.text3 },
  blocMeta:  { fontSize: 11, color: colors.text4, marginTop: 2 },

  modalOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    maxHeight: '80%', paddingTop: 6,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border,
  },
  modalTitle: { fontSize: 16, fontWeight: '700', color: colors.text },
  modalBody:  { padding: 16 },

  txTitle:     { fontSize: 13, fontWeight: '700', color: colors.text, marginTop: 8, marginBottom: 8 },
  txDetail:    { backgroundColor: colors.bg, borderRadius: 8, padding: 10, marginBottom: 8 },
  txDetailRoute: { fontSize: 12, fontWeight: '700', color: colors.blue, marginBottom: 6 },
  txDetailRow:  { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  txDetailLabel: { fontSize: 11, color: colors.text3 },
  txDetailVal:   { fontSize: 12, fontWeight: '600', color: colors.text },
  txDetailSig:   { fontFamily: 'monospace', fontSize: 10, color: colors.text4, marginTop: 4 },
});
