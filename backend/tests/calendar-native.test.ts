import {afterEach,beforeEach,expect,test,vi} from 'vitest';
import React from '../../frontend/node_modules/react';
import {renderToStaticMarkup} from '../../frontend/node_modules/react-dom/server';
const {buttons,open,dismiss}=vi.hoisted(()=>({buttons:[] as any[],open:vi.fn(),dismiss:vi.fn().mockResolvedValue(false)}));
vi.mock('../../frontend/node_modules/react-native',()=>({Platform:{OS:'android'},View:'section',TextInput:'input',Modal:'dialog',StyleSheet:{create:(s:any)=>s}}));
vi.mock('../../frontend/src/FontText',()=>({default:'span'}));
vi.mock('../../frontend/src/Feedback',()=>({default:(props:any)=>{buttons.push(props);return React.createElement('button',{'aria-label':props.accessibilityLabel});}}));
vi.mock('../../frontend/node_modules/@react-native-community/datetimepicker',()=>({default:'os-calendar',DateTimePickerAndroid:{open,dismiss}}));
import DateField from '../../frontend/src/DateField';
beforeEach(()=>{buttons.length=0;vi.clearAllMocks();});afterEach(()=>vi.unstubAllEnvs());
test.each(['Asia/Seoul','Pacific/Honolulu'])('TC-CALENDAR-001: local calendar selection keeps leap-day and year boundaries in %s',timezone=>{
 vi.stubEnv('TZ',timezone);const change=vi.fn();renderToStaticMarkup(React.createElement(DateField,{label:'여행 시작일',value:'2024-02-29',onChange:change}));
 const button=buttons.find(b=>b.accessibilityLabel==='여행 시작일 달력 열기');button.onPress();let options=open.mock.calls[0][0];expect(options.mode).toBe('date');expect([options.value.getFullYear(),options.value.getMonth()+1,options.value.getDate()]).toEqual([2024,2,29]);
 options.onChange({type:'set'},new Date(2024,1,29,0,15));expect(change).toHaveBeenLastCalledWith('2024-02-29');button.onPress();options=open.mock.calls[1][0];options.onChange({type:'set'},new Date(2026,11,31,23,55));expect(change).toHaveBeenLastCalledWith('2026-12-31');
});
test('TC-CALENDAR-001: dismiss, a late cancelled callback, invalid dates and disabled controls preserve the input',()=>{
 const change=vi.fn();renderToStaticMarkup(React.createElement(DateField,{label:'여행 종료일',value:'2026-11-10',onChange:change}));const button=buttons[0];button.onPress();const options=open.mock.calls[0][0];options.onChange({type:'dismissed'});options.onChange({type:'set'},new Date(2026,10,11));expect(change).not.toHaveBeenCalled();
 button.onPress();options.onChange({type:'set'},new Date(2026,10,11));expect(change).not.toHaveBeenCalled();open.mock.calls[1][0].onChange({type:'set'},new Date(NaN));expect(change).not.toHaveBeenCalled();
 buttons.length=0;renderToStaticMarkup(React.createElement(DateField,{label:'여행 종료일',value:'2026-11-10',onChange:change,disabled:true}));expect(buttons[0].disabled).toBe(true);buttons[0].onPress();expect(open).toHaveBeenCalledTimes(2);
});
test('TC-CALENDAR-001: repeated activation keeps one native dialog and its original selection callback',()=>{
 const change=vi.fn();renderToStaticMarkup(React.createElement(DateField,{label:'여행 시작일',value:'2026-11-10',onChange:change}));buttons[0].onPress();buttons[0].onPress();expect(open).toHaveBeenCalledTimes(1);open.mock.calls[0][0].onChange({type:'set'},new Date(2026,10,11));expect(change).toHaveBeenCalledExactlyOnceWith('2026-11-11');
});
