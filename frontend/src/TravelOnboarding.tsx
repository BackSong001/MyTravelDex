import React, {useEffect, useRef, useState} from 'react';
import {Animated, Modal, ScrollView, StyleSheet, View, useWindowDimensions} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Pressable, {useReducedMotion} from './Feedback';
import Text from './FontText';
import MascotArt, {companions, CompanionPortrait, type Companion} from './MascotArt';
import {Action} from './SocialUI';
import {useThemeColors} from './ThemeContext';

export const guideSteps = [
  ['home', '홈', '하단의 배낭 아이콘을 누르면 홈이에요. 여행 기록 수와 방문 지역을 한눈에 볼 수 있어요.'],
  ['map', '지도', '지도에서 여행지를 둘러보고 해당 지역의 여행 기록을 볼 수 있어요.'],
  ['photos', '여행 기록 추가', '사진 목록에서 여행 사진을 고르고 날짜와 여행지를 확인하세요.'],
  ['feed', '발견 피드', '하단의 카메라 아이콘이 발견 피드예요. 다른 여행자들이 공개한 여행 기록을 볼 수 있어요.'],
  ['album', '여행도감', '책 아이콘을 누르면 지난 여행을 찾고 스탬프를 확인할 수 있어요.'],
  ['account', 'My', '프로필 사진과 소개를 편집하고 팔로우를 관리할 수 있어요.'],
] as const;

type GuideTarget = typeof guideSteps[number][0];
export type GuideAnchors = Partial<Record<GuideTarget, View | null>>;
const choices = Object.keys(companions) as Companion[];

export type OnboardingPreference = {name: string; companion?: Companion; done?: boolean};
export const onboardingKey = (owner: string) => 'travel.onboarding.v1.' + owner;

export function readOnboardingPreference(raw: string | null): OnboardingPreference | null {
  if (!raw) return null;
  const value = JSON.parse(raw);
  if (typeof value?.name !== 'string' || !value.name.trim()) return null;
  const companion = choices.find(choice => choice === value.companion);
  return {name: value.name, companion, done: !!companion && value.done === true};
}

function Greeting({companion}: {companion: Companion}) {
  const reduced = useReducedMotion();
  const [motion] = useState(() => ({
    idle: new Animated.Value(0), photo: new Animated.Value(0),
    hop: new Animated.Value(0), wave: new Animated.Value(0),
  }));
  useEffect(() => {
    if (reduced) return;
    const animation = Animated.parallel([
      Animated.timing(motion.hop, {toValue: 1, duration: 830, useNativeDriver: true}),
      Animated.timing(motion.wave, {toValue: 1, duration: 1050, useNativeDriver: true}),
    ]);
    animation.start();
    return () => animation.stop();
  }, [motion, reduced]);
  return <View style={styles.greeting}><MascotArt kind={companion} {...motion}/></View>;
}

type Props = {
  preference: OnboardingPreference;
  step: number;
  anchors: GuideAnchors;
  onChoose: (companion: Companion) => void;
  onStep: (step: number) => void;
  onFinish: () => void;
};

export default function TravelOnboarding({preference, step, anchors, onChoose, onStep, onFinish}: Props) {
  const c = useThemeColors(), insets = useSafeAreaInsets(), size = useWindowDimensions();
  const [draft, setDraft] = useState<Companion>();
  const [spot, setSpot] = useState<{x: number; y: number; diameter: number}>();
  const surface = useRef<View>(null);
  const guide = guideSteps[step];
  const target = guide?.[0];
  const companion = preference.companion;
  useEffect(() => {
    setSpot(undefined);
    if (!target) return;
    let active = true;
    function measure() {
      if (!target) return;
      anchors[target]?.measureInWindow((x, y, width, height) => {
        if (!width || !height) return;
        surface.current?.measureInWindow((left, top) => {
          if (!active) return;
          const next = {x: x - left + width / 2, y: y - top + height / 2, diameter: Math.max(42, Math.min(52, Math.max(width, height) + 10))};
          setSpot(previous => previous?.x === next.x && previous.y === next.y && previous.diameter === next.diameter ? previous : next);
        });
      });
    }
    measure();
    const timer = setInterval(measure, 160);
    return () => {active = false; clearInterval(timer);};
  }, [anchors, target, size.width, size.height]);

  const title = !companion ? preference.name + '님 반가워요!' : guide?.[1] ??
    (step < 0 ? '반가워요 ' + preference.name + '님!' : '우리 이제 출발해요!');
  const text = !companion ? '이제 ' + preference.name + '님과 함께 여행을 다닐 여행 친구를 선택해주세요.' : guide?.[2] ??
    (step < 0 ? '저는 ' + companions[companion].name + '예요. 지금부터 앱에 대해서 간단히 소개할게요!' :
      '앞으로의 ' + preference.name + '님과의 여행이 기대돼요! 좋은 추억 많이 만들어 봐요!!');
  const bottomTarget = spot && spot.y > size.height * .72;
  const top = guide && !bottomTarget && (!spot || spot.y >= size.height / 2);
  const bottomPadding = bottomTarget ? Math.max(insets.bottom + 12, size.height - spot.y + spot.diameter / 2 + 14) : insets.bottom + 12;

  return <Modal transparent visible animationType="none" onRequestClose={companion ? onFinish : () => undefined}>
    <View ref={surface} collapsable={false} accessibilityViewIsModal style={[styles.surface, {
      paddingTop: insets.top + 12, paddingBottom: bottomPadding, justifyContent: guide ? top ? 'flex-start' : 'flex-end' : 'center',
    }]}>
      {guide && spot && <View pointerEvents="none" testID="onboarding-highlight" style={[styles.spot, {
        top: spot.y - spot.diameter / 2, left: spot.x - spot.diameter / 2, width: spot.diameter, height: spot.diameter,
        borderRadius: spot.diameter / 2,
      }]}/>}
      <ScrollView testID="onboarding-message" keyboardShouldPersistTaps="handled" style={[styles.bubble, {
        backgroundColor: c.sheet, borderColor: c.line, maxHeight: guide ? '46%' : '88%',
      }]} contentContainerStyle={styles.content}>
        {companion && step < 0 && <Greeting companion={companion}/>}
        <View style={styles.row}>
          {companion && step >= 0 && <CompanionPortrait kind={companion}/>}
          <Text accessibilityRole="header" accessibilityLiveRegion="polite" style={[styles.title, {color: c.ink}]}>{title}</Text>
        </View>
        <Text style={{color: c.ink, lineHeight: 22}}>{text}</Text>
        {!companion ? <>
          <View style={styles.choices}>{choices.map(choice => <Pressable key={choice} accessibilityRole="button"
            accessibilityLabel={companions[choice].name + ' 선택'} accessibilityState={{selected: draft === choice}}
            onPress={() => setDraft(choice)} style={[styles.choice, {borderColor: draft === choice ? c.ink : c.line}]}>
            <CompanionPortrait kind={choice}/><Text style={{color: c.ink}}>{companions[choice].name}</Text>
          </Pressable>)}</View>
          <Action label="이 친구와 함께하기" primary disabled={!draft} onPress={() => {if (draft) onChoose(draft);}}/>
        </> : <View style={styles.row}>
          {step >= 0 && <Action label="뒤로" onPress={() => onStep(step - 1)}/>}
          {step < guideSteps.length && <Action label="건너뛰기" onPress={onFinish}/>}
          <Action primary label={step < 0 ? '앱 소개 보기' : guide ? '다음' : '홈으로 가기'}
            onPress={() => guide || step < 0 ? onStep(step + 1) : onFinish()}/>
        </View>}
      </ScrollView>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  surface: {flex: 1, paddingHorizontal: 14, backgroundColor: '#21162A26'},
  bubble: {width: '100%', maxWidth: 460, alignSelf: 'center', flexGrow: 0, borderWidth: 1, borderRadius: 18},
  content: {padding: 14, gap: 8},
  row: {flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6},
  title: {fontSize: 19, fontWeight: '700', flexShrink: 1},
  greeting: {alignItems: 'center'},
  choices: {flexDirection: 'row', flexWrap: 'wrap', gap: 8},
  choice: {flexBasis: '46%', flexGrow: 1, minHeight: 75, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: 12},
  spot: {position: 'absolute', borderWidth: 3, borderColor: '#6936A0', borderStyle: 'dashed'},
});
