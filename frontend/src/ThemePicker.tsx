import React,{useRef,useState} from 'react';
import {Modal,ScrollView,View,Platform} from 'react-native';
import Text from './FontText';
import Pressable from './Feedback';
import {themes} from './themes';
import {useTheme} from './ThemeContext';

export default function ThemePicker(){
 const {theme,select,storageError}=useTheme(),c=theme.colors;
 const [open,setOpen]=useState(false),trigger=useRef<any>(null);
 const close=()=>{setOpen(false);if(Platform.OS==='web')requestAnimationFrame(()=>trigger.current?.focus());};
 return <>
  <Pressable ref={trigger} accessibilityRole="button" accessibilityLabel="테마" accessibilityHint={`현재 ${theme.name}`} onPress={()=>setOpen(true)} style={{padding:12,borderRadius:10,borderWidth:1,borderColor:c.line,backgroundColor:c.sheet}}><Text style={{fontSize:13,color:c.ink}}>테마</Text></Pressable>
  <Modal visible={open} onRequestClose={close} animationType="none" transparent>
   <View style={{flex:1,backgroundColor:'#00000066',justifyContent:'center',padding:16}}>
    <View accessibilityViewIsModal accessibilityLabel="테마 선택" style={{width:'100%',maxWidth:560,maxHeight:'90%',alignSelf:'center',backgroundColor:c.sheet,borderRadius:16,borderWidth:1,borderColor:c.line}}>
     <View style={{padding:16,flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12}}><View style={{flex:1}}><Text accessibilityRole="header" style={{fontSize:22,lineHeight:32,fontWeight:'600',color:c.ink}}>여행의 색</Text><Text style={{fontSize:12,lineHeight:20,color:c.muted}}>사진과 기록은 그대로, 분위기만 바꿔요</Text></View><Pressable accessibilityRole="button" accessibilityLabel="테마 선택 닫기" onPress={close} style={{padding:12}}><Text style={{color:c.ink}}>닫기</Text></Pressable></View>
     {!!storageError&&<Text accessibilityRole="alert" style={{padding:16,color:c.error,backgroundColor:c.errorSurface}}>{storageError}</Text>}
     <ScrollView contentContainerStyle={{paddingHorizontal:16,paddingBottom:16}}>
      <View accessibilityRole="radiogroup" accessibilityLabel="앱 테마">
       {themes.map((item,index)=><React.Fragment key={item.id}>
        {(index===0||themes[index-1].group!==item.group)&&<Text style={{color:c.muted,fontSize:12,paddingVertical:12}}>{item.group}</Text>}
        <Pressable accessibilityRole="radio" accessibilityLabel={item.name} accessibilityState={{checked:theme.id===item.id}} aria-checked={theme.id===item.id} onPress={()=>select(item.id)} style={{minHeight:64,padding:12,borderRadius:12,marginBottom:4,borderWidth:theme.id===item.id?2:1,borderColor:theme.id===item.id?c.focus:c.line,backgroundColor:theme.id===item.id?c.warm:c.sheet,flexDirection:'row',alignItems:'center',gap:12}}>
         <View accessible={false} style={{width:44,height:36,borderRadius:8,backgroundColor:item.colors.paper,borderWidth:1,borderColor:item.colors.line,flexDirection:'row',padding:8,gap:4}}><View style={{flex:1,backgroundColor:item.colors.coral,borderRadius:3}}/><View style={{flex:1,backgroundColor:item.colors.map.ocean,borderRadius:3}}/></View>
         <Text style={{flex:1,color:c.ink,fontSize:14,lineHeight:22}}>{item.name}</Text><Text accessible={false} style={{color:c.sea}}>{theme.id===item.id?'✓':''}</Text>
        </Pressable>
       </React.Fragment>)}
      </View>
     </ScrollView>
    </View>
   </View>
  </Modal>
 </>;
}
