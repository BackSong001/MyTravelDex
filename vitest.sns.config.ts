import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:[
 'backend/tests/social-core.test.ts','backend/tests/avatar-cleanup-race.test.ts',
 'backend/tests/photo-url-gate.test.ts','backend/tests/avatar-validation.test.ts',
 'backend/tests/api-response.test.ts',
],fileParallelism:false,testTimeout:60000,hookTimeout:60000}});
