import '../global.css';
import 'react-native-url-polyfill/auto';
import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, ActivityIndicator } from 'react-native';
import { useFonts } from 'expo-font';
import { Delius_400Regular } from '@expo-google-fonts/delius';
import { supabase } from '@/lib/supabase';

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [fontsLoaded] = useFonts({ Delius_400Regular });

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        await supabase.auth.signInAnonymously();
      }
      setReady(true);
    }
    init();
  }, []);

  if (!ready || !fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#fffbf1', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#72bf83" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView className="flex-1">
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
      </Stack>
      <StatusBar style="dark" />
    </GestureHandlerRootView>
  );
}
