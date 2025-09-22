// lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// 🔴 Debug only: hardcode project URL + anon key
// Replace with your actual values if they change.
// After confirming it works, rotate your key in Supabase dashboard
// and move these values into app.json or env variables.

const URL = 'https://pcfdtbjavgeidirymniz.supabase.co';
const KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjZmR0YmphdmdlaWRpcnltbml6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY0NTIwNTksImV4cCI6MjA3MjAyODA1OX0.tqy6O7Pi8w0VvsmwYo2oTXH2TvOqpDQCQYoIyC8-xvs';

if (!URL || !KEY) {
  throw new Error('Supabase URL and anon key are required');
}

// Create the client
export const supabase = createClient(URL, KEY);

// Debug logs
if (__DEV__) {
  console.log('[SUBA] URL =>', URL);
  console.log('[SUBA] KEY present =>', !!KEY);
}
