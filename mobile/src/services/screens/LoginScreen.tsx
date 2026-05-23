import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser } from '../api'; // make sure path matches your folder

type RootStackParamList = {
  Login: undefined;
  Signup: undefined;
  Main: undefined;
  AdminDashboard: undefined;
};

type LoginNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginNavigationProp;
}

const LoginScreen = ({ navigation }: Props) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [devTapCount, setDevTapCount] = useState(0);
  const [showDevOptions, setShowDevOptions] = useState(false);

  const handleTitleTap = () => {
    const newCount = devTapCount + 1;
    setDevTapCount(newCount);
    if (newCount >= 5) {
      setShowDevOptions(true);
      setDevTapCount(0);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill all fields');
      return;
    }

    setLoading(true);

    try {
      const data = await loginUser(email, password);

      if (!data.token) {
        throw new Error('Invalid response from server. Please check your credentials.');
      }

      await AsyncStorage.setItem('findme_token', data.token);
      if (data.role) {
        await AsyncStorage.setItem('user_role', data.role);
      }

      Alert.alert('Success', 'Logged in!');
      if (data.role === 'Platform Admin') {
        navigation.replace('AdminDashboard');
      } else {
        navigation.replace('Main');
      }
    } catch (err: any) {
      Alert.alert('Login Failed', err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <TouchableOpacity activeOpacity={1} onPress={handleTitleTap}>
        <Text style={styles.title}>Login</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor="#B0B0B0"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        placeholderTextColor="#B0B0B0"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />

      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Login'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Signup')}>
        <Text style={styles.link}>Don't have an account? Sign Up</Text>
      </TouchableOpacity>

      {showDevOptions && (
        <View style={styles.devContainer}>
          <TouchableOpacity onPress={() => setShowDevOptions(false)}>
            <Text style={styles.devTitle}>DEMO ACCOUNTS (TAP TO HIDE)</Text>
          </TouchableOpacity>
          <View style={styles.devScrollContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.devScrollContent}>
              {[
                { email: 'admin@findme.com', password: 'password123', label: 'Platform Admin' },
                { email: 'fan@example.com', label: 'Coffee Fan' },
                { email: 'user1@example.com', label: 'MDY Lover' },
                { email: 'foodie@mandalay.com', label: 'MDY Foodie' },
                { email: 'nomad@mandalay.com', label: 'MDY Nomad' },
                { email: 'beauty@mandalay.com', label: 'Beauty Guru' },
                { email: 'odd@example.com', label: 'ODD Owner' },
                { email: 'cactus@example.com', label: 'Cactus Owner' }
              ].map((acc, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.devButton}
                  onPress={() => { setEmail(acc.email); setPassword('password123'); }}
                >
                  <Text style={styles.devButtonText}>{acc.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </KeyboardAvoidingView>
  );
};

export default LoginScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#7F9460', justifyContent: 'center', padding: 20 },
  title: { fontSize: 32, fontWeight: 'bold', color: '#fff', marginBottom: 30, textAlign: 'center' },
  input: { backgroundColor: 'rgba(255,255,255,0.15)', padding: 16, borderRadius: 12, fontSize: 16, color: '#fff', marginBottom: 15 },
  button: { backgroundColor: '#1A2421', padding: 18, borderRadius: 12, alignItems: 'center', marginTop: 10, elevation: 2 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  link: { textAlign: 'center', color: 'rgba(255,255,255,0.7)', marginTop: 20, fontSize: 14 },
  devContainer: { marginTop: 40, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 20 },
  devTitle: { textAlign: 'center', color: 'rgba(255,255,255,0.3)', fontSize: 9, fontWeight: 'bold', letterSpacing: 2, marginBottom: 15 },
  devRow: { flexDirection: 'row', justifyContent: 'center', gap: 20 },
  devButton: { paddingVertical: 8, paddingHorizontal: 15, borderRadius: 6, backgroundColor: 'rgba(0,0,0,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  devButtonText: { color: 'rgba(255,255,255,0.4)', fontWeight: 'bold', fontSize: 10 },
  devScrollContainer: { marginTop: 10 },
  devScrollContent: { gap: 10, paddingHorizontal: 5 },
});
