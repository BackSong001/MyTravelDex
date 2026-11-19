import {expect,test,vi} from 'vitest';
import React from '../../frontend/node_modules/react';
import {renderToStaticMarkup} from '../../frontend/node_modules/react-dom/server';
vi.mock('../../frontend/node_modules/react-native',()=>({Platform:{OS:'web'},View:'div'}));
vi.mock('../../frontend/src/Feedback',()=>({default:({children}:any)=>React.createElement('button',null,children)}));
vi.mock('../../frontend/src/FontText',()=>({default:({children,accessibilityRole,href,style}:any)=>React.createElement(href?'a':'span',{href,role:accessibilityRole,style},children)}));
vi.mock('../../frontend/src/ThemeContext',()=>({useThemeColors:()=>({paper:'#fff',ink:'#222',line:'#ddd',muted:'#555'})}));
import MapAttribution,{ProfileMapCredits} from '../../frontend/src/MapAttribution';
test('TC-MAP-CREDITS-001 compact credits retain provider links and custom result attribution',()=>{
 const html=renderToStaticMarkup(React.createElement(MapAttribution,{tiles:true,records:[{locations:{attribution:'Powered by Geoapify | © OpenStreetMap contributors'}},{locations:{attribution:'© OpenAddresses contributors'}}]}));
 for(const label of ['Powered by Geoapify','© OpenStreetMap contributors','© OpenMapTiles','국토교통부 · 브이월드','© OpenAddresses contributors'])expect(html).toContain(label);
 expect(html.match(/Powered by Geoapify/g)).toHaveLength(1);
 for(const url of ['https://www.geoapify.com/','https://www.openstreetmap.org/copyright','https://openmaptiles.org/','https://www.vworld.kr/dtmk/dtmk_ntads_s002.do?svcCde=NA&amp;dsId=21'])expect(html).toContain(`href="${url}"`);
 expect(html).not.toContain('2026-11-09');expect(html).toContain('font-size:10px');
 const terrain=renderToStaticMarkup(React.createElement(MapAttribution,{tiles:true,records:[]}));expect(terrain).not.toContain('Geoapify');expect(terrain).toContain('OpenMapTiles');
 const local=renderToStaticMarkup(React.createElement(MapAttribution,{records:[]}));expect(local).not.toContain('Geoapify');expect(local).not.toContain('OpenMapTiles');
 const search=renderToStaticMarkup(React.createElement(MapAttribution,{records:[{locations:{attribution:'Powered by Geoapify | © OpenStreetMap contributors'}}]}));expect(search).toContain('Powered by Geoapify');expect(search).not.toContain('OpenMapTiles');
 const profile=renderToStaticMarkup(React.createElement(ProfileMapCredits));expect(profile).toContain('2026-11-09');expect(profile).toContain('https://creativecommons.org/licenses/by/4.0/');expect(profile).toContain('© OpenMapTiles');
});

import {readFileSync} from 'node:fs';
import notices from '../../frontend/src/data/maps/map-notices.json';
test('TC-MAP-OFM-001 bundled notices reproduce upstream copyright, conditions and disclaimer',()=>{
 const text=['POSITRON_LICENSE.md','OPENFREEMAP_LICENSE.md'].map(n=>readFileSync('frontend/src/data/maps/'+n,'utf8')).join('\n\n')+'\n\n---\n\nfflate 0.8.3\n\n'+readFileSync('frontend/node_modules/fflate/LICENSE','utf8');
 expect(notices.text.replace(/\r\n/g,'\n')).toBe(text.replace(/\r\n/g,'\n'));expect(notices.text).toContain('THIS SOFTWARE IS PROVIDED');
 expect(renderToStaticMarkup(React.createElement(ProfileMapCredits))).toContain('지도 오픈소스 고지 보기');
});
