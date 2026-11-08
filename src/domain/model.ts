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

/** Everything the pure functions need. Nothing here reads storage; the data layer builds it. */
export interface Workspace {
  outcomes: Outcome[];
  tasks: Task[];
  decisions: Decision[];
  relationships: Relationship[];
  focus: FocusAssignment[];
  currentFocusOutcomeId: string | null;
}

export const MAX_NOW = 3;
