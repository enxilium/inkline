import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { SupabaseAuthStorageAdapter } from "./SupabaseAuthStorageAdapter";

export class SupabaseService {
    private static instance: SupabaseClient;

    /**
     * Returns the singleton instance of the SupabaseClient.
     * Initializes it if it hasn't been initialized yet.
     */
    public static getClient(): SupabaseClient {
        if (!SupabaseService.instance) {
            // These should be loaded from your environment variables (e.g. .env file)
            // Ensure you have a mechanism to load these in your main process (like dotenv)
            const supabaseUrl = process.env.SUPABASE_URL;
            const supabaseKey = process.env.SUPABASE_PUBLIC_KEY;

            if (!supabaseUrl || !supabaseKey) {
                throw new Error(
                    "Supabase credentials missing. Please ensure SUPABASE_URL and SUPABASE_ANON_KEY are set in your environment variables."
                );
            }

            SupabaseService.instance = createClient(supabaseUrl, supabaseKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: false, // Electron handles deep links differently if needed
                    storage: new SupabaseAuthStorageAdapter(),
                },
            });
        }
        return SupabaseService.instance;
    }
}
