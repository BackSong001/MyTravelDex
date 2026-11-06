import { TravelApi } from './api';
export const api = new TravelApi(process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321', process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '');
