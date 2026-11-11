import {useEffect,useState} from 'react';
import {useWindowDimensions} from 'react-native';

export default function useAppViewport(){
 const layout=useWindowDimensions(),[visible,setVisible]=useState<{width:number;height:number;top:number;left:number}|null>(null);
 useEffect(()=>{
  const viewport=window.visualViewport;if(!viewport)return;
  let frame=0;
  const update=()=>{frame=0;const next=Math.abs(viewport.scale-1)<.01?{width:viewport.width,height:viewport.height,top:viewport.offsetTop,left:viewport.offsetLeft}:null;
   setVisible(previous=>previous?.width===next?.width&&previous?.height===next?.height&&previous?.top===next?.top&&previous?.left===next?.left?previous:next);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};update();
  viewport.addEventListener('resize',schedule);viewport.addEventListener('scroll',schedule);window.addEventListener('resize',schedule);
  return()=>{cancelAnimationFrame(frame);viewport.removeEventListener('resize',schedule);viewport.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
 },[]);
 return {...layout,...visible,top:visible?.top??0,left:visible?.left??0};
}
