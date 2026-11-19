import {expect, test, vi} from 'vitest';
import {localSupabaseStatus} from '../../scripts/local-supabase.mjs';
import {fileURLToPath} from 'node:url';

const fixture = {API_URL:'http://127.0.0.1:54321', ANON_KEY:'test-anon', SERVICE_ROLE_KEY:'test-service'};
test('runs the installed CLI with Node and a fixed project cwd without a shell', () => {
  const run = vi.fn(() => JSON.stringify(fixture));
  expect(localSupabaseStatus(run)).toEqual(fixture);
  const [command, args, options] = run.mock.calls[0] as unknown as [string,string[],any];
  expect(command).toBe(process.execPath);
  expect(args[0].replaceAll('\\','/')).toMatch(/\/node_modules\/supabase\/dist\/supabase\.js$/);
  expect(args.slice(1)).toEqual(['status','--workdir','backend','-o','json']);
  expect(options.cwd).toBe(fileURLToPath(new URL('../../',import.meta.url)));
  expect(options).toMatchObject({shell:false, timeout:15000, stdio:['ignore','pipe','pipe']});
});
test.each(['https://remote.example.test','http://localhost:54321', undefined])('rejects non-project endpoints: %s', API_URL => {
  expect(() => localSupabaseStatus(() => JSON.stringify({...fixture,API_URL}))).toThrow('Expected project-local Supabase');
});
test.each([null, [], {API_URL:fixture.API_URL}, {...fixture, ANON_KEY:4}])('rejects malformed status without exposing it', payload => {
  expect(() => localSupabaseStatus(() => JSON.stringify(payload))).toThrow('Expected project-local Supabase');
});
test('does not propagate CLI stdout, stderr, secret text or cause on failure', () => {
  const failure = Object.assign(new Error('sensitive-test-value'), {stdout:'private-stdout',stderr:'private-stderr'});
  try { localSupabaseStatus(() => {throw failure;}); throw new Error('Did not reject'); }
  catch(error:any) {
    expect(error.message).toContain('Local test environment unavailable');
    expect(error.cause).toBeUndefined();
    expect(error.stdout).toBeUndefined();
    expect(error.stderr).toBeUndefined();
    expect(String(error)).not.toMatch(/sensitive-test-value|private-stdout|private-stderr/);
  }
});
test('does not expose malformed JSON in a parser error', () => {
  expect(() => localSupabaseStatus(() => 'private-malformed-json')).toThrow('Local test environment unavailable');
});
