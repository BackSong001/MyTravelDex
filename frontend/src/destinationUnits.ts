import type {District} from './destinationDraw';

const provinceNames:Record<string,string>={
 'KR-11':'서울특별시','KR-26':'부산광역시','KR-27':'대구광역시','KR-28':'인천광역시',
 'KR-29':'광주광역시','KR-30':'대전광역시','KR-31':'울산광역시','KR-50':'세종특별자치시',
 'KR-41':'경기도','KR-42':'강원도','KR-43':'충청북도','KR-44':'충청남도',
 'KR-45':'전라북도','KR-46':'전라남도','KR-47':'경상북도','KR-48':'경상남도','KR-49':'제주특별자치도',
};
const metros=new Set(['KR-11','KR-26','KR-27','KR-28','KR-29','KR-30','KR-31']);
function union(boxes:number[][]){
 return [Math.min(...boxes.map(b=>b[0])),Math.min(...boxes.map(b=>b[1])),Math.max(...boxes.map(b=>b[2])),Math.max(...boxes.map(b=>b[3]))];
}
export type Destination={id:string;name:string;label:string;province:string;members:District[];path:string;bounds:number[];frame:number[];point:number[]};

// 원본 경계와 방문 코드는 보존하고, 추첨 전에만 여행지 단위를 만든다.
export function buildDestinations(source:District[]):Destination[]{
 const groups=new Map<string,{name:string;wholeProvince:boolean;members:District[]}>();
 for(const district of source){
  const wholeProvince=district.province==='KR-50'||(metros.has(district.province)&&district.name.endsWith('구'));
  const city=district.name.endsWith('구')?district.name.match(/^(.+?시)/)?.[1]:undefined;
  const name=wholeProvince?provinceNames[district.province]:city??district.name;
  const id=district.province+':'+name;
  const group=groups.get(id)??{name,wholeProvince,members:[]};
  group.members.push(district);groups.set(id,group);
 }
 return [...groups].map(([id,{name,wholeProvince,members}])=>({
  id,name,label:wholeProvince?name:provinceNames[members[0].province]+' '+name,
  province:members[0].province,members,path:members.map(m=>m.path).join(''),
  bounds:union(members.map(m=>m.bounds)),frame:union(members.map(m=>m.frame)),point:members[0].point,
 }));
}
export function isDestinationVisited(destination:Destination,visited:ReadonlySet<string>){
 return destination.members.every(member=>visited.has(member.id));
}
