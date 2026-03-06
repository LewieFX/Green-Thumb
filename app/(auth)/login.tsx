import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { supabase } from '@/lib/supabase';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleAuth() {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }
    setLoading(true);
    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-green-50"
    >
      <View className="flex-1 justify-center px-8">
        {/* Logo / Header */}
        <View className="items-center mb-10">
          <Text className="text-6xl mb-2">🌱</Text>
          <Text className="text-3xl font-bold text-green-800">Green Thumb</Text>
          <Text className="text-base text-green-600 mt-1">Your smart garden companion</Text>
        </View>

        {/* Form */}
        <View className="bg-white rounded-2xl p-6 shadow-sm">
          <Text className="text-xl font-semibold text-gray-800 mb-5">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </Text>

          <Text className="text-sm font-medium text-gray-600 mb-1">Email</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-base mb-4 bg-gray-50"
            placeholder="you@example.com"
            placeholderTextColor="#9ca3af"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text className="text-sm font-medium text-gray-600 mb-1">Password</Text>
          <TextInput
            className="border border-gray-200 rounded-xl px-4 py-3 text-gray-800 text-base mb-6 bg-gray-50"
            placeholder="••••••••"
            placeholderTextColor="#9ca3af"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />

          <TouchableOpacity
            className="bg-green-600 rounded-xl py-4 items-center"
            onPress={handleAuth}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-semibold text-base">
                {isSignUp ? 'Create Account' : 'Sign In'}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Toggle */}
        <TouchableOpacity className="mt-6 items-center" onPress={() => setIsSignUp(!isSignUp)}>
          <Text className="text-green-700">
            {isSignUp ? 'Already have an account? ' : "Don't have an account? "}
            <Text className="font-semibold">{isSignUp ? 'Sign In' : 'Sign Up'}</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
