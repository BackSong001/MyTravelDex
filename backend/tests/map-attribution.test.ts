import {expect,test,vi} from 'vitest';
import React from '../../frontend/node_modules/react';
import {renderToStaticMarkup} from '../../frontend/node_modules/react-dom/server';
vi.mock('../../frontend/node_modules/react-native',()=>({Platform:{OS:'web'},View:'div'}));
vi.mock('../../frontend/src/Feedback',()=>({default:({children}:any)=>React.createElement('button',null,children)}));
vi.mock('../../frontend/src/FontText',()=>({default:({children,accessibilityRole,href,style}:any)=>React.createElement(href?'a':'span',{href,role:accessibilityRole,style},children)}));
vi.mock('../../frontend/src/ThemeContext',()=>({useThemeColors:()=>({paper:'#fff',ink:'#222',line:'#ddd',muted:'#555'})}));
import MapAttribution,{ProfileMapCredits} from '../../frontend/src/MapAttribution';
test('TC-MAP-CREDITS-001 map has one OSM link and My retains other source notices',()=>{
 const html=renderToStaticMarkup(React.createElement(MapAttribution));
 expect(html.match(/href=/g)).toHaveLength(1);
 expect(html).toContain('href="https://www.openstreetmap.org/copyright"');
 expect(html).toContain('© OpenStreetMap');
 const profile=renderToStaticMarkup(React.createElement(ProfileMapCredits));
 for(const label of ['2026-11-09','Photon','Geoapify','CC BY 4.0'])expect(profile).toContain(label);
});

import {readFileSync} from 'node:fs';
import notices from '../../frontend/src/data/maps/map-notices.json';
test('TC-MAP-OFM-001 bundled notices reproduce upstream copyright, conditions and disclaimer',()=>{
 const text=['POSITRON_LICENSE.md','OPENFREEMAP_LICENSE.md'].map(n=>readFileSync('frontend/src/data/maps/'+n,'utf8')).join('\n\n')+'\n\n---\n\nfflate 0.8.3\n\n'+readFileSync('frontend/node_modules/fflate/LICENSE','utf8');
 expect(notices.text.replace(/\r\n/g,'\n')).toBe(text.replace(/\r\n/g,'\n'));expect(notices.text).toContain('THIS SOFTWARE IS PROVIDED');
 expect(renderToStaticMarkup(React.createElement(ProfileMapCredits))).toContain('지도 오픈소스 고지 보기');
});
