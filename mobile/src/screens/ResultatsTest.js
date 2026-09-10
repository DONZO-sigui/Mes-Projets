import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';

const ResultatsTest = ({ route, navigation }) => {
  const { results } = route.params || {};

  if (!results) {
    return (
      <View style={styles.centered}>
        <Text>Aucun résultat trouvé.</Text>
      </View>
    );
  }

  const { recommended_jobs = [], recommended_programs = [], recommended_universities = [] } = results;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Vos Résultats</Text>
        <Text style={styles.subtitle}>Voici les parcours qui vous correspondent le mieux.</Text>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: '#0369a1' }]}>Métiers Recommandés</Text>
        {recommended_jobs.map(job => (
          <View key={job.id} style={styles.card}>
            <Text style={styles.cardTitle}>{job.name}</Text>
            <Text style={styles.cardDesc} numberOfLines={2}>{job.description}</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: '#4338ca' }]}>Filières (Programmes)</Text>
        {recommended_programs.map(prog => (
          <View key={prog.id} style={styles.card}>
            <Text style={styles.cardTitle}>{prog.name}</Text>
            <Text style={styles.cardDesc}>{prog.level} • {prog.duration_years} ans</Text>
          </View>
        ))}
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: '#047857' }]}>Où étudier ?</Text>
        {recommended_universities.map(uni => (
          <TouchableOpacity 
            key={uni.id} 
            style={styles.card}
            onPress={() => navigation.navigate('FicheUniversite', { id: uni.id })}
          >
            <Text style={styles.cardTitle}>{uni.name}</Text>
            <Text style={styles.cardDesc}>{uni.city} • {uni.status === 'publique' ? 'Publique' : 'Privée'}</Text>
            <Text style={styles.linkText}>Voir l'université &rarr;</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity 
        style={styles.retryButton}
        onPress={() => navigation.navigate('TestOrientation')}
      >
        <Text style={styles.retryButtonText}>Repasser le test</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    marginLeft: 4,
  },
  card: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  cardDesc: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 4,
  },
  linkText: {
    color: '#0ea5e9',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 8,
  },
  retryButton: {
    margin: 24,
    alignItems: 'center',
    paddingVertical: 12,
  },
  retryButtonText: {
    color: '#0ea5e9',
    fontSize: 16,
    fontWeight: 'bold',
  }
});

export default ResultatsTest;
