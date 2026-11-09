import { createContext, useContext } from 'react';
import type { Parsed } from '../../src/domain/backup';
import type { Api } from './useWorkspace';
import type { AiApi } from './ai';
import type { AssistClient, useAssist } from './useAssist';
import type { Adapter } from './assistantApi';
import type { AssistEngine } from './assistEngine';
import type { Scope } from '../../src/domain/scope';
import type { PriorityMode } from '../../src/domain/mission';
import type { Approval as C_Approval } from '../../src/domain/commands';

export type Page = 'focus' | 'approvals' | 'priorities' | 'tasks' | 'group' | 'lanes' | 'inbox' | 'review' | 'map' | 'decisions';   // internal ids; the screens are called Status, Executables and AI Assistant
export type ModalState =
  | { kind: 'capture' } | { kind: 'folders' } | { kind: 'settings' } | { kind: 'complete'; id: string; prompted: boolean } | { kind: 'swap'; toId: string } | { kind: 'priority' }
  | { kind: 'folder'; id: string | null } | { kind: 'folderDelete'; id: string } | { kind: 'outcomeNew'; folderId: string | null } | { kind: 'outcomeEdit'; id: string }
  | { kind: 'decisionForm'; id: string | null } | { kind: 'optionAdd'; decisionId: string } | { kind: 'optionEdit'; id: string } | { kind: 'resolve'; id: string }
  | { kind: 'placement'; id: string; folderId: string | null; mergeWith: string | null } | { kind: 'mergePreview'; id: string; otherId: string; folderId: string | null; type: 'Task' | 'Outcome' | 'Decision' | 'Idea' | 'Note' }
  | { kind: 'restore'; parsed: Parsed } | { kind: 'steps'; outcomeId: string } | { kind: 'idea'; id: string | null; folderId: string | null } | { kind: 'promote'; id: string } | { kind: 'weekly' } | { kind: 'history' } | { kind: 'approveSelected'; items: (C_Approval & { id: string })[] } | { kind: 'split'; id: string; folderId: string | null } | { kind: 'search' } | { kind: 'focusMode'; id: string } | { kind: 'taskEdit'; id: string } | { kind: 'relationship' } | { kind: 'captureEdit'; id: string } | { kind: 'taskNew'; outcomeId: string | null };
export interface AppCtx { api: Api; page: Page; go: (p: Page) => void; modal: (m: ModalState | null) => void; /* pushes a dialog; null closes the top one */ awaitingReview: number; where: string; folderSel: string; setFolderSel: (id: string) => void; decisionSel: string; setDecisionSel: (id: string) => void; ai: AiApi | null; assist: AssistClient | null; help: AssistEngine; helpVersion: number; assistState: ReturnType<typeof useAssist>; assistantDemo: boolean; assistantAdapter: Adapter | null; openEntry: (id: string | null) => void; scope: Scope; setScope: (s: Scope) => void; priorityMode: PriorityMode; setPriorityMode: (m: PriorityMode) => void; signOut: (() => void) | null }
export const Ctx = createContext<AppCtx | null>(null);
export function useApp(): AppCtx { const c = useContext(Ctx); if (!c) throw new Error('useApp outside the app'); return c; }
