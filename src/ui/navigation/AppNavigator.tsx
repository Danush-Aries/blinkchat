import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { NavigationContainer } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import { THEME } from '../../theme';
import { BlinkText } from '../components/BlinkText';

import HomeScreen from '../screens/HomeScreen';
import ChatScreen from '../screens/ChatScreen';
import ContactsScreen from '../screens/ContactsScreen';
import IdentityScreen from '../screens/IdentityScreen';
import SettingsScreen from '../screens/SettingsScreen';
import TopologyScreen from '../screens/TopologyScreen';
import KeyVerificationScreen from '../screens/KeyVerificationScreen';

export type RootStackParamList = {
  Home: undefined;
  Chat: {
    peerPubkey: string;
    nickname?: string;
    peerX25519PubKey?: string;
  };
  KeyVerification: {
    peerPubkey?: string;
    nickname?: string;
  };
};

const Tab = createBottomTabNavigator();
const Stack = createStackNavigator<RootStackParamList>();

const tabBarStyle = StyleSheet.create({
  bar: {
    backgroundColor: THEME.colors.surface,
    borderTopWidth: 0,
    height: 60,
    paddingBottom: 8,
  },
});

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <BlinkText
      size="xs"
      color={focused ? 'neonMint' : 'textMuted'}
      style={{ fontWeight: focused ? 'bold' : 'normal', letterSpacing: 1 }}
    >
      {label}
    </BlinkText>
  );
}

function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: THEME.colors.surface },
        headerTintColor: THEME.colors.text,
        headerBackTitle: '',
      }}
    >
      <Stack.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ title: 'Secure Chat' }}
      />
      <Stack.Screen
        name="KeyVerification"
        component={KeyVerificationScreen}
        options={{ title: 'Verify Identity' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={{
          tabBarStyle: tabBarStyle.bar,
          tabBarActiveTintColor: THEME.colors.primary,
          tabBarInactiveTintColor: THEME.colors.textMuted,
          tabBarShowLabel: false,
          headerShown: false,
        }}
      >
        <Tab.Screen
          name="HomeTab"
          component={HomeStack}
          options={{
            title: 'Chats',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="CHATS" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Contacts"
          component={ContactsScreen}
          options={{
            title: 'Peers',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="PEERS" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Topology"
          component={TopologyScreen}
          options={{
            title: 'Mesh',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="MESH" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Identity"
          component={IdentityScreen}
          options={{
            title: 'Identity',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="ID" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            tabBarIcon: ({ focused }) => (
              <TabIcon label="CFG" focused={focused} />
            ),
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
