import {beforeEach, expect, test, vi} from 'vitest';

const {exchange, store, signIn, browser, platform, ownership, settings} = vi.hoisted(() => ({exchange: vi.fn(), store: vi.fn(), signIn:vi.fn(), browser:vi.fn(), platform:{OS:'web'}, ownership:{appOwnership:null as string|null}, settings:vi.fn()}));
vi.mock('../../frontend/node_modules/@supabase/supabase-js', () => ({createClient: () => ({auth: {exchangeCodeForSession: exchange,signInWithOAuth:signIn}})}));
vi.mock('../../frontend/src/runtime',()=>({api:{url:'http://127.0.0.1:54321',request:settings}}));
vi.mock('../../frontend/node_modules/@react-native-async-storage/async-storage', () => ({default: {setItem: store}}));
vi.mock('../../frontend/node_modules/react-native', () => ({Platform: platform}));
vi.mock('../../frontend/node_modules/expo-linking', () => ({createURL:()=> 'mytraveldex://auth/callback'}));
vi.mock('../../frontend/node_modules/expo-web-browser', () => ({maybeCompleteAuthSession: () => {},openAuthSessionAsync:browser}));
vi.mock('../../frontend/node_modules/expo-constants', () => ({default:ownership}));
import {exchangeOAuthCode,googleLogin,oauthFailureMessage} from '../../frontend/src/auth';

beforeEach(() => {vi.resetAllMocks();platform.OS='web';ownership.appOwnership=null;});
test('OAuth browser and callback exchange the same PKCE code only once', async () => {
  const session = {access_token: 'test-access-token', refresh_token: 'test-refresh-token'};
  exchange.mockResolvedValue({data: {session}, error: null});
  const results = await Promise.all([exchangeOAuthCode('concurrent-test-code'), exchangeOAuthCode('concurrent-test-code')]);
  expect(exchange).toHaveBeenCalledTimes(1); expect(store).not.toHaveBeenCalled();
  expect(results).toEqual([session, session]);
});
test('OAuth exchange failure does not store a session and a new login can retry', async () => {
  exchange.mockResolvedValueOnce({data: {session: null}, error: new Error('Invalid code')});
  await expect(exchangeOAuthCode('invalid-test-code')).rejects.toThrow('Invalid code'); expect(store).not.toHaveBeenCalled();
  exchange.mockResolvedValueOnce({data: {session: {access_token: 'new-test-token'}}, error: null});
  await expect(exchangeOAuthCode('fresh-test-code')).resolves.toMatchObject({access_token: 'new-test-token'});
});
test('standalone Android OAuth uses registered callback and exchanges PKCE response',async()=>{
 platform.OS='android';settings.mockResolvedValue({external:{google:true}});signIn.mockResolvedValue({data:{url:'https://example.test/oauth'}});
 browser.mockResolvedValue({type:'success',url:'mytraveldex://auth/callback?code=native-code'});exchange.mockResolvedValue({data:{session:{access_token:'test'}},error:null});
 await googleLogin();expect(signIn).toHaveBeenCalledWith({provider:'google',options:{redirectTo:'mytraveldex://auth/callback',skipBrowserRedirect:true}});
 expect(browser).toHaveBeenCalledWith('https://example.test/oauth','mytraveldex://auth/callback');expect(exchange).toHaveBeenCalledWith('native-code');
});
test('Android OAuth cancellation creates no session and Expo Go explains required build',async()=>{
 platform.OS='android';settings.mockResolvedValue({external:{google:true}});signIn.mockResolvedValue({data:{url:'https://example.test/oauth'}});browser.mockResolvedValue({type:'cancel'});
 expect(await googleLogin()).toBeNull();expect(exchange).not.toHaveBeenCalled();
 ownership.appOwnership='expo';await expect(googleLogin()).rejects.toThrow('Expo Go');
});


test('a browser result from an obsolete owner cannot start a new PKCE exchange',async()=>{
 platform.OS='android';settings.mockResolvedValue({external:{google:true}});signIn.mockResolvedValue({data:{url:'https://example.test/oauth'}});
 let current=true;browser.mockImplementation(async()=>{current=false;return {type:'success',url:'mytraveldex://auth/callback?code=obsolete-owner'};});
 expect(await googleLogin(()=>current)).toBeNull();expect(exchange).not.toHaveBeenCalled();
});

test('callback failures never expose provider or SDK raw messages',()=>{
 expect(oauthFailureMessage({code:'pkce_code_verifier_not_found',message:'private verifier raw'})).toContain('같은 브라우저');
 expect(oauthFailureMessage('access_denied')).toContain('취소');
 for(const error of [new Error('secret-token-raw'),{code:'untrusted',message:'<html>secret</html>'}])expect(oauthFailureMessage(error)).not.toMatch(/secret|html|untrusted/);
});
