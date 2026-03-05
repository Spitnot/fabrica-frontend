import { supabaseClient } from '@/lib/supabase/client';

export const sendEmail = async (to: string, subject: string, html: string) => {
  console.log('--- [DEBUG] Email Service Started ---');
  console.log('[DEBUG] To:', to);
  console.log('[DEBUG] Subject:', subject);

  try {
    // 1. Check if client exists
    if (!supabaseClient) {
      console.error('[DEBUG] ERROR: Supabase client is undefined!');
      return { success: false, error: 'Supabase client missing' };
    }
    console.log('[DEBUG] Supabase client found.');

    // 2. Invoke function
    console.log('[DEBUG] Invoking function "send-email"...');
    const { data, error } = await supabaseClient.functions.invoke('send-email', {
      body: { to, subject, html },
    });

    // 3. Check for immediate errors
    if (error) {
      console.error('[DEBUG] Function returned error:', error);
      return { success: false, error };
    }

    console.log('[DEBUG] Function success! Response data:', data);
    return { success: true, data };

  } catch (err) {
    console.error('[DEBUG] CRITICAL CATCH ERROR:', err);
    return { success: false, err };
  }
};