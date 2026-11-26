export type Attraction = {
  id:string; name:string; address:string; latitude:number; longitude:number; category:string;
};

export function rankAttractions(candidates:Attraction[], [longitude,latitude]:number[]):Attraction[] {
  const scale=Math.cos(latitude*Math.PI/180);
  const distance=(item:Attraction)=>((item.longitude-longitude)*scale)**2+(item.latitude-latitude)**2;
  const nearest=[...candidates].sort((a,b)=>distance(a)-distance(b)||Number(a.id)-Number(b.id));
  const selected:Attraction[]=[];
  const kinds=new Set<string>();
  const used=new Set<string>();
  const locations=new Set<string>();
  // 가까운 관광지를 우선하되 세 자리를 한 종류의 명소로 채우지 않는다.
  for(const diverse of [true,false]){
    for(const item of nearest){
      const position=item.longitude+','+item.latitude;
      if(used.has(item.id)||locations.has(position)||(diverse&&kinds.has(item.category)))continue;
      selected.push(item);
      used.add(item.id);
      locations.add(position);
      kinds.add(item.category);
      if(selected.length===3)return selected;
    }
  }
  return selected;
}
