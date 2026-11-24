import {defineConfig} from 'vitest/config';
export default defineConfig({test:{include:['backend/tests/**/*.test.ts'],exclude:['backend/tests/social-core.test.ts','backend/tests/avatar-cleanup-race.test.ts'],testTimeout:60000,hookTimeout:60000}});
