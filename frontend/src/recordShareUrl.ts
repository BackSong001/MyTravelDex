import {createURL} from 'expo-linking';
import {Platform} from 'react-native';

export function recordShareUrl(id:string){
 const path='/record/'+encodeURIComponent(id);
 if(Platform.OS==='web')return new URL(path,window.location.origin).href;
 if(process.env.EXPO_PUBLIC_APP_ENV==='production')return 'https://mytraveldex-app.pages.dev'+path;
 return createURL('/',{queryParams:{record:id}});
}
