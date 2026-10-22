const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { pathToFileURL } = require('node:url');

const root = path.resolve(__dirname, '../research/reports');
const name = 'MediTrack-Matara-Model-Comparison-Sinhala';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'meditrack-pdf-'));
const pdf = path.join(root, `${name}.pdf`);
const browser = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const result = spawnSync(
  browser,
  [
    '--headless',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--no-first-run',
    `--user-data-dir=${profile}`,
    '--no-pdf-header-footer',
    `--print-to-pdf=${pdf}`,
    '--virtual-time-budget=3000',
    pathToFileURL(path.join(root, `${name}.html`)).href,
  ],
  { windowsHide: true, timeout: 90000, encoding: 'utf8' },
);
if (result.error || result.status !== 0 || !fs.existsSync(pdf)) {
  console.error(
    result.error?.message ||
      result.stderr?.slice(-1500) ||
      'PDF rendering failed',
  );
  process.exitCode = 1;
} else {
  console.log(`Created ${pdf} (${fs.statSync(pdf).size} bytes)`);
}
