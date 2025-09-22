// pages/SupabaseTest.tsx
import React, { useState } from 'react';
import { View, Text, TextInput, Button, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';

export default function SupabaseTest() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [out, setOut] = useState('');

  const append = (s: any) => {
    setOut(prev => `${s}\n\n${prev}`);
  };

  const testSignIn = async () => {
    append('Calling signInWithPassword...');
    try {
      const res = await supabase.auth.signInWithPassword({ email, password });
      append(JSON.stringify(res, null, 2));
    } catch (err: any) {
      append(`Error: ${err.message}`);
    }
  };

  const testGetSession = async () => {
    append('Calling getSession...');
    try {
      const res = await supabase.auth.getSession();
      append(JSON.stringify(res, null, 2));
    } catch (err: any) {
      append(`Error: ${err.message}`);
    }
  };

  const testGetUser = async () => {
    append('Calling getUser...');
    try {
      const res = await supabase.auth.getUser();
      append(JSON.stringify(res, null, 2));
    } catch (err: any) {
      append(`Error: ${err.message}`);
    }
  };

  return (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 20, marginBottom: 10 }}>🔍 Supabase Test</Text>

      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{
          borderWidth: 1,
          marginVertical: 8,
          padding: 8,
          borderRadius: 5,
        }}
      />

      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        style={{
          borderWidth: 1,
          marginVertical: 8,
          padding: 8,
          borderRadius: 5,
        }}
      />

      <Button title="Sign In" onPress={testSignIn} />
      <Button title="Get Session" onPress={testGetSession} />
      <Button title="Get User" onPress={testGetUser} />

      <Text style={{ marginTop: 20, fontFamily: 'monospace' }}>{out}</Text>
    </ScrollView>
  );
}
