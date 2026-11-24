export function spansCalendarMonth(start:string,end:string){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(start)||!/^\d{4}-\d{2}-\d{2}$/.test(end))return false;
 const [y,m,d]=start.split('-').map(Number);
 const lastDay=new Date(Date.UTC(y,m+1,0)).getUTCDate();
 return end>=new Date(Date.UTC(y,m,Math.min(lastDay,d))).toISOString().slice(0,10);
}
