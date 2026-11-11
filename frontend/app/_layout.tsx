import {useThemeColors,useThemeStyles,type ThemeColors} from '../src/ThemeContext';
import React, {useEffect, useState} from 'react';
import Text from '../src/FontText';
import {Platform,StyleSheet, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {SplashScreen, Stack} from 'expo-router';
import {StatusBar} from 'expo-status-bar';
import {Backpack} from '../src/Journal';
import {api} from '../src/runtime';
import {contrastRatio} from '../src/themes';
import {ThemeProvider} from '../src/ThemeProvider';
import useAppViewport from '../src/useAppViewport';
import {MotionProvider} from '../src/Feedback';

void SplashScreen.preventAutoHideAsync().catch(() => {});

export default function Layout(){return <ThemeProvider><ThemedLayout/></ThemeProvider>;}
function ThemedLayout() {
 const c=useThemeColors(),viewport=useAppViewport();
 const s=useThemeStyles(makeStyles);
  const [localReady, setLocalReady] = useState(false);
  const [laidOut, setLaidOut] = useState(false);
  const ready = localReady && laidOut;
  useEffect(() => {
    let active = true;
    // 로컬 저장소만 준비한다. 세션 갱신·지도·목록 요청은 화면에서 처리한다.
    const storageKey = `sb-${new URL(api.url).hostname.split('.')[0]}-auth-token`;
    void AsyncStorage.getItem(storageKey).catch(() => null).finally(() => {
      if (active) setLocalReady(true);
    });
    return () => {active = false;};
  }, []);
  useEffect(() => {
    if (ready) void SplashScreen.hideAsync().catch(() => {});
  }, [ready]);
  return <MotionProvider><View testID="viewport-frame" style={[s.root,Platform.OS==='web'&&{position:'absolute',top:viewport.top??0,left:viewport.left??0,width:viewport.width,maxWidth:'100%',height:viewport.height}]} onLayout={() => setLaidOut(true)}>
    <StatusBar style={contrastRatio('#FFFFFF',c.paper)>contrastRatio('#000000',c.paper)?'light':'dark'}/>
    <View style={s.root} accessibilityElementsHidden={!ready} importantForAccessibility={ready ? 'auto' : 'no-hide-descendants'}>
      <Stack screenOptions={{headerShown: false, contentStyle: {backgroundColor: c.paper}}}/>
    </View>
    {!ready && <View style={s.splash} accessible accessibilityLabel="여행가봥 시작 중" accessibilityRole="progressbar">
      <Backpack size={112}/><Text style={s.brand}>여행가봥</Text>
    </View>}
  </View></MotionProvider>;
}

const makeStyles=(c: ThemeColors)=>StyleSheet.create({
  root: {flex: 1, backgroundColor: c.paper},
  splash: {...StyleSheet.absoluteFillObject, backgroundColor: c.paper, justifyContent: 'center', alignItems: 'center', padding: 24},
  brand: {fontSize: 32, fontWeight: '800', color: c.ink, marginTop: 20, textAlign: 'center'},
});
