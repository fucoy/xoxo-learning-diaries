import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

const supabaseUrl = "https://qjdpzhsjwxfvnzqkfpnz.supabase.co";

const supabasePublishableKey =
    "sb_publishable_71qPhvLjo1ldbtsX36mArw_jL6R-Tll";

export const supabase = createClient(
    supabaseUrl,
    supabasePublishableKey
);