import { Redirect } from 'expo-router';
import { Platform } from 'react-native';

export default function Destination() {
  return Platform.OS === 'web' ? null : <Redirect href="/" />;
}
