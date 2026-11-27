import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './config.js?v=20261127211334';

export const isConfigured = !SUPABASE_URL.includes('YOUR-') && !SUPABASE_ANON_KEY.includes('YOUR-');

// Tell the page when a saved change might have earned a badge (js/unlocks.js listens).
const EARNS = /\/rest\/v1\/(logs|cage_votes|mystery_plays|follows|profiles)\b/;
async function watchedFetch(input, init) {
  const res = await fetch(input, init);
  const table = res.ok && ['POST', 'PATCH'].includes(init?.method) && String(input?.url || input).match(EARNS)?.[1];
  // The only profile change that counts is the season tier list.
  if (table && (table !== 'profiles' || String(init.body).includes('"season_tiers"'))) {
    window.dispatchEvent(new CustomEvent('parkboxd:progress'));
  }
  return res;
}

export const supabase = createClient(
  isConfigured ? SUPABASE_URL : 'https://placeholder.supabase.co',
  isConfigured ? SUPABASE_ANON_KEY : 'placeholder',
  { global: { fetch: watchedFetch } }
);
