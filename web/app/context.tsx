import { createContext, useContext } from 'react';
import type { Parsed } from '../../src/domain/backup';
import type { Api } from './useWorkspace';
import type { AiApi } from './ai';

export type Page = 'focus' | 'lanes' | 'inbox' | 'review' | 'map' | 'decisions';
export type ModalState =
  | { kind: 'capture' } | { kind: 'settings' } | { kind: 'complete'; id: string; prompted: boolean } | { kind: 'swap'; toId: string } | { kind: 'priority' }
  | { kind: 'folder'; id: string | null } | { kind: 'folderDelete'; id: string } | { kind: 'outcomeNew'; folderId: string | null } | { kind: 'outcomeEdit'; id: string }
  | { kind: 'decisionForm'; id: string | null } | { kind: 'optionAdd'; decisionId: string } | { kind: 'optionEdit'; id: string } | { kind: 'resolve'; id: string }
  | { kind: 'placement'; id: string; folderId: string | null; mergeWith: string | null } | { kind: 'mergePreview'; id: string; otherId: string; folderId: string | null; type: 'Task' | 'Outcome' | 'Decision' | 'Idea' | 'Note' }
  | { kind: 'restore'; parsed: Parsed } | { kind: 'search' } | { kind: 'focusMode'; id: string } | { kind: 'taskEdit'; id: string } | { kind: 'relationship' } | { kind: 'captureEdit'; id: string } | { kind: 'taskNew'; outcomeId: string | null };
export interface AppCtx { api: Api; page: Page; go: (p: Page) => void; modal: (m: ModalState | null) => void; /* pushes a dialog; null closes the top one */ awaitingReview: number; where: string; folderSel: string; setFolderSel: (id: string) => void; decisionSel: string; setDecisionSel: (id: string) => void; ai: AiApi | null }
export const Ctx = createContext<AppCtx | null>(null);
export function useApp(): AppCtx { const c = useContext(Ctx); if (!c) throw new Error('useApp outside the app'); return c; }
