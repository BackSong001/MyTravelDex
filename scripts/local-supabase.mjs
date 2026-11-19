import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const entry = fileURLToPath(new URL('../node_modules/supabase/dist/supabase.js', import.meta.url));

export function localSupabaseStatus(run = execFileSync) {
  let status;
  try {
    status = JSON.parse(run(process.execPath, [entry, 'status', '--workdir', 'backend', '-o', 'json'], {
      cwd:root, encoding:'utf8', stdio:['ignore','pipe','pipe'], timeout:15000, shell:false,
    }));
  } catch {
    // CLI 출력에는 로컬 키가 포함될 수 있으므로 원본 오류를 연결하지 않는다.
    throw new Error('Local test environment unavailable. Check Docker and run npm run backend:start. This is not a TDD Red result.');
  }
  if (!status || status.API_URL !== 'http://127.0.0.1:54321' ||
      typeof status.ANON_KEY !== 'string' || !status.ANON_KEY ||
      typeof status.SERVICE_ROLE_KEY !== 'string' || !status.SERVICE_ROLE_KEY) {
    throw new Error('Expected project-local Supabase at http://127.0.0.1:54321 with local test keys.');
  }
  return status;
}
