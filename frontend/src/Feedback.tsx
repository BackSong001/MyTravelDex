import {useThemeColors} from './ThemeContext';
import React, {createContext, forwardRef, useContext, useEffect, useRef, useState} from 'react';
import {AccessibilityInfo, Animated, Platform, Pressable, type PressableProps} from 'react-native';

const ReducedMotion = createContext(true);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function MotionProvider({children}: {children: React.ReactNode}) {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true, changed = false;
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', value => {
      changed = true;
      if (active) setReduced(value);
    });
    void Promise.resolve().then(() => AccessibilityInfo.isReduceMotionEnabled()).then(value => {
      if (active && !changed) setReduced(value);
    }).catch(() => {});
    return () => {active = false; subscription?.remove();};
  }, []);
  return <ReducedMotion.Provider value={reduced}>{children}</ReducedMotion.Provider>;
}

export const useReducedMotion = () => useContext(ReducedMotion);

const FeedbackPressable = forwardRef<React.ElementRef<typeof Pressable>, PressableProps>(function FeedbackPressable({
  style, disabled, onPressIn, onPressOut, onHoverIn, onHoverOut, onFocus, onBlur, ...props
}, ref) {
 const c=useThemeColors();
  const reduced = useReducedMotion();
  const scale = useRef(new Animated.Value(1)).current;
  const [pressed, setPressed] = useState(false), [hovered, setHovered] = useState(false), [focused, setFocused] = useState(false);
  useEffect(() => {
    scale.stopAnimation();
    if (disabled || reduced) scale.setValue(1);
    else Animated.timing(scale, {toValue: pressed ? .975 : hovered ? 1.012 : 1, duration: pressed ? 100 : 140, useNativeDriver: true}).start();
    return () => scale.stopAnimation();
  }, [disabled, reduced, pressed, hovered, scale]);
  useEffect(() => {if (disabled) {setPressed(false); setHovered(false);}}, [disabled]);
  return <AnimatedPressable {...props} ref={ref} disabled={disabled}
    accessibilityState={{...props.accessibilityState, disabled: !!disabled}}
    onPressIn={event => {if (!disabled) setPressed(true); onPressIn?.(event);}}
    onPressOut={event => {setPressed(false); onPressOut?.(event);}}
    onHoverIn={event => {if (!disabled) setHovered(true); onHoverIn?.(event);}}
    onHoverOut={event => {setHovered(false); onHoverOut?.(event);}}
    onFocus={event => {setFocused(Platform.OS !== 'web' || (event.currentTarget as unknown as HTMLElement).matches(':focus-visible')); onFocus?.(event);}}
    onBlur={event => {setFocused(false); onBlur?.(event);}}
    style={[
      typeof style === 'function' ? style({pressed}) : style, {minWidth: 50, minHeight: 50},
      {transform: [{scale}]},
      Platform.OS === 'web' && {cursor: disabled ? 'auto' : 'pointer'},
      Platform.OS === 'web' && focused && !disabled && {outlineColor: c.focus, outlineWidth: 2, outlineOffset: 3, outlineStyle: 'solid'},
    ]}/>;
});

export default FeedbackPressable;
