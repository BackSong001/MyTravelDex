import {useWindowDimensions} from 'react-native';
export default function useAppViewport(){return {...useWindowDimensions(),top:0,left:0};}
