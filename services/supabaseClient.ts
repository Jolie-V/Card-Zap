import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://msfqctaghaqrbcnhnead.supabase.co';
// This is the anon key, it's safe to be public
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZnFjdGFnaGFxcmJjbmhuZWFkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MDQ4MjksImV4cCI6MjA3NDE4MDgyOX0.ArIWKB7nAMPACJTNpX78adunVWonm8QHW9RKxKOG7VM';

export const supabase = createClient(supabaseUrl, supabaseKey);