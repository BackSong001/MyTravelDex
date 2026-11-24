import {t} from './translate';
import React from 'react';
import {Alert, Linking, Platform} from 'react-native';
import Text from './FontText';
import {useThemeColors} from './ThemeContext';

const hub = 'https://backsong001.github.io/MyTravelDex/';

export default function LegalLink({deletion = false}: {deletion?: boolean}) {
  const colors = useThemeColors();
  const url = deletion ? hub + 'deletion.html' : hub;
  const label = deletion ? t('계정 및 데이터 삭제 요청') : t('약관정보');
  const action = Platform.OS === 'web'
    ? {href: url, hrefAttrs: {target: '_blank', rel: 'noopener noreferrer'}}
    : {onPress: () => Linking.openURL(url).catch(() => Alert.alert(t('문서를 열 수 없어요'), url))};
  return <Text accessibilityRole="link" {...action}
    style={{minHeight: 48, padding: 12, color: colors.ink, textDecorationLine: 'underline'}}>
    {label}
  </Text>;
}
