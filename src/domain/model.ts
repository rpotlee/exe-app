// The domain model is the database row types (generated from the schema), so code and schema cannot disagree.
import type { Tables } from '../db/types';

export type Outcome = Tables<'outcomes'>;
export type Task = Tables<'tasks'>;
export type Decision = Tables<'decisions'>;
export type Relationship = Tables<'relationships'>;
export type FocusAssignment = Tables<'focus_assignments'>;
export type Capture = Tables<'captures'>;
export type Folder = Tables<'folders'>;

export type Lane = 'now' | 'next' | 'later' | 'done';
export type RelationshipKind = 'blocks' | 'informs' | 'related';
export type EntityType = 'outcome' | 'task' | 'decision';

export type DecisionOption = Tables<'decision_options'>;
export type DecisionLogEntry = Tables<'decision_log'>;
export type Idea = Tables<'ideas'>;
export type UserSettings = Tables<'user_settings'>;
export type AuditEvent = Tables<'audit_events'>;

/** Everything the pure functions need. Nothing here reads storage; the data layer builds it. */
export interface Workspace {
  folders: Folder[];
  outcomes: Outcome[];
  focus: FocusAssignment[];
  tasks: Task[];
  captures: Capture[];
  decisions: Decision[];
  decisionOptions: DecisionOption[];
  decisionLog: DecisionLogEntry[];
  ideas: Idea[];
  relationships: Relationship[];
  settings: UserSettings | null;
}

export const MAX_NOW = 3;
export const currentFocusId = (ws: Workspace): string | null => ws.settings?.current_focus_outcome_id ?? null;
export const emptyWorkspace = (): Workspace => ({ folders: [], outcomes: [], focus: [], tasks: [], captures: [], decisions: [], decisionOptions: [], decisionLog: [], ideas: [], relationships: [], settings: null });
