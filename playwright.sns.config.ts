import {defineConfig,chromium} from '@playwright/test';
export default defineConfig({testDir:'frontend/e2e',testMatch:'social-travel.spec.ts',workers:1,timeout:90000,use:{baseURL:'http://localhost:8086',viewport:{width:390,height:844},launchOptions:{executablePath:chromium.executablePath()}},reporter:'list'});
