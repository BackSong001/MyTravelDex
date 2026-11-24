import React from 'react';
import {View} from 'react-native';
import {registerRootComponent} from 'expo';
import {ExpoRoot,useGlobalSearchParams,usePathname} from 'expo-router';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import AppFrame from './AppFrame';
import AppWorkspace from '../screens/AppWorkspace';

import {ctx as routes} from 'expo-router/_ctx';

function WorkspaceFrame({children}:React.PropsWithChildren){
 const pathname=usePathname();
 const params=useGlobalSearchParams<{friend?:string;record?:string}>();
 const callback=pathname==='/auth/callback';
 return <SafeAreaProvider><AppFrame>
  <View style={callback?{flex:1}:{display:'none'}}>{children}</View>
  {!callback&&<AppWorkspace pathname={pathname} linkParams={params}/>}
 </AppFrame></SafeAreaProvider>;
}

function WebApp(){return <ExpoRoot context={routes} wrapper={WorkspaceFrame}/>;}
registerRootComponent(WebApp);
