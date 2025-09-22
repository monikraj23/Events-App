// pages/Login.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  TextInput,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';

type Props = {
  navigation?: any;
  onLogin?: () => void;        // used by your App.tsx router
  onAdminLogin?: () => void;   // optional admin handler from App.tsx router
  onRegister?: () => void;
  onForgotPassword?: () => void;
};

const Login: React.FC<Props> = ({
  navigation,
  onLogin,
  onAdminLogin,
  onRegister,
  onForgotPassword,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isAdminEmail = (e: string) =>
    !!e && (e.toLowerCase().endsWith('@gmail.com') || e.toLowerCase().includes('admin'));

  const finishLogin = (admin = false) => {
    // Priority:
    // 1) if parent provided onAdminLogin/onLogin callbacks, use them
    // 2) else fall back to navigation prop (React Navigation)
    // 3) else fallback alert (shouldn't happen in your app)
    if (admin && typeof onAdminLogin === 'function') {
      onAdminLogin();
      return;
    }
    if (!admin && typeof onLogin === 'function') {
      onLogin();
      return;
    }
    if (admin && navigation?.replace) {
      navigation.replace('CreateEvent');
      return;
    }
    if (!admin && navigation?.replace) {
      navigation.replace('HomeUser');
      return;
    }
    Alert.alert('Logged in (dummy)', `Email: ${email}`);
  };

  const handleLogin = () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please enter email and password');
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      const admin = isAdminEmail(email);
      finishLogin(admin);
    }, 600);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Campus Events</Text>

        <View style={{ width: '100%', marginBottom: 12 }}>
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#bbb"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#bbb"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.disabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Login</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => (typeof onRegister === 'function' ? onRegister() : navigation?.navigate?.('Signup'))}>
          <Text style={styles.link}>Don't have an account? Register</Text>
        </TouchableOpacity>

        <TouchableOpacity style={{ marginTop: 8 }} onPress={() => (typeof onForgotPassword === 'function' ? onForgotPassword() : Alert.alert('Forgot password'))}>
          <Text style={[styles.link, { fontSize: 13 }]}>Forgot Password?</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419' },
  content: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 40 },
  title: { fontSize: 28, color: '#fff', marginBottom: 24, fontWeight: '700' },
  input: { backgroundColor: '#21303a', color: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 12, width: '100%' },
  button: { width: '100%', backgroundColor: '#3498db', padding: 14, borderRadius: 12, alignItems: 'center' },
  disabled: { backgroundColor: '#5b6b73' },
  buttonText: { color: '#fff', fontWeight: '700' },
  link: { color: '#3498db', marginTop: 12 },
});

export default Login;
