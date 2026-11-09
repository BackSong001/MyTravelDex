import {expect,test,vi} from 'vitest';
import React from '../../frontend/node_modules/react';
import {renderToStaticMarkup} from '../../frontend/node_modules/react-dom/server';
const state=vi.hoisted(()=>({actions:new Map<string,()=>void>()}));
vi.mock('../../frontend/node_modules/react-native',()=>({View:({children}:any)=>React.createElement('div',null,children),Image:()=>null}));
vi.mock('../../frontend/node_modules/expo-crypto',()=>({randomUUID:()=> '00000000-0000-4000-8000-000000000001'}));
vi.mock('../../frontend/src/FontText',()=>({default:({children}:any)=>React.createElement('span',null,children)}));
vi.mock('../../frontend/src/Feedback',()=>({default:({accessibilityLabel,onPress,children}:any)=>{state.actions.set(accessibilityLabel,onPress);return React.createElement('button',null,children);}}));
vi.mock('../../frontend/src/badges',()=>({badges:[],capsuleMachine:'',openedCapsule:'',pendingBadgeDraw:()=>undefined,beginBadgeDraw:(_owner:string,id:string)=>id,confirmBadgeDraw:()=>{}}));
import BadgeCabinet from '../../frontend/src/BadgeCabinet';
import {TravelApi} from '../../frontend/src/api';
test('TC-BADGE-004: callbacks retained from an obsolete owner cannot begin a request with the current API token',()=>{
 const api=new TravelApi('http://127.0.0.1:54321','fixture'),rpc=vi.spyOn(api,'rpc').mockResolvedValue({});
 renderToStaticMarkup(React.createElement(BadgeCabinet,{owner:'previous-owner',api,onLogin:()=>{},isCurrent:()=>false}));
 state.actions.get('무료 뱃지 뽑기')!();state.actions.get('보관함 새로고침')!();expect(rpc).not.toHaveBeenCalled();
});
