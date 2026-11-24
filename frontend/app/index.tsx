import {Platform} from 'react-native';
import AppWorkspace from '../screens/AppWorkspace';
export default function Index(){return Platform.OS==='web'?null:<AppWorkspace/>;}
