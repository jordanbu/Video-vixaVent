// Silero VAD runner for the local silence-removal feature. The tiny ONNX
// model (onnx-community/silero-vad, MIT, bundled under public/models) runs
// through onnxruntime-web; the session loads lazily on first use so the
// chunk never enters the initial bundle. Absence or failure degrades the
import * as ort from 'onnxruntime-web/wasm';
// The loader and the wasm binary of the INSTALLED onnxruntime-web, so the JS API and the
// binary are always the same version, and the build ships one copy of the wasm (the
// asset ORT itself references). A hand-copied pair in public/models used to drift from
// the package (11 MB of a different build, plus the 14 MB one Vite emitted anyway).
// Same pattern as beatThis.worker.ts.
import ortLoaderUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.mjs?url';
import ortWasmUrl from '../../node_modules/onnxruntime-web/dist/ort-wasm-simd-threaded.wasm?url';
import { registerVadRunner, type VadRunResult } from './vad';
import { VAD_SAMPLE_RATE, WINDOW_SIZE, resampleMonoTo16k, vadSpansFromProbabilities } from './silero-vad-core';
const MODEL_URL = '/models/silero-vad/silero_vad.onnx';

let sessionPromise: Promise<ort.InferenceSession> | null = null;
let installed = false;

function loadSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    sessionPromise = (async () => {
      // Explicit non-jsep loader pair (the lighter wasm build).
      ort.env.wasm.numThreads = 1;
      ort.env.wasm.wasmPaths = { mjs: ortLoaderUrl, wasm: ortWasmUrl };
      return ort.InferenceSession.create(MODEL_URL, { executionProviders: ['wasm'] });
    })().catch((error) => {
      sessionPromise = null;
      throw error;
    });
  }
  return sessionPromise;
}

async function runSileroVad(
  samples: Float32Array,
  sampleRate: number,
  threshold: number,
  signal?: AbortSignal,
): Promise<VadRunResult> {
  const session = await loadSession();
  const mono = resampleMonoTo16k(samples, sampleRate);
  const windowCount = Math.floor(mono.length / WINDOW_SIZE);
  if (windowCount === 0) return { speechSpans: [], confidence: 0 };
  const probabilities = new Float32Array(windowCount);
  let state: ort.Tensor = new ort.Tensor('float32', new Float32Array(2 * 128), [2, 1, 128]);
  const sampleRateTensor = new ort.Tensor(
    'int64', BigInt64Array.from([BigInt(VAD_SAMPLE_RATE)]), [],
  );
  for (let window = 0; window < windowCount; window += 1) {
    if (signal?.aborted) throw new Error('VAD cancelled');
    const offset = window * WINDOW_SIZE;
    const input = new ort.Tensor(
      'float32', mono.slice(offset, offset + WINDOW_SIZE), [1, WINDOW_SIZE],
    );
    const output = await session.run({ input, state, sr: sampleRateTensor });
    const probability = (output.output.data as Float32Array)[0];
    probabilities[window] = Math.min(1, Math.max(0, probability));
    state = output.stateN;
  }
  const { spans, confidence } = vadSpansFromProbabilities(probabilities, threshold);
  return { speechSpans: spans, confidence };
}

/** Idempotent registration; model loads on the first actual VAD run. */
export function installSileroVad(): void {
  if (installed) return;
  installed = true;
  registerVadRunner(runSileroVad);
}

export async function ensureSileroVad(): Promise<void> {
  installSileroVad();
  await loadSession().catch(() => undefined);
}
