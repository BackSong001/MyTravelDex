// 운영자가 검토한 신고만 명시적 대상 환경에서 처리한다. 비밀값은 출력하지 않는다.
const [operation,report_id,decision,action,note,operator]=process.argv.slice(2);
const base=process.env.SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY;
if(!base||!key||!['list','resolve'].includes(operation))throw new Error('Set SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY; use list or resolve <report UUID> <resolved|dismissed> <action> <note> <operator>');
const headers={apikey:key,Authorization:`Bearer ${key}`,'Content-Type':'application/json'};
const response=await fetch(base+(operation==='list'?'/rest/v1/social_reports?status=eq.pending&order=created_at.asc&limit=50':'/rest/v1/rpc/social_moderate'),{method:operation==='list'?'GET':'POST',headers,...(operation==='resolve'?{body:JSON.stringify({report_id,decision,action,note,operator})}:{})});
if(!response.ok)throw new Error(`Moderation failed (${response.status})`);
console.log(await response.json());
