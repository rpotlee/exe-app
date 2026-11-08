import { createContext, useContext } from 'react';
import type { Api } from './useWorkspace';

export type Page = 'focus' | 'lanes' | 'inbox' | 'review' | 'map' | 'decisions';
export type ModalState =
  | { kind: 'capture' } | { kind: 'settings' } | { kind: 'complete'; id: string; prompted: boolean } | { kind: 'swap'; toId: string } | { kind: 'priority' }
  | { kind: 'folder'; id: string | null } | { kind: 'folderDelete'; id: string } | { kind: 'outcomeNew'; folderId: string | null } | { kind: 'outcomeEdit'; id: string }
  | { kind: 'focusMode'; id: string } | { kind: 'taskEdit'; id: string } | { kind: 'relationship' } | { kind: 'captureEdit'; id: string } | { kind: 'taskNew'; outcomeId: string | null };
export interface AppCtx { api: Api; page: Page; go: (p: Page) => void; modal: (m: ModalState | null) => void; /* pushes a dialog; null closes the top one */ awaitingReview: number; where: string; folderSel: string; setFolderSel: (id: string) => void }
export const Ctx = createContext<AppCtx | null>(null);
export function useApp(): AppCtx { const c = useContext(Ctx); if (!c) throw new Error('useApp outside the app'); return c; }
