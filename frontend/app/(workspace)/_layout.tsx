import { Slot, useGlobalSearchParams, usePathname } from 'expo-router';
import { Platform, View } from 'react-native';
import AppWorkspace from '../../screens/AppWorkspace';

export default function WorkspaceLayout() {
  const pathname = usePathname();
  const params = useGlobalSearchParams<{friend?:string; record?:string}>();
  if (Platform.OS !== 'web') return <Slot />;
  // 주소가 바뀌어도 지도 카메라, 피드 스크롤, 작성 중인 사진을 같은 화면에서 보존한다.
  return <>
    <View style={{display:'none'}}><Slot /></View>
    <AppWorkspace pathname={pathname} linkParams={params} />
  </>;
}
