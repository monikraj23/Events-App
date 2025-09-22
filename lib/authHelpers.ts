// lib/authHelpers.ts
import { supabase } from './supabase';

export async function getProfileAndRole() {
  const { data: userResp } = await supabase.auth.getUser();
  const uid = userResp?.user?.id || null;
  if (!uid) return { uid: null, is_admin: false, profile: null };

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('is_admin, full_name, email')
    .eq('id', uid)
    .single();

  if (error) {
    console.warn('profile fetch error', error);
    return { uid, is_admin: false, profile: null };
  }

  return { uid, is_admin: profile?.is_admin === true, profile };
}
