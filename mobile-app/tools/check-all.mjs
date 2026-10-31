// The save gate (2026-10-23). Runs every check and stops at the first one that fails,
// with a non-zero exit, so `npm run check:all && git commit ...` can never save a failing
// state. (Before this, the gate piped the screen checks through `tee`, which hid their
// failure from the shell; it was caught before anything failing was saved.)
import { spawnSync } from 'node:child_process';

const steps = [
  ['TypeScript', 'npx', ['tsc', '--noEmit']],
  ['Logic checks', 'npm', ['test', '--silent']],
  ['Screen checks', 'npx', ['jest', '--silent']],
  ['Hook order', 'npm', ['run', 'test:hooks', '--silent']],
];

for (const [name, cmd, args] of steps) {
  // Windows (2026-10-31): npx/npm are .cmd files there and only start through the shell;
  // without it nothing ran and every step "failed".
  const r = spawnSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', shell: process.platform === 'win32' });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}${r.error ? `\n${r.error}` : ''}`;
  if (r.status !== 0) {
    console.log(out.split('\n').slice(-60).join('\n'));
    console.log(`\nFAILED: ${name}`);
    process.exit(1);
  }
  const summary = out.match(/^# pass \d+|^# fail \d+|^Tests:.*$/gm);
  console.log(`ok   ${name}${summary ? '  (' + summary.join(', ') + ')' : ''}`);
}
console.log('ALL CHECKS PASSED');
