import React,{useEffect,useRef,useState} from 'react';
import {View,Text} from 'react-native';
export default function TravelMap({records,onSelect,onCoordinate}:{records:any[];onSelect?:(record:any)=>void;onCoordinate?:(latitude:number,longitude:number)=>void}){
 const host=useRef<any>(null),[error,setError]=useState(false);
 useEffect(()=>{const key=process.env.EXPO_PUBLIC_GOOGLE_MAPS_WEB_API_KEY;if(!key){setError(true);return;}
 const draw=()=>{const google=(window as any).google;if(!google?.maps||!host.current)return;const map=new google.maps.Map(host.current,{center:{lat:36.3,lng:127.7},zoom:6,disableDefaultUI:true});map.addListener('click',(e:any)=>onCoordinate?.(e.latLng.lat(),e.latLng.lng()));records.filter(r=>r.locations).forEach(r=>{const marker=new google.maps.Marker({map,position:{lat:Number(r.locations.latitude),lng:Number(r.locations.longitude)},title:r.title});marker.addListener('click',()=>onSelect?.(r));});};
 if((window as any).google?.maps){draw();return;}let script=document.querySelector<HTMLScriptElement>('script[data-travel-map]');if(!script){script=document.createElement('script');script.dataset.travelMap='1';script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}`;script.onerror=()=>setError(true);document.head.appendChild(script);}script.addEventListener('load',draw);return()=>script?.removeEventListener('load',draw);
 },[records]);
 return <View style={{height:210,borderRadius:18,overflow:'hidden',backgroundColor:'#dcebe8',marginTop:10}}>{error?<View style={{padding:24}}><Text style={{color:'#176865',fontSize:18,fontWeight:'600'}}>여행 위치를 지도에 모아보세요</Text><Text style={{color:'#537974',marginTop:14}}>지도 연결을 확인해 주세요. 좌표를 직접 입력해 기록할 수 있습니다.</Text></View>:<div ref={host} aria-label="여행 지도" style={{width:'100%',height:'100%'}}/>}</View>;
}
