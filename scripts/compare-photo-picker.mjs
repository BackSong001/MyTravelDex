import {createServer} from 'node:http';
import {photoPickerComparisonHTML} from '../frontend/e2e/photo-picker-comparison.ts';

// 기기에서 선택한 사진은 서버로 전송하지 않고 브라우저 안에서만 검사한다.
const html=await photoPickerComparisonHTML();
createServer((req,res)=>{
 if(req.url!=='/'){res.writeHead(404).end();return;}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}).end(html);
}).listen(8086,'127.0.0.1',()=>console.log('Photo picker comparison: http://127.0.0.1:8086 (Android: adb reverse tcp:8086 tcp:8086)'));
