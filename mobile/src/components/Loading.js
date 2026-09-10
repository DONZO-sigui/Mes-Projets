import React from 'react';
import { View, ActivityIndicator, StyleSheet, Text } from 'react-native';

const Loading = ({ message = 'Chargement en cours...' }) => {
  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#0ea5e9" />
      <Text style={styles.text}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  text: {
    marginTop: 10,
    color: '#64748b',
    fontSize: 16,
  },
});

export default Loading;
