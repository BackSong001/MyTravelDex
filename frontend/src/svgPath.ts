// d3가 이미 반올림한 같은 점의 연속 L 명령만 제거한다. M/Z 및 링 순서는 유지한다.
export function compactSvgPath(path:string){
 let previous='';
 return path.replace(/([ML])([^MLZ]+)/g,(command,kind,point)=>{
  if(kind==='L'&&point===previous)return '';
  previous=point;return command;
 });
}
