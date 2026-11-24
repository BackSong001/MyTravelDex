import {Platform} from 'react-native';
import {Slot,Stack} from 'expo-router';
import AppFrame from '../src/AppFrame';
import {useThemeColors} from '../src/ThemeContext';

export default function Layout(){
 const c=useThemeColors();
 return Platform.OS==='web'?<Slot/>:<AppFrame><Stack screenOptions={{headerShown:false,contentStyle:{backgroundColor:c.paper}}}/></AppFrame>;
}
