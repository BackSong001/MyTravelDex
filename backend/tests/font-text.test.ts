import {expect,test,vi} from 'vitest';
const state=vi.hoisted(()=>({scale:1,platform:{OS:'android'}}));
vi.mock('../../frontend/node_modules/react-native',()=>({Text:'span',Platform:state.platform,useWindowDimensions:()=>({fontScale:state.scale})}));
import FontText from '../../frontend/src/FontText';

test('Android font changes replace only the presentation text and preserve its props',()=>{
 const press=()=>{},ref=()=>{},props={ref,children:'현재 값',accessibilityLabel:'현재 값 · 확인 중',allowFontScaling:true,onPress:press};
 state.scale=1;const first=FontText(props);state.scale=2;const enlarged=FontText(props);state.scale=1;const restored=FontText(props);
 expect(first.type).toBe('span');expect(FontText({...props,children:'새 값'}).key).toBe(restored.key);expect(first.key).not.toBe(enlarged.key);expect(restored.key).toBe(first.key);expect(enlarged.props).toEqual(props);expect(enlarged.props.onPress).toBe(press);
 state.platform.OS='web';state.scale=1;const web=FontText(props);state.scale=2;expect(FontText(props).key).toBe(web.key);
});
