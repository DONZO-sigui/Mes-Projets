import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api';
import { colors, shadows, card } from '../theme';
import { fmtUSD, fmtNum } from '../utils/formatters';
import KPICard from '../components/KPICard';
import EmptyState from '../components/EmptyState';

export default function DashboardScreen() {
  const [stats, setStats]         = useState(null);
  const [loading, setLoading]     = useState(true);
  const [simulating, setSimul]    = useState(false);
  const [nbTx, setNbTx]           = useState(10);
  const [simLog, setSimLog]       = useState([]);
  const [refreshing, setRefresh]  = useState(false);

  const loadStats = async () => {
    try {
      const data = await api.getStats();
      setStats(data?.volume_total !== undefined ? data : null);
    } catch (_) {
      setStats(null);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => {
    loadStats();
    const t = setInterval(loadStats, 10_000);
    return () => clearInterval(t);
  }, []));

  const onRefresh = async () => {
    setRefresh(true);
    await loadStats();
    setRefresh(false);
  };

  const handleSimulation = async () => {
    setSimul(true);
    setSimLog([`⚡ Lancement de ${nbTx} transactions…`]);
    try {
      const res = await api.simulate(nbTx);
      if (res?.succes) {
        const logs = (res.blocs || []).map(
          b => `✓ Bloc #${b.index} · ${b.nb_transactions} tx · nonce=${fmtNum(b.nonce)} · ${b.hash.substring(0, 10)}… · ${b.temps_minage}s`
        );
        logs.push(`🔒 Économie : ${fmtUSD(res.stats?.economie_wu || 0)} vs Western Union`);
        setSimLog(logs);
        if (res.stats) setStats(res.stats);
      }
    } catch (e) {
      setSimLog([`❌ ${e.message}`]);
    } finally {
      setSimul(false);
    }
  };

  const handleReset = () =>
    Alert.alert('Réinitialiser', 'Effacer toute la blockchain ?', [
      { text: 'Annuler', style: 'cancel' },
      {
        text: 'Réinitialiser', style: 'destructive',
        onPress: async () => {
          try {
            await api.reset();
            setSimLog(['↺ Blockchain réinitialisée']);
            setStats(null);
            await loadStats();
          } catch (e) {
            Alert.alert('Erreur', e.message);
          }
        },
      },
    ]);

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={colors.blue} /></View>;
  }

  const maxFrais = stats?.frais_wu || 1;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.blue} />}
    >
      {/* Indicateur chaîne */}
      <View style={[styles.chainBadge, { backgroundColor: stats?.chaine_valide !== false ? colors.greenLight : colors.redLight }]}>
        <View style={[styles.chainDot, { backgroundColor: stats?.chaine_valide !== false ? colors.green : colors.red }]} />
        <Text style={[styles.chainText, { color: stats?.chaine_valide !== false ? colors.green : colors.red }]}>
          {stats?.chaine_valide !== false ? 'Chaîne valide' : 'Chaîne invalide'}
          {stats ? `  ·  ${stats.nb_blocs} blocs  ·  ${stats.nb_transactions} tx` : ''}
        </Text>
      </View>

      {/* KPI grid 2×2 */}
      <View style={styles.kpiRow}>
        <KPICard label="Volume total"     value={stats ? fmtUSD(stats.volume_total)     : '$0'} sub={`${fmtNum(stats?.nb_transactions || 0)} tx`} color={colors.blue}   />
        <KPICard label="Frais GNF-Token"  value={stats ? fmtUSD(stats.frais_blockchain) : '$0'} sub="Taux : 0,1 %"         color={colors.green}  />
      </View>
      <View style={styles.kpiRow}>
        <KPICard label="Frais W. Union"   value={stats ? fmtUSD(stats.frais_wu)         : '$0'} sub="Taux : 8,0 %"         color={colors.red}    />
        <KPICard label="Économie réalisée" value={stats ? fmtUSD(stats.economie_wu)      : '$0'} sub="vs Western Union"     color={colors.orange} />
      </View>

      {/* Comparaison frais */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Comparaison des frais</Text>
        {[
          { name: 'GNF-Token',       rate: '0,1 %', val: stats?.frais_blockchain || 0, color: colors.green  },
          { name: 'MTN Mobile Money', rate: '3,5 %', val: stats?.frais_mtn        || 0, color: colors.orange },
          { name: 'Western Union',    rate: '8,0 %', val: stats?.frais_wu          || 0, color: colors.red   },
        ].map(({ name, rate, val, color }) => {
          const pct = Math.max((val / maxFrais) * 100, 2);
          return (
            <View key={name} style={styles.barRow}>
              <View style={styles.barInfo}>
                <Text style={styles.barName}>{name}</Text>
                <Text style={[styles.barRate, { color }]}>{rate}</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color + '30', borderRightColor: color, borderRightWidth: 2 }]} />
                <Text style={[styles.barLabel, { color }]}>{fmtUSD(val)}</Text>
              </View>
            </View>
          );
        })}
      </View>

      {/* Géographie */}
      {stats?.repartition && Object.keys(stats.repartition).length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Répartition géographique</Text>
          {Object.entries(stats.repartition).map(([ville, vol], i) => {
            const pct = ((vol / stats.volume_total) * 100).toFixed(1);
            return (
              <View key={ville} style={styles.geoRow}>
                <View style={[styles.geoRank, i === 0 && styles.geoRankFirst]}>
                  <Text style={[styles.geoRankNum, i === 0 && { color: colors.blue }]}>{i + 1}</Text>
                </View>
                <Text style={styles.geoVille}>{ville}</Text>
                <View style={styles.geoBarWrap}>
                  <View style={[styles.geoFill, { width: `${pct}%` }]} />
                </View>
                <View style={styles.geoMeta}>
                  <Text style={styles.geoPct}>{pct}%</Text>
                  <Text style={styles.geoVal}>{fmtUSD(vol)}</Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Répartition géographique</Text>
          <EmptyState icon="map-outline" message="Lancez une simulation" />
        </View>
      )}

      {/* Simulation */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Simulation rapide</Text>
        <View style={styles.sliderRow}>
          <Text style={styles.sliderLabel}>Transactions :</Text>
          <Slider
            style={styles.slider}
            minimumValue={5} maximumValue={50} step={5}
            value={nbTx} onValueChange={setNbTx}
            minimumTrackTintColor={colors.blue}
            maximumTrackTintColor={colors.border2}
            thumbTintColor={colors.blue}
          />
          <Text style={styles.sliderVal}>{nbTx}</Text>
        </View>
        <View style={styles.simBtns}>
          <TouchableOpacity
            style={[styles.btnPrimary, simulating && styles.btnDisabled]}
            onPress={handleSimulation}
            disabled={simulating}
          >
            <Text style={styles.btnPrimaryText}>{simulating ? 'Minage…' : '▶  Lancer'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.btnGhost} onPress={handleReset}>
            <Text style={styles.btnGhostText}>↺  Reset</Text>
          </TouchableOpacity>
        </View>
        {simLog.length > 0 && (
          <View style={styles.simLog}>
            {simLog.map((line, i) => (
              <Text key={i} style={[styles.simLine, line.startsWith('❌') && { color: colors.red }]}>
                {line}
              </Text>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content:   { padding: 16, gap: 14, paddingBottom: 32 },
  center:    { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.bg },

  chainBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: 100, paddingVertical: 7, paddingHorizontal: 14,
    alignSelf: 'flex-start',
  },
  chainDot:  { width: 8, height: 8, borderRadius: 4 },
  chainText: { fontSize: 12, fontWeight: '600' },

  kpiRow: { flexDirection: 'row', gap: 12 },

  card: { ...card },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.text, marginBottom: 14 },

  barRow:  { marginBottom: 12 },
  barInfo: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  barName: { fontSize: 12, fontWeight: '500', color: colors.text2 },
  barRate: { fontSize: 11, fontWeight: '700' },
  barTrack: {
    height: 28, backgroundColor: colors.bg2, borderRadius: 6,
    overflow: 'hidden', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.border,
  },
  barFill:  { position: 'absolute', top: 0, left: 0, bottom: 0, borderRadius: 6 },
  barLabel: { fontSize: 11, fontWeight: '600', textAlign: 'right', paddingRight: 8 },

  geoRow:    { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  geoRank:   {
    width: 22, height: 22, borderRadius: 11, backgroundColor: colors.bg2,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center',
  },
  geoRankFirst: { backgroundColor: colors.blueLight, borderColor: colors.blueMid },
  geoRankNum:   { fontSize: 10, fontWeight: '700', color: colors.text3 },
  geoVille:     { width: 80, fontSize: 12, fontWeight: '600', color: colors.text },
  geoBarWrap:   { flex: 1, height: 8, backgroundColor: colors.bg2, borderRadius: 4, overflow: 'hidden' },
  geoFill:      { height: '100%', backgroundColor: colors.blue, borderRadius: 4 },
  geoMeta:      { width: 76, alignItems: 'flex-end' },
  geoPct:       { fontSize: 12, fontWeight: '700', color: colors.blue },
  geoVal:       { fontSize: 10, color: colors.text4 },

  sliderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sliderLabel: { fontSize: 12, color: colors.text3, width: 90 },
  slider:    { flex: 1 },
  sliderVal: { fontSize: 14, fontWeight: '700', color: colors.blue, width: 24, textAlign: 'right' },

  simBtns:     { flexDirection: 'row', gap: 10 },
  btnPrimary:  {
    flex: 1, backgroundColor: colors.blue, borderRadius: 8,
    paddingVertical: 11, alignItems: 'center',
  },
  btnPrimaryText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnDisabled:    { opacity: 0.6 },
  btnGhost: {
    paddingHorizontal: 18, borderRadius: 8, paddingVertical: 11,
    borderWidth: 1, borderColor: colors.border, alignItems: 'center',
  },
  btnGhostText: { color: colors.text3, fontWeight: '600', fontSize: 13 },

  simLog:  {
    marginTop: 12, backgroundColor: colors.bg, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border, padding: 10, gap: 3,
  },
  simLine: { fontFamily: 'monospace', fontSize: 11, color: colors.green, lineHeight: 18 },
});
