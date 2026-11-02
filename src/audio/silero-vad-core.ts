// Pure Silero VAD logic: resampling and probability → speech spans. Kept apart from
// silero-vad.ts, whose `?url` imports of the onnxruntime-web runtime only resolve
// through Vite, so these stay testable in plain Node (silero-vad.verify.ts).
import type { VadTimeSpan } from '../persist/vadEvidenceStore';

export const VAD_SAMPLE_RATE = 16_000;
export const WINDOW_SIZE = 512; // 32ms @16kHz — Silero VAD's native window
const MERGE_GAP_WINDOWS = 2;

/** Linear-decimate any sample rate down to 16 kHz mono (VAD quality is
 * insensitive to the resampling method). Pure and exported for verifies. */
export function resampleMonoTo16k(samples: Float32Array, sampleRate: number): Float32Array {
  if (sampleRate === VAD_SAMPLE_RATE) return samples;
  if (sampleRate < VAD_SAMPLE_RATE) throw new Error(`unsupported sample rate ${sampleRate}`);
  const ratio = sampleRate / VAD_SAMPLE_RATE;
  const length = Math.floor(samples.length / ratio);
  const out = new Float32Array(length);
  for (let i = 0; i < length; i += 1) {
    const position = i * ratio;
    const base = Math.floor(position);
    const fraction = position - base;
    const next = Math.min(base + 1, samples.length - 1);
    out[i] = samples[base] + (samples[next] - samples[base]) * fraction;
  }
  return out;
}

/** Merge per-window speech probabilities into spans. Pure and exported for
 * verifies: gap tolerance and per-span confidence live entirely here. */
export function vadSpansFromProbabilities(
  probabilities: Float32Array,
  threshold: number,
  options: { windowMs?: number; mergeGapWindows?: number } = {},
): { spans: VadTimeSpan[]; confidence: number } {
  const windowMs = options.windowMs ?? (WINDOW_SIZE / VAD_SAMPLE_RATE) * 1000;
  const gap = Math.max(0, options.mergeGapWindows ?? MERGE_GAP_WINDOWS);
  const spans: VadTimeSpan[] = [];
  let start = -1;
  let lastSpeech = -1;
  let spanConfidenceSum = 0;
  let spanConfidenceCount = 0;
  let totalConfidenceSum = 0;
  let totalConfidenceCount = 0;
  const closeSpan = (endWindow: number): void => {
    if (start < 0) return;
    spans.push({
      startMs: Math.round(start * windowMs),
      endMs: Math.round((endWindow + 1) * windowMs),
      confidence: Math.round((spanConfidenceSum / spanConfidenceCount) * 1000) / 1000,
    });
    start = -1;
    spanConfidenceSum = 0;
    spanConfidenceCount = 0;
  };
  for (let i = 0; i < probabilities.length; i += 1) {
    if (probabilities[i] >= threshold) {
      if (start < 0) start = i;
      else if (i - lastSpeech > gap + 1) {
        closeSpan(lastSpeech);
        start = i;
      }
      lastSpeech = i;
      spanConfidenceSum += probabilities[i];
      spanConfidenceCount += 1;
      totalConfidenceSum += probabilities[i];
      totalConfidenceCount += 1;
    } else if (start >= 0 && i - lastSpeech > gap) {
      closeSpan(lastSpeech);
    }
  }
  closeSpan(probabilities.length - 1);
  const confidence = totalConfidenceCount > 0 ? totalConfidenceSum / totalConfidenceCount : 0;
  return { spans, confidence };
}
