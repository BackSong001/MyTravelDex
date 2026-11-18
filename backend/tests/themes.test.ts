import {expect,test} from 'vitest';
import {colors as c} from '../../frontend/src/theme';
import {contrastRatio} from '../../frontend/src/themes';
test('TC-SVG-MAP-001: single aqua UI retains readable text and pressed roles',()=>{
 for(const [ink,surface] of [[c.ink,c.paper],[c.ink,c.sheet],[c.muted,c.paper],[c.muted,c.sheet],[c.onPrimary,c.coral],[c.onPrimary,c.primaryPressed],[c.ink,c.secondaryPressed],[c.sea,c.paper],[c.profile.accent,c.profile.sheet],[c.error,c.errorSurface],[c.navigation.activeLabel,c.navigation.background]])expect(contrastRatio(ink,surface),`${ink}/${surface}`).toBeGreaterThanOrEqual(4.5);
});
