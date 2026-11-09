import {expect,test} from 'vitest';
import {mapStyle} from '../../frontend/src/mapStyle';
import {themes} from '../../frontend/src/themes';
test('TC-MAP-THEME-SHADOW-001: all themes keep thin white unshifted shadows and the selected outline',()=>{
 for(const theme of themes){const layers=mapStyle('KR-11',[],theme.colors).layers;
  for(const id of ['province-shadow','province-depth'])expect(layers.find(l=>l.id===id)?.paint).toMatchObject({'line-color':'#FFFFFF','line-width':1,'line-blur':0,'line-translate':[0,0]});
  expect(layers.find(l=>l.id==='province-selected')?.paint).toMatchObject({'line-width':2.5});
 }
});
