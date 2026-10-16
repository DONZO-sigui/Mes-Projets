import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

export default function EmptyState({ icon = 'hourglass-outline', message = 'Aucune donnée' }) {
  return (
    <View style={styles.container}>
      <Ionicons name={icon} size={36} color={colors.border2} />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 32, gap: 10,
  },
  text: { fontSize: 13, color: colors.text4 },
});
