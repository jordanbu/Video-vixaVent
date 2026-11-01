// Ask the user before the built-in agent runs code on this machine.
//
// run_skill_script executes a whitelisted binary inside ~/.vixaventora/skills/<slug>/ and
// install_skill downloads a GitHub repo there. The agent can also write that directory's
// SKILL.md (manage_skill), so `bash SKILL.md` runs text the model wrote: no binary
// whitelist can contain that. One prompt injection was enough. The user now sees the exact
// skill and command and says yes or no to each call. External MCP agents keep their own
// one-shot approval card (external-bridge-runtime.ts) and never reach this prompt.
// See specs/08-confirmar-ejecucion-local.md.
import { t } from '../i18n/locale';

/** Tools that run code from a skill on this machine, or install code that will. */
export const LOCAL_EXECUTION_TOOLS: ReadonlySet<string> = new Set(['run_skill_script', 'install_skill']);

/** Model-facing result when the user says no. */
export const LOCAL_EXECUTION_DECLINED =
  'The user did not allow this to run on their machine. Do not retry it unless they ask; continue without it or explain what it would have done.';

export type LocalExecutionConfirmer = (message: string) => boolean | Promise<boolean>;

/** Native dialog, like the app's other destructive confirmations. No window → no. */
const browserConfirm: LocalExecutionConfirmer = (message) =>
  typeof window !== 'undefined' && typeof window.confirm === 'function' ? window.confirm(message) : false;

let confirmer: LocalExecutionConfirmer = browserConfirm;

/** Verification seam. Returns the previous confirmer so a check can restore it. */
export function setLocalExecutionConfirmer(next: LocalExecutionConfirmer): LocalExecutionConfirmer {
  const previous = confirmer;
  confirmer = next;
  return previous;
}

const MAX_SHOWN_CHARS = 600;
const shown = (value: unknown): string => {
  const text = typeof value === 'string' ? value.trim() : '';
  return text.length > MAX_SHOWN_CHARS ? `${text.slice(0, MAX_SHOWN_CHARS)}…` : text;
};

/** The question shown to the user, or null when the tool runs nothing locally. */
export function localExecutionPrompt(name: string, args: Readonly<Record<string, unknown>>): string | null {
  if (name === 'run_skill_script') {
    return t('智能体想在这台电脑上运行技能「{skill}」的命令：\n\n{command}\n\n只有信任这个技能时才允许。要允许吗？', {
      skill: shown(args.skill),
      command: shown(args.command),
    });
  }
  if (name === 'install_skill') {
    return t('智能体想从 GitHub 安装技能：{repo}\n\n安装后，它的脚本可以在这台电脑上运行。只有信任来源时才允许。要允许吗？', {
      repo: shown(args.repo),
    });
  }
  return null;
}

/** True when the tool may run: it runs nothing locally, or the user said yes. */
export async function confirmLocalExecution(name: string, args: Readonly<Record<string, unknown>>): Promise<boolean> {
  const message = localExecutionPrompt(name, args);
  if (message === null) return true;
  try {
    return (await confirmer(message)) === true;
  } catch {
    return false;
  }
}
