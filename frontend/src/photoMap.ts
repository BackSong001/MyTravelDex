export function latestRecords<T extends {id:string;created_at?:string}>(records:T[]):T[]{
 return [...records].sort((a,b)=>(b.created_at??'').localeCompare(a.created_at??'')||a.id.localeCompare(b.id));
}
export function clusterPhotos<T extends {id:string;created_at?:string;x:number;y:number}>(records:T[],distance=64){
 const groups:{x:number;y:number;records:T[]}[]=[];
 for(const record of latestRecords(records)){
  const group=groups.find(g=>Math.hypot(g.x-record.x,g.y-record.y)<distance);
  if(group)group.records.push(record);else groups.push({x:record.x,y:record.y,records:[record]});
 }
 return groups;
}
