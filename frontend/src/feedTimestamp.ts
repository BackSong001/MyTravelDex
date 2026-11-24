// 게시 시각의 달력상 월 기념일은 짧은 달의 마지막 날로 맞춘다.
export function feedTimestamp(value: string, now = new Date()) {
  const posted = new Date(value);
  if (!Number.isFinite(posted.getTime())) return '';
  const minutes = Math.max(0, Math.floor((now.getTime() - posted.getTime()) / 60000));
  if (!minutes) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)}시간 전`;
  for (let month = 3; month >= 1; month--) {
    const anniversary = new Date(posted);
    anniversary.setDate(1);
    anniversary.setMonth(anniversary.getMonth() + month + 1, 0);
    anniversary.setDate(Math.min(posted.getDate(), anniversary.getDate()));
    if (month === 3 && now > anniversary && now.toDateString() !== anniversary.toDateString()) return posted.toLocaleDateString('ko-KR');
    if (now >= anniversary) return `${month}개월 전`;
  }
  return `${Math.floor(minutes / 1440)}일 전`;
}
