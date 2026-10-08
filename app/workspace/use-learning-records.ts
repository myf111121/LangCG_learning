'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { allLessons } from '../curriculum';
import type { LearningRecords, RecordValue } from './types';

type ApiRecord = {
  item_id: string;
  completed: number;
  note: string;
  code: string;
  updated_at: string;
};

export function useLearningRecords() {
  const [records, setRecords] = useState<LearningRecords>({});
  const recordsRef = useRef(records);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    recordsRef.current = records;
  }, [records]);

  const load = useCallback(async () => {
    try {
      const response = await fetch('/api/learning', { cache: 'no-store' });
      const body = await response.json() as { error?: string; records: ApiRecord[] };
      if (!response.ok) throw new Error(body.error || '读取失败');
      const values: LearningRecords = {};
      for (const row of body.records) {
        values[row.item_id] = {
          completed: !!row.completed && (!allLessons.some(lesson => lesson.id === row.item_id) || !!row.code),
          note: row.note,
          code: row.code ?? '',
          updatedAt: row.updated_at,
        };
      }
      setRecords(values);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '读取失败，请重试。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(() => {
      if (active) return load();
    });
    return () => { active = false; };
  }, [load]);

  const retry = useCallback(() => {
    setLoading(true);
    setLoadError('');
    void load();
  }, [load]);

  const save = useCallback(async (id: string, patch: Partial<RecordValue>) => {
    setBusy(true);
    try {
      const response = await fetch('/api/learning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...patch }),
      });
      const result = await response.json() as { error?: string; updated_at: string };
      if (!response.ok) throw new Error(result.error || '保存失败');
      setRecords(previous => ({
        ...previous,
        [id]: {
          ...(previous[id] ?? { completed: false, note: '', code: '' }),
          ...patch,
          updatedAt: result.updated_at,
        },
      }));
      const usesAnswerReview = /^w(?:[7-9]|1[0-2])-/.test(id);
      toast.success(
        patch.note !== undefined
          ? '笔记已保存'
          : patch.code !== undefined
            ? patch.completed
              ? usesAnswerReview ? '代码与进度已保存，任务已完成' : '代码通过，任务已完成'
              : usesAnswerReview ? '草稿已保存' : '代码已保存，等待验收'
            : '学习进度已保存',
      );
      return true;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : '保存失败，请重试。');
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return {
    records,
    recordsRef,
    loading,
    loadError,
    busy,
    canSave: !loading && !loadError && !busy,
    retry,
    save,
  };
}
