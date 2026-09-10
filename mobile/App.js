import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import Accueil from './src/screens/Accueil';
import TestOrientation from './src/screens/TestOrientation';
import ResultatsTest from './src/screens/ResultatsTest';
import AnnuaireUniversites from './src/screens/AnnuaireUniversites';
import FicheUniversite from './src/screens/FicheUniversite';
import Login from './src/screens/Login';
import LoginAdmin from './src/screens/LoginAdmin';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0ea5e9',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="Accueil" 
          component={Accueil} 
          options={{ title: 'OrientGuinée' }} 
        />
        <Stack.Screen name="Login" component={Login} options={{ title: 'Se Connecter' }} />
        <Stack.Screen name="LoginAdmin" component={LoginAdmin} options={{ title: 'Administration' }} />
        <Stack.Screen name="TestOrientation" component={TestOrientation} options={{ title: 'Test d\'Orientation' }} />
        <Stack.Screen name="ResultatsTest" component={ResultatsTest} options={{ title: 'Vos Résultats' }} />
        <Stack.Screen name="AnnuaireUniversites" component={AnnuaireUniversites} options={{ title: 'Universités' }} />
        <Stack.Screen name="FicheUniversite" component={FicheUniversite} options={{ title: 'Fiche Université' }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
