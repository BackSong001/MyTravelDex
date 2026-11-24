// 기본 Local/원격 환경을 건드리지 않는 SNS 검증 전용 인스턴스.
import {mkdirSync,readFileSync,writeFileSync,cpSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const path='/tmp/mytraveldex-sns-local';
mkdirSync(path+'/supabase',{recursive:true});
const source=readFileSync('backend/supabase/config.toml','utf8');
const config=source.replace('project_id = "mytraveldex"','project_id = "mytraveldex-sns-test"').replaceAll('54321','55321').replaceAll('54322','55322').replaceAll('54320','55320')+'\n[db.pooler]\nenabled = false\nport = 55329\n';
writeFileSync(path+'/supabase/config.toml',config);
for(const name of ['migrations','functions'])cpSync('backend/supabase/'+name,path+'/supabase/'+name,{recursive:true});
try {
execFileSync('node_modules/.bin/supabase',['start','--workdir',path],{stdio:['ignore','pipe','pipe']});
execFileSync('node_modules/.bin/supabase',['migration','up','--local','--workdir',path],{stdio:['ignore','pipe','pipe']});
console.log('SNS Local ready at 127.0.0.1:55321; no reset performed.');

} catch { console.error('SNS Local setup failed; inspect the isolated service without printing keys.'); process.exitCode=1; }
