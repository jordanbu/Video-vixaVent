// Ask the user before the built-in agent runs code on this machine.
//
// run_skill_script executes a whitelisted binary inside ~/.vixaventora/skills/<slug>/ and
// install_skill downloads a GitHub repo there. The agent can also write that directory's
// SKILL.md (manage_skill), so `bash SKILL.md` runs text the model wrote: no binary
// whitelist can contain that. One prompt injection was enough. The user now sees the exact
// skill and command and decides each call — or allows one skill for the rest of the
// session. The editor shows a card (local-execution-prompts.ts + LocalExecutionPrompt.tsx);
// without one mounted, a native confirm asks instead. External MCP agents keep their own
// one-shot approval card (external-bridge-runtime.ts) and never reach this prompt.
// See specs/08-confirmar-ejecucion-local.md.
import { t } from '../i18n/locale';

/** Tools that run code from a skill on this machine, or install code that will. */
export const LOCAL_EXECUTION_TOOLS: ReadonlySet<string> = new Set(['run_skill_script', 'install_skill']);

/** Model-facing result when the user says no. */
export const LOCAL_EXECUTION_DECLINED =
  'The user did not allow this to run on their machine. Do not retry it unless they ask; continue without it or explain what it would have done.';

export type LocalExecutionTool = 'run_skill_script' | 'install_skill';

/** What the user is asked about. `message` is the full question, for a plain dialog. */
export interface LocalExecutionRequest {
  readonly id: string;
  readonly tool: LocalExecutionTool;
  /** run_skill_script: the skill slug and the command line. */
  readonly skill?: string;
  readonly command?: string;
  /** install_skill: the GitHub repo. */
  readonly repo?: string;
  readonly message: string;
}

/** `allow-skill-session`: this call and every later script of the same skill until reload. */
export type LocalExecutionDecision = 'allow' | 'allow-skill-session' | 'deny';

/** Booleans are accepted for plain dialogs and verification seams (true = allow once). */
export type LocalExecutionConfirmer = (
  request: LocalExecutionRequest,
  signal?: AbortSignal,
) => LocalExecutionDecision | boolean | Promise<LocalExecutionDecision | boolean>;

/** Native dialog, like the app's other destructive confirmations. No window → no. */
export const browserLocalExecutionConfirmer: LocalExecutionConfirmer = (request) =>
  typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(request.message) : false;

let confirmer: LocalExecutionConfirmer = browserLocalExecutionConfirmer;

/** Skills the user allowed for this session. In memory only: a reload asks again. */
const allowedSkills = new Set<string>();

/** Verification and UI seam. Returns the previous confirmer so the caller can restore it. */
export function setLocalExecutionConfirmer(next: LocalExecutionConfirmer): LocalExecutionConfirmer {
  const previous = confirmer;
  confirmer = next;
  return previous;
}

/** Forget every "allow for this session" (verification seam; a reload does the same). */
export function resetLocalExecutionSession(): void {
  allowedSkills.clear();
}

const MAX_SHOWN_CHARS = 600;
const shown = (value: unknown): string => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > MAX_SHOWN_CHARS ? `${text.slice(0, MAX_SHOWN_CHARS)}…` : text;
};

let nextId = 0;

/** The question for a tool call, or null when the tool runs nothing locally. */
export function localExecutionRequest(name: string, args: Readonly<Record<string, unknown>>): LocalExecutionRequest | null {
  nextId += 1;
  const id = `local-exec-${nextId}`;
  if (name === 'run_skill_script') {
    const skill = shown(args.skill);
    const command = shown(args.command);
    return {
      id, tool: name, skill, command,
      message: t('智能体想在这台电脑上运行技能「{skill}」的命令：\n\n{command}\n\n只有信任这个技能时才允许。要允许吗？', { skill, command }),
    };
  }
  if (name === 'install_skill') {
    const repo = shown(args.repo);
    return {
      id, tool: name, repo,
      message: t('智能体想从 GitHub 安装技能：{repo}\n\n安装后，它的脚本可以在这台电脑上运行。只有信任来源时才允许。要允许吗？', { repo }),
    };
  }
  return null;
}

/** The plain-dialog question (kept for callers that only need the text). */
export function localExecutionPrompt(name: string, args: Readonly<Record<string, unknown>>): string | null {
  return localExecutionRequest(name, args)?.message ?? null;
}

const normalize = (answer: unknown): LocalExecutionDecision =>
  answer === true || answer === 'allow' ? 'allow' : answer === 'allow-skill-session' ? 'allow-skill-session' : 'deny';

/** True when the tool may run: it runs nothing locally, the skill is allowed for the session, or the user said yes. */
export async function confirmLocalExecution(
  name: string,
  args: Readonly<Record<string, unknown>>,
  signal?: AbortSignal,
): Promise<boolean> {
  const request = localExecutionRequest(name, args);
  if (request === null) return true;
  if (request.tool === 'run_skill_script' && request.skill && allowedSkills.has(request.skill)) return true;
  if (signal?.aborted) return false;
  let decision: LocalExecutionDecision;
  try {
    decision = normalize(await confirmer(request, signal));
  } catch {
    return false;
  }
  if (signal?.aborted) return false;
  // "This session" only widens a script grant: an install is a one-off by nature.
  if (decision === 'allow-skill-session' && request.tool === 'run_skill_script' && request.skill) {
    allowedSkills.add(request.skill);
  }
  return decision !== 'deny';
}
