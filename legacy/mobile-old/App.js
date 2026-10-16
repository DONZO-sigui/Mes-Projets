import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

import DashboardScreen from './src/screens/DashboardScreen';
import SendScreen      from './src/screens/SendScreen';
import ChainScreen     from './src/screens/ChainScreen';
import MNBCScreen      from './src/screens/MNBCScreen';
import { colors }      from './src/theme';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Dashboard: { active: 'grid',        inactive: 'grid-outline'        },
  Send:      { active: 'send',        inactive: 'send-outline'        },
  Chain:     { active: 'link',        inactive: 'link-outline'        },
  MNBC:      { active: 'wallet',      inactive: 'wallet-outline'      },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" backgroundColor={colors.dark} />
      <NavigationContainer>
        <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              const icons = TAB_ICONS[route.name];
              return (
                <Ionicons
                  name={focused ? icons.active : icons.inactive}
                  size={size}
                  color={color}
                />
              );
            },
            tabBarStyle: {
              backgroundColor: colors.dark,
              borderTopColor: 'rgba(255,255,255,0.08)',
              paddingBottom: 8,
              paddingTop: 6,
              height: 64,
            },
            tabBarActiveTintColor:   colors.blue,
            tabBarInactiveTintColor: '#64748B',
            tabBarLabelStyle: { fontSize: 11, fontWeight: '600', marginTop: 2 },
            headerStyle: {
              backgroundColor: colors.dark,
              shadowColor: 'transparent',
              elevation: 0,
              borderBottomWidth: 0,
            },
            headerTintColor: '#F8FAFC',
            headerTitleStyle: { fontWeight: '700', fontSize: 17 },
            headerTitleAlign: 'center',
          })}
        >
          <Tab.Screen name="Dashboard" component={DashboardScreen} options={{ title: 'Dashboard' }} />
          <Tab.Screen name="Send"      component={SendScreen}      options={{ title: 'Envoyer'   }} />
          <Tab.Screen name="Chain"     component={ChainScreen}     options={{ title: 'Chaîne'    }} />
          <Tab.Screen name="MNBC"      component={MNBCScreen}      options={{ title: 'MNBC'      }} />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
