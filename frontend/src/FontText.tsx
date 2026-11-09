import React from 'react';
import {Platform,Text,useWindowDimensions} from 'react-native';

export default function FontText(props:React.ComponentPropsWithRef<typeof Text>){
 // shortcut: Text별 Dimensions 구독이다. 대량목록에서 병목이 관측되면 공통 구독으로 옮긴다.
 const {fontScale}=useWindowDimensions();
 // RN 0.81에서 기존 Text 측정이 남으므로 글자 노드만 갱신한다.
 return <Text key={Platform.OS==='android'?fontScale:undefined} {...props}/>;
}
