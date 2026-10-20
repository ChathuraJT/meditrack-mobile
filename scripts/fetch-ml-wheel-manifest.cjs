// Official PyPI metadata only; used when long downloads reset on this connection.
const fs = require('node:fs');
const path = require('node:path');
const versions = {
  numpy: '2.2.6',
  'scikit-learn': '1.6.1',
  catboost: '1.2.8',
  xgboost: '3.0.2',
  scipy: '1.15.3',
  joblib: '1.5.1',
  threadpoolctl: '3.6.0',
  graphviz: '0.20.3',
  matplotlib: '3.10.3',
  pandas: '2.2.3',
  plotly: '6.1.2',
  six: '1.17.0',
  'python-dateutil': '2.9.0.post0',
  tzdata: '2025.2',
  pytz: '2025.2',
  contourpy: '1.3.2',
  cycler: '0.12.1',
  fonttools: '4.58.2',
  kiwisolver: '1.4.8',
  packaging: '25.0',
  pillow: '11.2.1',
  pyparsing: '3.2.3',
  narwhals: '1.42.1',
};
async function main() {
  const entries = Object.entries(versions);
  const wheels = [];
  for (let i = 0; i < entries.length; i += 4) {
    const batch = await Promise.all(
      entries.slice(i, i + 4).map(async ([name, version]) => {
        const response = await fetch(
          `https://pypi.org/pypi/${name}/${version}/json`,
          { signal: AbortSignal.timeout(60000) },
        );
        if (!response.ok) throw new Error(`${name}: ${response.status}`);
        const metadata = await response.json();
        const wheel = metadata.urls.find(
          (w) =>
            w.filename.endsWith('cp313-cp313-win_amd64.whl') ||
            w.filename.endsWith('py3-none-win_amd64.whl') ||
            w.filename.endsWith('py3-none-any.whl') ||
            w.filename.endsWith('py2.py3-none-any.whl'),
        );
        if (!wheel || new URL(wheel.url).hostname !== 'files.pythonhosted.org')
          throw new Error(`No official compatible wheel: ${name}`);
        return {
          name,
          version,
          filename: wheel.filename,
          url: wheel.url,
          size: wheel.size,
          sha256: wheel.digests.sha256,
        };
      }),
    );
    wheels.push(...batch);
    console.log(`Metadata: ${wheels.length}/${entries.length}`);
  }
  const root = path.resolve(__dirname, '../research/.wheel-cache');
  fs.mkdirSync(root, { recursive: true });
  fs.writeFileSync(
    path.join(root, 'manifest.json'),
    JSON.stringify(wheels, null, 2),
  );
  fs.writeFileSync(
    path.resolve(__dirname, '../research/model-comparison-requirements.txt'),
    '# Reproducible Python 3.13 benchmark environment (isolated from Expo).\n' +
      entries.map(([n, v]) => `${n}==${v}`).join('\n') +
      '\n',
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
