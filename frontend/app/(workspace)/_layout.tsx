import {Slot,usePathname,useGlobalSearchParams} from 'expo-router';
import {Platform,View} from 'react-native';
import AppWorkspace from '../../screens/AppWorkspace';
export default function WorkspaceLayout(){
 const pathname=usePathname(),params=useGlobalSearchParams<{friend?:string;record?:string}>();
 return Platform.OS==='web'?<><View style={{display:'none'}}><Slot/></View><AppWorkspace pathname={pathname} linkParams={params}/></>:<Slot/>;
}
