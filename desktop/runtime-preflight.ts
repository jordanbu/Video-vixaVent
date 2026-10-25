// Startup preflight for packaged installs.
//
// Every asset checked here is read during boot, before the first window exists:
// the embedded server serves resources/dist, ensureWritableBundle copies
// resources/remotion-bundle into userData, and on Windows ensureRemotionBinaries
// mirrors the static ffmpeg.exe into the compositor's hardware mirror
// (desktop/remotion-binaries.ts). If any of them is gone, boot() rejects
// and main.ts exits — a packaged double-click has no console, so the user sees
// nothing happen at all. That is issue #140: three separate ENOENT/ERR_MODULE
// failures, zero windows, zero dialogs.
//
// An install can lose files without any packaging bug: antivirus quarantines the
// bundled FFmpeg (the app is already reported as a false positive, issue #144),
// or a 650 MB NSIS extraction is interrupted. So name the missing files instead
// of dying silently, and keep the checks pure so they can be verified in Node.
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export interface RuntimeAssetCheck {
  /** Human-readable subject of the check, used in the failure dialog. */
  readonly label: string;
  readonly path: string;
  /** Required assets stop the launch; optional ones only degrade a feature. */
  readonly required: boolean;
}

export interface PackagedAssetInput {
  readonly resourcesPath: string;
  readonly platform: NodeJS.Platform;
  /** Resolved ffmpeg binary (server/media-binaries.ts ffmpegBin()). */
  readonly ffmpegPath: string;
}

export function packagedRuntimeAssetChecks(input: PackagedAssetInput): RuntimeAssetCheck[] {
  const checks: RuntimeAssetCheck[] = [
    { label: 'interfaz del editor', path: join(input.resourcesPath, 'dist', 'index.html'), required: true },
    {
      label: 'paquete de render de Remotion',
      path: join(input.resourcesPath, 'remotion-bundle', 'index.html'),
      required: true,
    },
    {
      label: 'navegador de render sin interfaz',
      path: join(input.resourcesPath, 'chrome-headless-shell'),
      required: false,
    },
  ];
  // Only Windows swaps the compositor's ffmpeg for the static build at first
  // launch, so only there does a quarantined ffmpeg.exe block startup.
  if (input.platform === 'win32') {
    checks.push({ label: 'FFmpeg incluido', path: input.ffmpegPath, required: true });
  }
  return checks;
}

export function missingRuntimeAssets(
  checks: readonly RuntimeAssetCheck[],
  exists: (path: string) => boolean = existsSync,
): RuntimeAssetCheck[] {
  return checks.filter((check) => !exists(check.path));
}

/** Shared by the asset preflight and the entry bundle's load failure. */
export const RUNTIME_ASSET_ADVICE = [
  'Lo más común es que un antivirus haya puesto en cuarentena parte de la instalación,',
  'o que el instalador no haya terminado. Reinstala Vixaventora y, si los archivos',
  'vuelven a desaparecer, agrega la carpeta de instalación a las exclusiones del antivirus.',
].join('\n');

export function describeMissingRuntimeAssets(missing: readonly RuntimeAssetCheck[]): string {
  const lines = missing.map((check) => `- ${check.label}${check.required ? '' : ' (opcional)'}\n  ${check.path}`);
  return [
    `A la instalación le faltan ${missing.length} archivo(s) necesarios:`,
    '',
    ...lines,
    '',
    RUNTIME_ASSET_ADVICE,
  ].join('\n');
}

/** The blocking failure text, or null when nothing required is missing. */
export function runtimeAssetFailure(missing: readonly RuntimeAssetCheck[]): string | null {
  return missing.some((check) => check.required) ? describeMissingRuntimeAssets(missing) : null;
}
