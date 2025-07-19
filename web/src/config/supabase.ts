import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://vylxluyxmslpxldihpoa.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ5bHhsdXl4bXNscHhsZGlocG9hIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI4MTgyMjIsImV4cCI6MjA2ODM5NDIyMn0.Fgu59Z8ZMvSkyi1yVh_Dm6aTIFW3pK9NfoW9pqrMkVk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)