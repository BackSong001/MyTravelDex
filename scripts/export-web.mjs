import {spawn} from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {publicConfiguration} from './configured.mjs';
export function productionWebConfiguration(source){
 const config=publicConfiguration(source),host=new URL(config.EXPO_PUBLIC_SUPABASE_URL).hostname;
 if(host==='localhost'||host.endsWith('.localhost')||host==='[::1]'||/^127\./.test(host))throw new Error('Production Supabase URL must not use a local host');
 return {...config,EXPO_PUBLIC_APP_ENV:'production',EXPO_NO_DOTENV:'1'};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
  const env={...process.env,...productionWebConfiguration(process.env)};
  const child=spawn(process.execPath,[fileURLToPath(new URL('../frontend/node_modules/expo/bin/cli',import.meta.url)),'export','--platform','web',...process.argv.slice(2)],{cwd:fileURLToPath(new URL('../frontend',import.meta.url)),env,stdio:'inherit'});
  child.on('error',()=>{console.error('Web export failed');process.exitCode=1;});child.on('exit',code=>{process.exitCode=code??1;});
 }catch(error){console.error(error.message);process.exitCode=1;}
}
