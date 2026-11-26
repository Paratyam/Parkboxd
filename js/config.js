// Site-wide settings. The Supabase URL and anon key are public by design:
// Row Level Security in supabase/setup.sql is what protects the data.
// Find both in Supabase → Project Settings → API (the "publishable" key works too).

export const SITE_NAME = 'Parkboxd';

export const SUPABASE_URL = 'https://qsphypdibcydipkhpkvs.supabase.co';
export const SUPABASE_ANON_KEY = 'sb_publishable_UnjmoK4PWyCirK91VqnobQ_LRUyQrHc';

// South Park on TMDB. The TMDB API key is never stored here: paste it into import.html.
export const TMDB_SHOW_ID = 2190;
export const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/';
