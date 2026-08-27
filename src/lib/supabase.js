import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://lbkxuihfyzwxodxpedsm.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_yxjKLv8ZLJnpWRdrkRbFgQ_0__vSNix';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
