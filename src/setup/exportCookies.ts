import * as fs from 'fs';
import * as path from 'path';

const SUPPORTED = ['wellfound', 'cutshort', 'linkedin'];

const platform = process.argv[2];
if (!platform || !SUPPORTED.includes(platform)) {
  console.error(`Usage: npx ts-node src/setup/exportCookies.ts <platform>`);
  console.error(`Supported: ${SUPPORTED.join(', ')}`);
  process.exit(1);
}

const cookiePath = path.join(process.cwd(), 'cookies', `${platform}.json`);
if (!fs.existsSync(cookiePath)) {
  console.error(`Cookie file not found: ${cookiePath}`);
  console.error(`Run first: npx ts-node src/setup/saveCookies.ts ${platform}`);
  process.exit(1);
}

const raw = fs.readFileSync(cookiePath, 'utf-8');
const b64 = Buffer.from(raw).toString('base64');
const envKey = `${platform.toUpperCase()}_COOKIES_B64`;

console.log(`\nCopy this into Vercel → Settings → Environment Variables:\n`);
console.log(`Key:   ${envKey}`);
console.log(`Value: ${b64}\n`);
