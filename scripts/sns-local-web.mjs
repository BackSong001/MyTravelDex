// 기존 Local/실제 프로젝트 환경을 바꾸지 않는 SNS 격리 검증 서버.
import {execFileSync,spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
const cache='/tmp/mytraveldex-sns-metro';mkdirSync(cache,{recursive:true});
const status=JSON.parse(execFileSync('node_modules/.bin/supabase',['status','--workdir','/tmp/mytraveldex-sns-local','-o','json'],{encoding:'utf8',stdio:['ignore','pipe','pipe']}));
if(status.API_URL!=='http://127.0.0.1:55321')throw new Error('Only isolated SNS Local is allowed');
const child=spawn('node',['node_modules/expo/bin/cli','start','--web','--localhost','--port','8086','--no-dev'],{cwd:'frontend',stdio:'inherit',env:{...process.env,TMPDIR:cache,EXPO_NO_DOTENV:'1',EXPO_PUBLIC_APP_ENV:'local',EXPO_PUBLIC_SUPABASE_URL:status.API_URL,EXPO_PUBLIC_SUPABASE_ANON_KEY:status.ANON_KEY}});
child.on('exit',code=>process.exit(code??1));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>child.kill(signal));
