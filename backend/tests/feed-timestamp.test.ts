import {expect,test} from 'vitest';
import {feedTimestamp} from '../../frontend/src/feedTimestamp';
test('feed timestamp uses elapsed minutes and hours then calendar months',()=>{
 const posted='2026-01-31T12:00:00';
 for(const [now,expected] of [
  ['2026-01-31T12:00:30','방금 전'],['2026-01-31T12:05:00','5분 전'],
  ['2026-01-31T15:00:00','3시간 전'],['2026-02-03T12:00:00','3일 전'],
  ['2026-02-28T12:00:00','1개월 전'],['2026-04-30T13:00:00','3개월 전'],
  ['2026-05-01T12:00:00',new Date(posted).toLocaleDateString('ko-KR')],
 ])expect(feedTimestamp(posted,new Date(now))).toBe(expected);
});
