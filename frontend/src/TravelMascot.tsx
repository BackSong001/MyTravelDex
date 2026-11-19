import React, {useEffect, useRef, useState} from 'react';
import {Animated, Easing, Pressable, StyleSheet, View} from 'react-native';
import Svg, {Circle, G, Path} from 'react-native-svg';
import {useReducedMotion} from './Feedback';
import Text from './FontText';
import MascotArt, {companions, CompanionPortrait, type Companion} from './MascotArt';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Trick = 'wave' | 'photo' | 'hop';
const ink = '#48382D';

const preferenceKey = 'home.mascot';
const choices = Object.keys(companions) as Companion[];

export default function TravelMascot() {
  const reduced = useReducedMotion();
  const [motion] = useState(() => ({idle:new Animated.Value(0), wave:new Animated.Value(0), photo:new Animated.Value(0), hop:new Animated.Value(0)}));
  const {idle,wave,photo,hop} = motion;
  const playing = useRef<Animated.CompositeAnimation | null>(null);
  const [reaction,setReaction] = useState<Trick | null>(null);

  const [companion,setCompanion] = useState<Companion>('squirrel');
  const picked = useRef(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(preferenceKey).then(saved=>{
      if (active && !picked.current && choices.some(id=>id===saved)) setCompanion(saved as Companion);
    }).catch(()=>{});
    return () => {active=false;};
  },[]);

  function choose(next:Companion) {
    picked.current = true;
    setCompanion(next);
    void AsyncStorage.setItem(preferenceKey,next).catch(()=>{});
    if (next===companion) return;
    playing.current?.stop();
    wave.setValue(0);
    photo.setValue(0);
    hop.setValue(0);
    setReaction(null);
  }

  useEffect(() => {
    idle.setValue(0);
    wave.setValue(0);
    photo.setValue(0);
    hop.setValue(0);
    const breathing = Animated.loop(Animated.timing(idle,{
      toValue:1, duration:5400, easing:Easing.linear, isInteraction:false, useNativeDriver:true,
    }));
    if (!reduced) breathing.start();
    return () => {breathing.stop(); playing.current?.stop();};
  },[reduced,idle,wave,photo,hop]);

  function play(trick:Trick) {
    playing.current?.stop();
    wave.setValue(0);
    photo.setValue(0);
    hop.setValue(0);
    setReaction(trick);
    const value = motion[trick];
    if (reduced) {
      value.setValue({wave:.56,photo:.65,hop:.45}[trick]);
      return;
    }
    playing.current = Animated.timing(value,{
      toValue:1, duration:{wave:1050,photo:1250,hop:830}[trick],
      easing:Easing.inOut(Easing.sin), isInteraction:false, useNativeDriver:true,
    });
    playing.current.start();
  }

  const caption = reaction==='photo' ? '찰칵! 렌즈를 봐요.' : reaction==='hop' ? '폴짝! 출발할 준비 됐어요.' :
    reaction==='wave' ? '반가워요, 여행자님!' : companions[companion].name;

  return <View>
    <View testID="mascot-stage" style={styles.card}>
      <Pressable testID="travel-squirrel" accessibilityRole="button" accessibilityLabel={companions[companion].name+'에게 인사하기'}
        accessibilityHint="누르면 손을 흔들어요"
        onPress={() => play('wave')} style={styles.stage}>
        <MascotArt kind={companion} idle={idle} wave={wave} photo={photo} hop={hop}/>
        <Text accessibilityLiveRegion="polite" style={styles.caption}>{caption}</Text>
      </Pressable>
      <View style={styles.controls}>
        {(['photo','hop'] as const).map(trick=><Pressable key={trick} accessibilityRole="button"
          accessibilityLabel={trick==='photo'?'사진 찍기 놀이':'폴짝 뛰기'} onPress={()=>play(trick)}
          style={({pressed})=>[styles.control,{backgroundColor:pressed?'#F3F0EB':'#FFFFFF'}]}>
          <Svg width={17} height={17} viewBox="0 0 24 24" accessible={false}>
            <G fill="none" stroke={ink} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
              {trick==='photo'?<><Path d="M3 8h4l2-3h6l2 3h4v12H3Z"/><Circle cx={12} cy={13.5} r={3.5}/></>:
                <Path d="M3 18Q7 19 9 11Q12 0 16 6Q18 9 15 15M12 13l3 3 4-3M4 21h5"/>}
            </G>
          </Svg>
          <Text style={styles.controlText}>{trick==='photo'?'사진 찍기':'폴짝 뛰기'}</Text>
        </Pressable>)}
      </View>
      <View style={styles.choices}>
        {choices.map(id=>{
          const selected = id===companion;
          return <Pressable key={id} accessibilityRole="button" accessibilityLabel={companions[id].name+' 선택'}
            accessibilityState={{selected}} onPress={()=>choose(id)} style={styles.choice}>
            <View style={[styles.portrait,selected&&styles.activePortrait]}><CompanionPortrait kind={id}/></View>
            <Text style={[styles.choiceName,selected&&styles.activeName]}>{companions[id].name}</Text>
          </Pressable>;
        })}
      </View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  card:{borderRadius:20,overflow:'hidden',backgroundColor:'#FFFFFF',paddingBottom:12},
  stage:{alignItems:'center',paddingHorizontal:12,paddingTop:6},
  caption:{fontWeight:'700',color:ink,fontSize:16,textAlign:'center'},
  controls:{flexDirection:'row',justifyContent:'center',flexWrap:'wrap',gap:8,marginTop:8},
  control:{flexDirection:'row',alignItems:'center',justifyContent:'center',minHeight:48,paddingHorizontal:16,gap:6,borderWidth:1,borderColor:'#DFDDD8',borderRadius:24},
  choices:{flexDirection:'row',flexWrap:'wrap',justifyContent:'center',marginTop:14,gap:5},
  choice:{alignItems:'center',justifyContent:'center',minWidth:62,minHeight:58,gap:3,paddingHorizontal:2},
  portrait:{width:51,height:44,borderRadius:15,borderWidth:1.5,borderColor:'#EAE7E3',alignItems:'center',justifyContent:'center'},
  activePortrait:{borderColor:ink},
  choiceName:{fontSize:12,color:'#675F59'},
  activeName:{fontWeight:'700',color:ink},
  controlText:{fontSize:14,fontWeight:'600',color:ink},
});
