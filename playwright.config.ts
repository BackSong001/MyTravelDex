import {defineConfig,chromium} from '@playwright/test';
export default defineConfig({testDir:'frontend/e2e',workers:1,timeout:60000,use:{baseURL:'http://127.0.0.1:8082',viewport:{width:390,height:844},launchOptions:{executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH||chromium.executablePath()}},reporter:'list'});
