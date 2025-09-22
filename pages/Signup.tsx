// pages/Signup.tsx
import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView,
  TextInput, Alert, ActivityIndicator
} from 'react-native';
import { supabase } from '../lib/supabase';

const Signup: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    const lower = email.toLowerCase();
    const isStudent = lower.endsWith('@vitstudent.ac.in');
    const isAdminEmail = lower.endsWith('@gmail.com'); // allow Gmail admin addresses

    if (!isStudent && !isAdminEmail) {
      Alert.alert('Error', 'Only @vitstudent.ac.in student emails or admin emails allowed');
      return;
    }

    try {
      setLoading(true);
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) {
        console.error('[signup] signUpError', signUpError);
        Alert.alert('Signup error', signUpError.message || JSON.stringify(signUpError));
        return;
      }

      // If signUp returned a user (session available), create profile now.
      const user = signUpData?.user;
      if (user && user.id) {
        const { error: profileError } = await supabase.from('profiles').upsert([
          { id: user.id, email: user.email, full_name: user.email?.split('@')[0] }
        ]);
        if (profileError) console.warn('[signup] profile upsert error', profileError);
        Alert.alert('Success', 'Account created and signed in!');
        // navigate to home
        navigation?.replace?.('HomeUser');
      } else {
        // No user returned: likely email confirmation required
        Alert.alert('Check your email', 'We sent a confirmation link. Please verify then sign in.');
        // Optionally navigate to Login screen
        navigation?.navigate?.('Login');
      }
    } catch (err: any) {
      console.error('[signup] unexpected', err);
      Alert.alert('Error', err.message || JSON.stringify(err));
    } finally {
      setLoading(false);
    }
  };

  const canRegister = email && password && confirmPassword && password === confirmPassword;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Campus Events</Text>
        <View style={styles.inputContainer}>
          <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#ddd" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Password" placeholderTextColor="#ddd" value={password} onChangeText={setPassword} secureTextEntry />
          <TextInput style={styles.input} placeholder="Confirm Password" placeholderTextColor="#ddd" value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry />
        </View>

        <TouchableOpacity
          style={[styles.button, (!canRegister || loading) && styles.disabled]}
          onPress={handleRegister}
          disabled={!canRegister || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Register</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation?.navigate?.('Login')}>
          <Text style={styles.link}>Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f1419' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  title: { fontSize: 28, color: '#fff', marginBottom: 30, fontWeight: '700' },
  inputContainer: { width: '100%', marginBottom: 20 },
  input: { backgroundColor: '#21303a', color: '#fff', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 12, marginBottom: 12 },
  button: { width: '100%', backgroundColor: '#3498db', padding: 14, borderRadius: 12, alignItems: 'center' },
  disabled: { backgroundColor: '#5b6b73' },
  buttonText: { color: '#fff', fontWeight: '700' },
  link: { color: '#3498db', marginTop: 16 },
});

export default Signup;
