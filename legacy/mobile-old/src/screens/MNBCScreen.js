import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { api } from '../api';
import { colors, card } from '../theme';
import { fmtGNF, fmtTime } from '../utils/formatters';
import WalletCard from '../components/WalletCard';
import EmptyState from '../components/EmptyState';

const VILLES = ['Conakry', 'Kindia', 'Kankan', 'Labé', "N'Zérékoré", 'Lola'];

export default function MNBCScreen() {
  const [wallets,   setWallets]   = useState({});
  const [history,   setHistory]   = useState([]);
  const [aml,       setAML]       = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [refreshing, setRefresh]  = useState(false);
  const [tab,       setTab]       = useState('wallets'); // 'wallets' | 'history' | 'aml'

  // Formulaire création
  const [nif,   setNif]   = useState('');
  const [solde, setSolde] = useState('5000');
  const [ville, setVille] = useState('Conakry');
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState(null);

  // Formulaire transfert
  const [nifE,    setNifE]    = useState('');
  const [nifR,    setNifR]    = useState('');
  const [montant, setMontant] = useState('1000');
  const [motif,   setMotif]   = useState('');
  const [transferring, setTransferring] = useState(false);

  const loadAll = async () => {
    try {
      const [w, h, a] = await Promise.all([
        api.mnbc.getWallets(),
        api.mnbc.getHistory(),
        api.mnbc.getAML(),
      ]);
      setWallets(w || {});
      setHistory(Array.isArray(h) ? h : []);
      setAML(Array.isArray(a) ? a : []);
    } catch (_) {}
    finally { setLoading(false); }
  };

  useFocusEffect(useCallback(() => { loadAll(); }, []));

  const onRefresh = async () => {
    setRefresh(true);
    await loadAll();
    setRefresh(false);
  };

  const handleCreer = async () => {
    if (!nif || nif.length !== 9 || !/^\d+$/.test(nif)) {
      setCreateMsg({ ok: false, text: 'NIF invalide : 9 chiffres requis' });
      return;
    }
    setCreating(true);
    setCreateMsg(null);
    try {
      const res = await api.mnbc.createWallet({ nif, solde: parseFloat(solde), ville });
      setCreateMsg({ ok: res.succes, text: res.message });
      if (res.succes) { setNif(''); await loadAll(); }
    } catch (e) {
      setCreateMsg({ ok: false, text: e.message });
    } finally {
      setCreating(false);
    }
  };

  const handleTransfert = async () => {
    const m = parseFloat(montant);
    if (!nifE || !nifR || !m || m <= 0) {
      Alert.alert('Champs manquants', 'Remplissez les NIFs et le montant.');
      return;
    }
    setTransferring(true);
    try {
      const res = await api.mnbc.transfer({ nif_e: nifE, nif_r: nifR, montant: m, motif });
      if (res.succes) {
        Alert.alert('Transfert réussi ✓', `Hash : ${res.result.hash}`);
        setNifE(''); setNifR(''); setMotif('');
        await loadAll();
      } else {
        Alert.alert('Refusé', res.result || 'Transfert échoué');
      }
    } catch (e) {
      Alert.alert('Erreur', e.message);
    } finally {
      setTransferring(false);
    }
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.blue} /></View>;
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
      keyboardShouldPersistTaps="handled"
    >
      {/* ── Créer portefeuille ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Créer un portefeuille</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>NIF guinéen (9 chiffres)</Text>
          <TextInput
            style={styles.input}
            value={nif}
            onChangeText={setNif}
            keyboardType="numeric"
            maxLength={9}
            placeholder="ex : 123456789"
            placeholderTextColor={colors.text4}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Solde initial (GNF-D)</Text>
            <TextInput
              style={styles.input}
              value={solde}
              onChangeText={setSolde}
              keyboardType="numeric"
              placeholderTextColor={colors.text4}
            />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Ville</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {VILLES.map(v => (
                <TouchableOpacity
                  key={v}
                  style={[styles.chip, v === ville && styles.chipActive]}
                  onPress={() => setVille(v)}
                >
                  <Text style={[styles.chipTxt, v === ville && styles.chipTxtActive]}>{v}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>

        {createMsg && (
          <View style={[styles.msgBox, createMsg.ok ? styles.msgOk : styles.msgErr]}>
            <Text style={{ color: createMsg.ok ? colors.green : colors.red, fontSize: 13 }}>
              {createMsg.text}
            </Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.btnPrimary, creating && styles.btnDisabled]}
          onPress={handleCreer}
          disabled={creating}
        >
          {creating
            ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.btnTxt}>+ Créer le portefeuille</Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── Transfert MNBC ── */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Effectuer un transfert</Text>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>NIF émetteur</Text>
            <TextInput style={styles.input} value={nifE} onChangeText={setNifE}
              keyboardType="numeric" maxLength={9} placeholder="NIF émetteur"
              placeholderTextColor={colors.text4} />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>NIF récepteur</Text>
            <TextInput style={styles.input} value={nifR} onChangeText={setNifR}
              keyboardType="numeric" maxLength={9} placeholder="NIF récepteur"
              placeholderTextColor={colors.text4} />
          </View>
        </View>

        <View style={styles.row}>
          <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
            <Text style={styles.label}>Montant (GNF-D)</Text>
            <TextInput style={styles.input} value={montant} onChangeText={setMontant}
              keyboardType="numeric" placeholderTextColor={colors.text4} />
          </View>
          <View style={[styles.formGroup, { flex: 1 }]}>
            <Text style={styles.label}>Motif</Text>
            <TextInput style={styles.input} value={motif} onChangeText={setMotif}
              placeholder="ex : famille…" placeholderTextColor={colors.text4} />
          </View>
        </View>

        <TouchableOpacity
          style={[styles.btnSecondary, transferring && styles.btnDisabled]}
          onPress={handleTransfert}
          disabled={transferring}
        >
          {transferring
            ? <ActivityIndicator color={colors.blue} size="small" />
            : <Text style={styles.btnSecTxt}>⇄  Effectuer le transfert</Text>
          }
        </TouchableOpacity>
      </View>

      {/* ── Onglets ── */}
      <View style={styles.tabBar}>
        {[
          { key: 'wallets', label: `Portefeuilles (${Object.keys(wallets).length})` },
          { key: 'history', label: `Historique (${history.length})`                 },
          { key: 'aml',     label: `⚠ AML (${aml.length})`                         },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tabItem, tab === t.key && styles.tabActive]}
            onPress={() => setTab(t.key)}
          >
            <Text style={[styles.tabTxt, tab === t.key && styles.tabTxtActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Portefeuilles */}
      {tab === 'wallets' && (
        <View style={styles.card}>
          {Object.keys(wallets).length === 0
            ? <EmptyState icon="wallet-outline" message="Aucun portefeuille" />
            : Object.entries(wallets).map(([n, d]) => <WalletCard key={n} nif={n} data={d} />)
          }
        </View>
      )}

      {/* Historique */}
      {tab === 'history' && (
        <View style={styles.card}>
          {history.length === 0
            ? <EmptyState icon="time-outline" message="Aucun transfert" />
            : [...history].reverse().map((tx, i) => (
                <View key={i} style={styles.histItem}>
                  <View style={styles.histTop}>
                    <Text style={styles.histRoute}>{tx.ville_e} → {tx.ville_r}</Text>
                    <Text style={styles.histAmount}>{fmtGNF(tx.montant)}</Text>
                  </View>
                  <Text style={styles.histMeta}>
                    #{tx.hash}{tx.motif ? ' · ' + tx.motif : ''} · {fmtTime(tx.ts)}
                  </Text>
                </View>
              ))
          }
        </View>
      )}

      {/* AML */}
      {tab === 'aml' && (
        <View style={[styles.card, aml.length > 0 && styles.cardAML]}>
          {aml.length === 0
            ? <EmptyState icon="shield-checkmark-outline" message="Aucun incident détecté" />
            : aml.map((inc, i) => (
                <View key={i} style={styles.amlItem}>
                  <View style={styles.amlHeader}>
                    <Ionicons name="warning" size={14} color={colors.red} />
                    <Text style={styles.amlNif}> NIF {inc.nif}</Text>
                  </View>
                  <Text style={styles.amlInfo}>
                    Tentative : {fmtGNF(inc.montant)} · Plafond : {fmtGNF(10000)}
                  </Text>
                  <Text style={styles.amlTime}>{fmtTime(inc.ts)}</Text>
                </View>
              ))
          }
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: 16, gap: 14, paddingBottom: 32 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  card:      { ...card },
  cardAML:   { borderColor: colors.redMid },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 14 },

  formGroup: { marginBottom: 12 },
  label:     { fontSize: 10, fontWeight: '700', color: colors.text3, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  input:     {
    borderWidth: 1.5, borderColor: colors.border, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, color: colors.text,
    backgroundColor: colors.white,
  },
  row: { flexDirection: 'row' },

  chip:        { borderRadius: 100, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6 },
  chipActive:  { borderColor: colors.blue, backgroundColor: colors.blueLight },
  chipTxt:     { fontSize: 11, color: colors.text3, fontWeight: '500' },
  chipTxtActive: { color: colors.blue, fontWeight: '700' },

  msgBox: { borderRadius: 8, padding: 10, marginBottom: 10 },
  msgOk:  { backgroundColor: colors.greenLight, borderWidth: 1, borderColor: colors.greenMid },
  msgErr: { backgroundColor: colors.redLight,   borderWidth: 1, borderColor: colors.redMid   },

  btnPrimary:   { backgroundColor: colors.blue, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnTxt:       { color: '#fff', fontWeight: '700', fontSize: 14 },
  btnSecondary: { borderWidth: 1.5, borderColor: colors.blueMid, backgroundColor: colors.blueLight, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  btnSecTxt:    { color: colors.blue, fontWeight: '700', fontSize: 14 },
  btnDisabled:  { opacity: 0.6 },

  tabBar:     { flexDirection: 'row', backgroundColor: colors.white, borderRadius: 10, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  tabItem:    { flex: 1, paddingVertical: 10, alignItems: 'center' },
  tabActive:  { backgroundColor: colors.blueLight },
  tabTxt:     { fontSize: 11, fontWeight: '600', color: colors.text3 },
  tabTxtActive: { color: colors.blue },

  histItem:   { paddingVertical: 10, borderTopWidth: 1, borderTopColor: colors.border },
  histTop:    { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 },
  histRoute:  { fontSize: 13, fontWeight: '600', color: colors.text },
  histAmount: { fontSize: 13, fontWeight: '700', color: colors.green },
  histMeta:   { fontFamily: 'monospace', fontSize: 10, color: colors.text4 },

  amlItem:   { backgroundColor: colors.redLight, borderRadius: 8, padding: 10, marginBottom: 8 },
  amlHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  amlNif:    { fontSize: 13, fontWeight: '700', color: colors.red },
  amlInfo:   { fontSize: 12, color: colors.text3 },
  amlTime:   { fontSize: 10, color: colors.text4, marginTop: 2 },
});
