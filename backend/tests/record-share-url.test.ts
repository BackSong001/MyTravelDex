import {afterEach,expect,test,vi} from 'vitest';
const {platform,createURL}=vi.hoisted(()=>({platform:{OS:'web'},createURL:vi.fn(()=> 'mytraveldex:///?record=fixture')}));
vi.mock('../../frontend/node_modules/react-native',()=>({Platform:platform}));
vi.mock('../../frontend/node_modules/expo-linking',()=>({createURL}));
import {recordShareUrl} from '../../frontend/src/recordShareUrl';

afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();vi.clearAllMocks();});
test('web uses the current origin even when sharing from a preview',()=>{
 platform.OS='web';vi.stubEnv('EXPO_PUBLIC_APP_ENV','production');
 vi.stubGlobal('window',{location:{origin:'https://preview.example'}});
 expect(recordShareUrl('fixture')).toBe('https://preview.example/record/fixture');
});
test('production native uses the public web while nonproduction uses its installed app link',()=>{
 platform.OS='android';vi.stubEnv('EXPO_PUBLIC_APP_ENV','production');
 expect(recordShareUrl('fixture')).toBe('https://mytraveldex-app.pages.dev/record/fixture');
 for(const env of ['local','staging','']){
  vi.stubEnv('EXPO_PUBLIC_APP_ENV',env);
  expect(recordShareUrl('fixture')).toBe('mytraveldex:///?record=fixture');
  expect(createURL).toHaveBeenLastCalledWith('/',{queryParams:{record:'fixture'}});
 }
});
