// src/lib/emailService.ts
import { supabase } from './supabase';

/**
 * Sends an email using the Supabase Edge Function
 * @param to - Recipient email address
 * @param subject - Email subject line
 * @param html - HTML content of the email (your design)
 */
export const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    // Invoke the function we created in Step 1
    const { data, error } = await supabase.functions.invoke('send-email', {
      body: { to, subject, html },
    });

    if (error) {
      console.error('Email Service Error:', error);
      return { success: false, error };
    }

    return { success: true, data };
  } catch (err) {
    console.error('Network Error:', err);
    return { success: false, err };
  }
};