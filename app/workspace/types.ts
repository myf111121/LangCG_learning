import type { Dispatch, ReactNode, SetStateAction } from 'react';
import type { WorkspaceView } from '../learning-navigation';

export type RecordValue = {
  completed: boolean;
  note: string;
  code: string;
  updatedAt?: string;
};

export type LearningRecords = Record<string, RecordValue>;
export type SaveLearningRecord = (id: string, patch: Partial<RecordValue>) => Promise<boolean>;
export type MoveWorkspace = (view: WorkspaceView, week?: number) => void;
export type NoteEditorRenderer = (id: string, label: string) => ReactNode;
export type StringStateSetter = Dispatch<SetStateAction<string>>;
