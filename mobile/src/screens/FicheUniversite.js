import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { getUniversityById } from '../api/universities';
import Loading from '../components/Loading';

const FicheUniversite = ({ route }) => {
  const { id } = route.params;
  const [university, setUniversity] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUni = async () => {
      try {
        const data = await getUniversityById(id);
        setUniversity(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchUni();
  }, [id]);

  if (loading) return <Loading />;
  if (!university) return <View style={styles.centered}><Text>Université introuvable</Text></View>;

  const faculties = university.faculties || [];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{university.name}</Text>
        {university.acronym && <Text style={styles.subtitle}>{university.acronym}</Text>}
        
        <View style={styles.badgeContainer}>
          <Text style={styles.badgeText}>{university.status === 'publique' ? 'Publique' : 'Privée'}</Text>
        </View>
      </View>

      <View style={styles.infoSection}>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Ville:</Text>
          <Text style={styles.infoValue}>{university.city}</Text>
        </View>
        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Fondation:</Text>
          <Text style={styles.infoValue}>{university.founded_year}</Text>
        </View>
        {university.website && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Site web:</Text>
            <Text style={[styles.infoValue, { color: '#0ea5e9' }]}>{university.website}</Text>
          </View>
        )}
      </View>

      <View style={styles.descSection}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{university.description || "Aucune description disponible."}</Text>
      </View>

      <View style={styles.descSection}>
        <Text style={styles.sectionTitle}>Facultés & Départements</Text>
        {faculties.length > 0 ? (
          faculties.map(fac => (
            <View key={fac.id} style={styles.facCard}>
              <Text style={styles.facName}>{fac.name}</Text>
              <Text style={styles.facDesc}>{fac.description}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.description}>Aucune faculté répertoriée.</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#0f172a',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: '#64748b',
    marginTop: 4,
  },
  badgeContainer: {
    marginTop: 12,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    color: '#0284c7',
    fontWeight: 'bold',
    fontSize: 12,
  },
  infoSection: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  infoLabel: {
    width: 100,
    fontSize: 14,
    fontWeight: 'bold',
    color: '#475569',
  },
  infoValue: {
    flex: 1,
    fontSize: 14,
    color: '#1e293b',
  },
  descSection: {
    backgroundColor: '#fff',
    marginTop: 12,
    padding: 16,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  facCard: {
    backgroundColor: '#f8fafc',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  facName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  facDesc: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4,
  }
});

export default FicheUniversite;
