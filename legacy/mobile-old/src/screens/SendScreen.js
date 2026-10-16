import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { colors, card } from '../theme';
import { fmtUSD, fmtTime, truncateHash } from '../utils/formatters';

const VILLES_DIASPORA = ['Paris', 'New York', 'Dubai', 'Lyon', 'Londres'];
const VILLES_GUINEE   = ['Conakry', 'Kindia', 'Kankan', 'Labé', "N'Zérékoré"];

function Picker({ label, options, value, onChange }) {
  return (
    <View style={styles.formGroup}>
      <Text style={styles.label}>{label}</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt}
            style={[styles.chip, value === opt && styles.chipActive]}
            onPress={() => onChange(opt)}
          >
            <Text style={[styles.chipText, value === opt && styles.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

export default function SendScreen() {
  const [source, setSource]     = useState('Paris');
  const [dest, setDest]         = useState('Conakry');
  const [montant, setMontant]   = useState('500');
  const [sending, setSending]   = useState(false);
  const [history, setHistory]   = useState([]);

  const m     = parseFloat(montant) || 0;
  const frais = m * 0.001;
  const eco   = m * 0.08 - frais;

  const handleEnvoyer = async () => {
    if (m <= 0) {
      Alert.alert('Montant invalide', 'Veuillez saisir un montant supérieur à 0.');
      return;
    }
    setSending(true);
    try {
      const res = await api.sendTransaction({ source, destination: dest, montant: m });
      if (res?.succes) {
        setHistory(prev => [res.transaction, ...prev].slice(0, 20));
        Alert.alert('Succès ✓', `Bloc #${res.bloc.index} miné en ${res.bloc.temps_minage}s`);
      } else {
        Alert.alert('Erreur', res?.erreur || 'Transaction échouée');
      }
    } catch (e) {
      Alert.alert('Erreur réseau', e.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">

      {/* Formulaire */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Nouveau transfert</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>Diaspora → Guinée</Text></View>
        </View>

        <Picker label="Ville d'origine" options={VILLES_DIASPORA} value={source} onChange={setSource} />

        <View style={styles.arrowRow}>
          <View style={styles.divider} />
          <View style={styles.arrowCircle}>
            <Ionicons name="arrow-forward" size={16} color={colors.blue} />
          </View>
          <View style={styles.divider} />
        </View>

        <Picker label="Ville de destination" options={VILLES_GUINEE} value={dest} onChange={setDest} />

        <View style={styles.formGroup}>
          <Text style={styles.label}>Montant (USD)</Text>
          <View style={styles.inputWrap}>
            <Text style={styles.inputPrefix}>$</Text>
            <TextInput
              style={styles.input}
              value={montant}
              onChangeText={setMontant}
              keyboardType="numeric"
              placeholder="500"
              placeholderTextColor={colors.text4}
            />
          </View>
        </View>

        {/* Preview */}
        <View style={styles.preview}>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Montant envoyé</Text>
            <Text style={styles.previewVal}>{fmtUSD(m)}</Text>
          </View>
          <View style={styles.dividerH} />
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Frais GNF-Token (0,1 %)</Text>
            <Text style={[styles.previewVal, { color: colors.green }]}>{fmtUSD(frais)}</Text>
          </View>
          <View style={styles.previewRow}>
            <Text style={styles.previewLabel}>Frais Western Union (8 %)</Text>
            <Text style={[styles.previewVal, { color: colors.red }]}>{fmtUSD(m * 0.08)}</Text>
          </View>
          <View style={styles.dividerH} />
          <View style={styles.previewRow}>
            <Text style={[styles.previewLabel, { fontWeight: '700' }]}>💰 Vous économisez</Text>
            <Text style={[styles.previewVal, { color: colors.gold, fontSize: 16, fontWeight: '800' }]}>{fmtUSD(eco)}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btnSend, sending && styles.btnDisabled]}
          onPress={handleEnvoyer}
          disabled={sending}
        >
          {sending
            ? <ActivityIndicator color="#fff" size="small" />
            : <><Ionicons name="send" size={16} color="#fff" style={{ marginRight: 8 }} />
               <Text style={styles.btnSendText}>Envoyer via GNF-Token</Text></>
          }
        </TouchableOpacity>
      </View>

      {/* Historique récent */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Dernières transactions</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>{history.length} tx</Text></View>
        </View>
        {history.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="time-outline" size={32} color={colors.border2} />
            <Text style={styles.emptyText}>Aucune transaction encore</Text>
          </View>
        ) : (
          history.map((tx, i) => (
            <View key={i} style={styles.txItem}>
              <View style={styles.txTop}>
                <Text style={styles.txRoute}>{tx.source_ville} → {tx.ville_dest}</Text>
                <Text style={styles.txAmount}>{fmtUSD(tx.montant)}</Text>
              </View>
              <View style={styles.txBottom}>
                <Text style={styles.txFee}>Frais : {fmtUSD(tx.frais)}</Text>
                <Text style={styles.txHash}>#{tx.signature}</Text>
                <Text style={styles.txTime}>{fmtTime(tx.horodatage)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: 16, gap: 14, paddingBottom: 32 },

  card:       { ...card },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  cardTitle:  { fontSize: 14, fontWeight: '700', color: colors.text },
  badge:      { backgroundColor: colors.blueLight, borderRadius: 100, paddingHorizontal: 10, paddingVertical: 3 },
  badgeText:  { fontSize: 11, fontWeight: '600', color: colors.blue },

  formGroup: { marginBottom: 14 },
  label:     { fontSize: 10, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6 },
  chips:     { flexDirection: 'row' },
  chip:      {
    borderRadius: 100, borderWidth: 1.5, borderColor: colors.border,
    paddingHorizontal: 12, paddingVertical: 6, marginRight: 8, backgroundColor: colors.white,
  },
  chipActive:     { borderColor: colors.blue, backgroundColor: colors.blueLight },
  chipText:       { fontSize: 12, color: colors.text3, fontWeight: '500' },
  chipTextActive: { color: colors.blue, fontWeight: '700' },

  arrowRow:   { flexDirection: 'row', alignItems: 'center', marginVertical: 6 },
  divider:    { flex: 1, height: 1, backgroundColor: colors.border },
  arrowCircle: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: colors.blueLight,
    alignItems: 'center', justifyContent: 'center', marginHorizontal: 10,
  },

  inputWrap:   { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.border, borderRadius: 8, overflow: 'hidden' },
  inputPrefix: { paddingHorizontal: 12, fontSize: 15, fontWeight: '700', color: colors.text3 },
  input:       { flex: 1, paddingVertical: 10, paddingRight: 12, fontSize: 15, color: colors.text },

  preview:     { backgroundColor: colors.bg, borderRadius: 8, borderWidth: 1, borderColor: colors.border, padding: 12, marginTop: 4, marginBottom: 14, gap: 2 },
  previewRow:  { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  previewLabel: { fontSize: 13, color: colors.text2 },
  previewVal:  { fontSize: 13, fontWeight: '700', color: colors.text },
  dividerH:    { height: 1, backgroundColor: colors.border, marginVertical: 4 },

  btnSend: {
    backgroundColor: colors.blue, borderRadius: 10, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
  },
  btnSendText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  btnDisabled: { opacity: 0.6 },

  empty:     { alignItems: 'center', paddingVertical: 24, gap: 8 },
  emptyText: { color: colors.text4, fontSize: 13 },

  txItem:   { borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 10, marginTop: 8 },
  txTop:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  txRoute:  { fontSize: 13, fontWeight: '600', color: colors.text },
  txAmount: { fontSize: 13, fontWeight: '700', color: colors.green },
  txBottom: { flexDirection: 'row', gap: 10 },
  txFee:    { fontSize: 11, color: colors.text3 },
  txHash:   { fontSize: 11, fontFamily: 'monospace', color: colors.blue },
  txTime:   { fontSize: 11, color: colors.text4 },
});
