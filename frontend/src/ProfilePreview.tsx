import React from 'react';
import {View} from 'react-native';
import Text from './FontText';
import {Action,Notice,socialStyles as s} from './SocialUI';

type Props = {
  children: React.ReactNode;
  busy: boolean;
  error: string;
  onEdit: () => void;
  onSave: () => void;
  saveLabel?: string;
};

export default function ProfilePreview({children,busy,error,onEdit,onSave,saveLabel='프로필 저장'}: Props) {
  return <View testID="profile-preview" style={{gap:20,width:'100%',maxWidth:640,alignSelf:'center'}}>
    <View style={s.section}>
      <Text accessibilityRole="header" style={s.title}>프로필 미리보기</Text>
      <Text style={s.muted}>저장하면 My 프로필에 이렇게 표시돼요.</Text>
    </View>
    {children}
    {!!error&&<Notice message={error}/>}
    <View style={[s.row,{flexWrap:'wrap'}]}>
      <Action label="계속 편집" onPress={onEdit} disabled={busy}/>
      <Action label={saveLabel} primary onPress={onSave} disabled={busy}/>
    </View>
  </View>;
}
