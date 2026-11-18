import { createHash } from 'node:crypto'
import { spawn, spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backendDir = path.join(projectRoot, 'backend')
const venvDir = path.join(backendDir, '.venv')
const venvPython = path.join(venvDir, 'bin', 'python')
const requirements = path.join(backendDir, 'requirements-dev.txt')
const requirementsStamp = path.join(venvDir, '.dropguard-requirements-sha256')
let serverProcess
let receivedSignal = false

function fail(message, exitCode = 1) {
  console.error(`[backend] ERROR: ${message}`)
  process.exit(exitCode)
}

function findPython312() {
  const candidates = [
    'python3.12',
    '/opt/homebrew/bin/python3.12',
    '/usr/local/bin/python3.12',
    '/Library/Frameworks/Python.framework/Versions/3.12/bin/python3.12',
  ]
  for (const candidate of candidates) {
    const result = spawnSync(candidate, ['-c', 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    if (result.status === 0 && result.stdout.trim() === '3.12') return candidate
  }
  return null
}

function runSetup(command, args, message) {
  console.log(`[backend] ${message}`)
  const result = spawnSync(command, args, { cwd: projectRoot, stdio: 'inherit' })
  if (result.error) fail(`${message}: ${result.error.message}`)
  if (result.status !== 0) {
    const outcome = result.signal
      ? `was interrupted by ${result.signal}`
      : `failed with exit code ${result.status ?? 'unknown'}`
    fail(`${message} ${outcome}`)
  }
}

function prepareEnvironment() {
  if (!existsSync(venvPython)) {
    const python = findPython312()
    if (!python) {
      fail(
        'Python 3.12 is required for the supplied Scikit-learn 1.6.1 model. Install Python 3.12, then rerun npm run dev.',
      )
    }
    runSetup(python, ['-m', 'venv', venvDir], 'Creating backend/.venv with Python 3.12…')
  }

  const version = spawnSync(venvPython, ['-c', 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")'], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  if (version.status !== 0 || version.stdout.trim() !== '3.12') {
    const detail = (version.stderr || version.stdout || '').trim()
    fail(
      `backend/.venv must use Python 3.12 for Scikit-learn 1.6.1.${detail ? ` ${detail}` : ''} Remove backend/.venv to recreate it.`,
    )
  }

  const requirementsHash = createHash('sha256')
    .update(readFileSync(requirements))
    .update(readFileSync(path.join(backendDir, 'requirements.txt')))
    .digest('hex')
  const installedHash = existsSync(requirementsStamp)
    ? readFileSync(requirementsStamp, 'utf8').trim()
    : ''
  if (requirementsHash !== installedHash) {
    runSetup(
      venvPython,
      ['-m', 'pip', 'install', '-r', requirements],
      'Installing or updating backend requirements…',
    )
    writeFileSync(requirementsStamp, `${requirementsHash}${os.EOL}`)
  } else {
    console.log('[backend] Python environment is ready; requirements are unchanged.')
  }
}

function startServer() {
  console.log('[backend] Starting FastAPI at http://127.0.0.1:8000')
  serverProcess = spawn(
    venvPython,
    ['-m', 'uvicorn', 'app.main:app', '--reload', '--host', '127.0.0.1', '--port', '8000'],
    { cwd: backendDir, stdio: ['inherit', 'pipe', 'pipe'] },
  )
  serverProcess.stdout.pipe(process.stdout)
  serverProcess.stderr.pipe(process.stderr)
  serverProcess.on('error', (error) => fail(`Unable to start Uvicorn: ${error.message}`))
  serverProcess.on('close', (code, signal) => {
    if (receivedSignal) {
      process.exitCode = 0
      return
    }
    if (signal) fail(`Uvicorn stopped unexpectedly from signal ${signal}`)
    if (code !== 0) fail(`Uvicorn stopped unexpectedly with exit code ${code}`)
    console.error('[backend] Uvicorn exited; stopping the other development process.')
    process.exitCode = 1
  })
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    receivedSignal = true
    if (serverProcess && !serverProcess.killed) serverProcess.kill(signal)
    else process.exit(0)
  })
}

try {
  prepareEnvironment()
  startServer()
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
}
