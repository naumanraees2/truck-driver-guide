#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const currentMajor = parseInt(process.versions.node.split('.')[0], 10);
const [targetBin, ...args] = process.argv.slice(2);

if (!targetBin) {
  console.error('Usage: node-runner <bin-name> [args...]');
  process.exit(1);
}

let nodeExecutable = process.execPath;

if (currentMajor < 20) {
  // Search for installed Node >= 20 in nvm directory
  const home = os.homedir();
  const nvmVersionsDir = path.join(home, '.nvm', 'versions', 'node');
  let foundHigherNode = null;

  if (fs.existsSync(nvmVersionsDir)) {
    try {
      const candidates = fs.readdirSync(nvmVersionsDir)
        .filter((dir) => dir.startsWith('v'))
        .map((dir) => {
          const match = dir.match(/^v(\d+)/);
          return { dir, major: match ? parseInt(match[1], 10) : 0 };
        })
        .filter((item) => item.major >= 20)
        .sort((a, b) => b.major - a.major);

      if (candidates.length > 0) {
        const binPath = path.join(nvmVersionsDir, candidates[0].dir, 'bin', 'node');
        if (fs.existsSync(binPath)) {
          foundHigherNode = binPath;
        }
      }
    } catch (_) {}
  }

  if (foundHigherNode) {
    nodeExecutable = foundHigherNode;
  } else {
    console.warn(
      `[Warning] Active Node version (${process.version}) is below the required >= 20.0.0.\n` +
      `Please run: nvm use 20\n`
    );
  }
}

// Find binary in node_modules/.bin
const projectRoot = path.resolve(__dirname, '..');
const localBinPath = path.join(projectRoot, 'node_modules', '.bin', targetBin);
const targetJs = path.join(projectRoot, 'node_modules', targetBin, 'bin', `${targetBin}.js`);

let execCommand;
let execArgs;

if (fs.existsSync(localBinPath)) {
  execCommand = nodeExecutable;
  execArgs = [localBinPath, ...args];
} else if (fs.existsSync(targetJs)) {
  execCommand = nodeExecutable;
  execArgs = [targetJs, ...args];
} else {
  execCommand = targetBin;
  execArgs = args;
}

const child = spawn(execCommand, execArgs, {
  stdio: 'inherit',
  cwd: projectRoot,
  env: {
    ...process.env,
    PATH: `${path.dirname(nodeExecutable)}:${process.env.PATH}`,
  },
});

child.on('error', (err) => {
  console.error(`Failed to start ${targetBin}:`, err.message);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exit(code ?? 0);
  }
});

