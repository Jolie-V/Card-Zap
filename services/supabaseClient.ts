
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msfqctaghaqrbcnhnead.supabase.co';
// This is the anon key, it's safe to be public
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZnFjdGFnaGFxcmJjbmhuZWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MDQ4MjksImV4cCI6MjA3NDE4MDgyOX0.ArIWKB7nAMPACJTNpX78adunVWonm8QHW9RKxKOG7VM';

// Custom fetch with retry logic for network resilience
const fetchWithRetry = async (url: RequestInfo | URL, options?: RequestInit): Promise<Response> => {
  const MAX_RETRIES = 3;
  const BASE_DELAY = 500; // Start with 500ms

  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      // Only retry on network errors (fetch throws on network error)
      const isLastAttempt = i === MAX_RETRIES - 1;
      if (isLastAttempt) throw err;
      
      // Exponential backoff: 500ms, 1000ms, 2000ms
      const delay = BASE_DELAY * Math.pow(2, i);
      console.warn(`Network request failed. Retrying in ${delay}ms... (Attempt ${i + 1}/${MAX_RETRIES})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error("Network request failed after retries");
};

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    storage: window.localStorage, // Explicitly use localStorage for session persistence.
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  global: {
    fetch: fetchWithRetry
  }
});
