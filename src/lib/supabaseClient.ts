import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/database.types'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

/** Browser Supabase client (cookie-backed for middleware + SSR). */
export const supabase = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey)
