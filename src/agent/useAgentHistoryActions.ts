import { useCallback, useRef } from 'react';
import { t } from '../i18n/locale';
import { flushChatWrites } from '../persist/projectStore';
import { clearAgentSessionContext } from '../persist/agentRuntimeStore';
import { loadProposalRecord } from '../persist/proposalStore';
import { initialAgentMessages } from './agent-session';
import { planRetryRewind } from './retry-rewind';
import { PROVIDER } from './providerConfig';
import { canRollbackAgentChange, rollbackAgentChange } from './changeLog';
import type { AgentHookState } from './useAgentState';
import { clearStoredServerRun } from './serverRunSessionStorage';

type ClearBlockedError = Error & {
  code?: string;
  run?: { runId?: string; status?: string };
};

export async function clearAgentHistory(state: AgentHookState, projectId: string): Promise<void> {
  if (state.runningRef.current) {
    // Do not fail silently: the user clicked clear and nothing happened.
    state.setMessages((current) => [...current, {
      role: 'error',
      text: t('The Agent is still running and the chat cannot be cleared. Wait for the run to finish or stop it first, then try again.'),
    }]);
    return;
  }
  const hydrationEpoch = ++state.hydrationEpochRef.current;
  state.hydratedRef.current = false;
  state.setHydrated(false);
  try {
    await flushChatWrites(projectId);
    const durable = await loadProposalRecord(projectId);
    const durableRunId = durable?.phase !== 'settled'
      ? durable?.proposal.agentRunId
      : undefined;
    await clearAgentSessionContext(
      projectId,
      durableRunId ? new Set([durableRunId]) : new Set(),
    );
    clearStoredServerRun(projectId);
  } catch (error) {
    if (state.hydrationEpochRef.current !== hydrationEpoch) return;
    state.hydratedRef.current = true;
    state.setHydrated(true);
    const blocked = error as ClearBlockedError;
    const runId = blocked.run?.runId;
    const status = blocked.run?.status;
    const detail = blocked.code === 'agent_session_clear_blocked' && runId
      ? t('Run {runId} ({status}) is still active. Stop it, confirm the inspector has no active tasks, then retry.', {
        runId,
        status: status ?? 'unknown',
      })
      : t('Confirm no other Agent is running, then retry.');
    state.setMessages((current) => [...current, {
      role: 'error',
      text: `${t('Unable to clear context and run history.')}\n${detail}`,
    }]);
    return;
  }
  state.llmRef.current = initialAgentMessages();
  state.llmProviderRef.current = PROVIDER;
  state.setProposalStale(false);
  state.setChangeLog([]);
  state.setMessages([]);
  state.replaceContextUsage(null);
  state.hydratedRef.current = true;
  state.setHydrated(true);
}

/**
 * Rewind both histories to just before the user turn at `index` so it can be sent again
 * from a clean state. Nothing else moves: timeline edits stay (the change log rolls them
 * back), and a pending proposal blocks the rewind instead of being orphaned. False means
 * the histories are untouched, and the caller's plain re-send is still correct.
 */
export function rewindAgentHistory(state: AgentHookState, index: number): boolean {
  if (state.runningRef.current || state.proposalRef.current) return false;
  const plan = planRetryRewind(state.messages, state.llmRef.current, index);
  if (!plan) return false;
  state.llmRef.current = state.llmRef.current.slice(0, plan.llm);
  state.setMessages((current) => current.slice(0, plan.messages));
  state.refreshEstimatedContextUsage();
  return true;
}

function rollbackSession(state: AgentHookState, id: string, force: boolean): boolean {
  const session = state.changeLogRef.current.find((item) => item.id === id);
  if (!session) return false;
  const previous = rollbackAgentChange(session, state.ctxRef.current.getDoc(), force);
  if (!previous) return false;
  state.ctxRef.current.commands.applyDoc(previous);
  return true;
}

function canRollbackSession(state: AgentHookState, id: string): boolean {
  const session = state.changeLogRef.current.find((item) => item.id === id);
  return !!session && canRollbackAgentChange(session, state.ctxRef.current.getDoc());
}

export function useAgentHistoryActions(state: AgentHookState, projectId: string) {
  const stateRef = useRef(state);
  stateRef.current = state;
  const clearHistory = useCallback(
    () => { void clearAgentHistory(stateRef.current, projectId); },
    [projectId],
  );
  const rollbackChangeSession = useCallback(
    (id: string, force = false) => rollbackSession(stateRef.current, id, force),
    [],
  );
  const canRollbackChangeSession = useCallback(
    (id: string) => canRollbackSession(stateRef.current, id),
    [],
  );
  const rewindTurn = useCallback(
    (index: number) => rewindAgentHistory(stateRef.current, index),
    [],
  );
  return { clearHistory, rollbackChangeSession, canRollbackChangeSession, rewindTurn };
}
