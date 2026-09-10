import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { getUniversities } from '../api/universities';
import Loading from '../components/Loading';

const Accueil = ({ navigation }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getUniversities({ limit: 4 });
        setStats({ universitiesCount: data.total || 15 });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) return <Loading />;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.title}>Trouvez votre voie avec</Text>
        <Text style={styles.brand}>OrientGuinée</Text>
        <Text style={styles.subtitle}>
          Plateforme d'orientation pour les nouveaux bacheliers guinéens. Découvrez les universités, les filières et passez notre test.
        </Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={() => navigation.navigate('TestOrientation')}
        >
          <Text style={styles.primaryButtonText}>Passer le test d'orientation</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton}
          onPress={() => navigation.navigate('AnnuaireUniversites')}
        >
          <Text style={styles.secondaryButtonText}>Voir les universités</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[styles.secondaryButton, { borderColor: 'transparent' }]}
          onPress={() => navigation.navigate('Login')}
        >
          <Text style={[styles.secondaryButtonText, { color: '#64748b' }]}>Déjà un compte ? Se connecter</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{stats?.universitiesCount}+</Text>
          <Text style={styles.statLabel}>Universités</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>120+</Text>
          <Text style={styles.statLabel}>Filières</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>300+</Text>
          <Text style={styles.statLabel}>Métiers</Text>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  hero: {
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  brand: {
    fontSize: 32,
    fontWeight: '900',
    color: '#0ea5e9',
    textAlign: 'center',
    marginVertical: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 8,
  },
  buttonContainer: {
    paddingHorizontal: 24,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  secondaryButtonText: {
    color: '#0ea5e9',
    fontSize: 16,
    fontWeight: 'bold',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 24,
    marginTop: 10,
  },
  statCard: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    width: '30%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  statLabel: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  }
});

export default Accueil;
