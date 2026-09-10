import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert } from 'react-native';

const Login = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs.");
      return;
    }
    
    setLoading(true);
    // Simulation API
    setTimeout(() => {
      setLoading(false);
      // navigation.replace('ProfilEtudiant') ou navigation.goBack()
      Alert.alert("Succès", "Connexion réussie !");
      navigation.navigate('Accueil');
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Connexion Étudiant</Text>
        <Text style={styles.subtitle}>Accédez à vos résultats sauvegardés</Text>
      </View>

      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Adresse email étudiante"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <TextInput
          style={styles.input}
          placeholder="Mot de passe"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.primaryButtonText}>
            {loading ? "Connexion..." : "Se connecter"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.linkButton}>
          <Text style={styles.linkText}>Pas encore de compte ? S'inscrire</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.adminButton}
          onPress={() => navigation.navigate('LoginAdmin')}
        >
          <Text style={styles.adminButtonText}>Je suis un administrateur</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 24,
  },
  header: {
    marginTop: 40,
    marginBottom: 40,
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
    marginTop: 8,
    textAlign: 'center',
  },
  form: {
    gap: 16,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 16,
    borderRadius: 8,
    fontSize: 16,
  },
  primaryButton: {
    backgroundColor: '#0ea5e9',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    alignItems: 'center',
    padding: 12,
  },
  linkText: {
    color: '#0ea5e9',
    fontSize: 14,
    fontWeight: 'bold',
  },
  adminButton: {
    alignItems: 'center',
    padding: 12,
    marginTop: 40,
  },
  adminButtonText: {
    color: '#94a3b8',
    fontSize: 14,
  }
});

export default Login;
