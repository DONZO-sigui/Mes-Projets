import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput } from 'react-native';
import { getUniversities } from '../api/universities';
import Loading from '../components/Loading';

const AnnuaireUniversites = ({ navigation }) => {
  const [universities, setUniversities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetchUniversities();
  }, []);

  const fetchUniversities = async () => {
    try {
      setLoading(true);
      const data = await getUniversities();
      setUniversities(data.data || data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card}
      onPress={() => navigation.navigate('FicheUniversite', { id: item.id })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.logoPlaceholder}>
          <Text style={styles.logoText}>{item.acronym || item.name.substring(0, 2).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.city}>{item.city} • {item.founded_year}</Text>
        </View>
      </View>
      <View style={[styles.badge, item.status === 'publique' ? styles.badgePublic : styles.badgePrivate]}>
        <Text style={[styles.badgeText, item.status === 'publique' ? styles.badgeTextPublic : styles.badgeTextPrivate]}>
          {item.status === 'publique' ? 'Publique' : 'Privée'}
        </Text>
      </View>
    </TouchableOpacity>
  );

  const filteredData = universities.filter(u => u.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <TextInput 
          style={styles.searchInput}
          placeholder="Rechercher une université..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {loading ? (
        <Loading />
      ) : (
        <FlatList 
          data={filteredData}
          keyExtractor={item => item.id.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          ListEmptyComponent={<Text style={styles.emptyText}>Aucune université trouvée.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  searchContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  searchInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    fontSize: 16,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#e0f2fe',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logoText: {
    color: '#0284c7',
    fontWeight: 'bold',
    fontSize: 16,
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#0f172a',
  },
  city: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 2,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgePublic: {
    backgroundColor: '#dcfce7',
  },
  badgePrivate: {
    backgroundColor: '#dbeafe',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  badgeTextPublic: {
    color: '#166534',
  },
  badgeTextPrivate: {
    color: '#1e40af',
  },
  emptyText: {
    textAlign: 'center',
    color: '#64748b',
    marginTop: 24,
  }
});

export default AnnuaireUniversites;
