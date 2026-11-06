import {beforeEach, expect, test, vi} from 'vitest';

const {exchange, store} = vi.hoisted(() => ({exchange: vi.fn(), store: vi.fn()}));
vi.mock('../../frontend/node_modules/@supabase/supabase-js', () => ({createClient: () => ({auth: {exchangeCodeForSession: exchange}})}));
vi.mock('../../frontend/node_modules/@react-native-async-storage/async-storage', () => ({default: {setItem: store}}));
vi.mock('../../frontend/node_modules/react-native', () => ({Platform: {OS: 'web'}}));
vi.mock('../../frontend/node_modules/expo-linking', () => ({}));
vi.mock('../../frontend/node_modules/expo-web-browser', () => ({maybeCompleteAuthSession: () => {}}));
import {exchangeOAuthCode} from '../../frontend/src/auth';

beforeEach(() => {exchange.mockReset(); store.mockReset();});
test('OAuth browser and callback exchange the same PKCE code only once', async () => {
  const session = {access_token: 'test-access-token', refresh_token: 'test-refresh-token'};
  exchange.mockResolvedValue({data: {session}, error: null});
  const results = await Promise.all([exchangeOAuthCode('concurrent-test-code'), exchangeOAuthCode('concurrent-test-code')]);
  expect(exchange).toHaveBeenCalledTimes(1); expect(store).toHaveBeenCalledTimes(1);
  expect(results).toEqual([session, session]);
});
test('OAuth exchange failure does not store a session and a new login can retry', async () => {
  exchange.mockResolvedValueOnce({data: {session: null}, error: new Error('Invalid code')});
  await expect(exchangeOAuthCode('invalid-test-code')).rejects.toThrow('Invalid code'); expect(store).not.toHaveBeenCalled();
  exchange.mockResolvedValueOnce({data: {session: {access_token: 'new-test-token'}}, error: null});
  await expect(exchangeOAuthCode('fresh-test-code')).resolves.toMatchObject({access_token: 'new-test-token'});
});
