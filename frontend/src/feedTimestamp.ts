// 게시 시각의 달력상 월 기념일은 짧은 달의 마지막 날로 맞춘다.
export function feedTimestamp(value: string, now = new Date(), language: 'ko'|'en' = 'ko') {
  const posted = new Date(value);
  if (!Number.isFinite(posted.getTime())) return '';
  const minutes = Math.max(0, Math.floor((now.getTime() - posted.getTime()) / 60000));
  const relative=(n:number,unit:Intl.RelativeTimeFormatUnit,ko:string)=>language==='en'?new Intl.RelativeTimeFormat('en').format(-n,unit):n+ko+' 전';
  if (!minutes) return language==='en'?'Just now':'방금 전';
  if (minutes < 60) return relative(minutes,'minute','분');
  if (minutes < 1440) return relative(Math.floor(minutes/60),'hour','시간');
  for (let month = 3; month >= 1; month--) {
    const anniversary = new Date(posted);
    anniversary.setDate(1);
    anniversary.setMonth(anniversary.getMonth() + month + 1, 0);
    anniversary.setDate(Math.min(posted.getDate(), anniversary.getDate()));
    if (month === 3 && now > anniversary && now.toDateString() !== anniversary.toDateString()) return posted.toLocaleDateString(language==='en'?'en-US':'ko-KR');
    if (now >= anniversary) return relative(month,'month','개월');
  }
  return relative(Math.floor(minutes/1440),'day','일');
}
