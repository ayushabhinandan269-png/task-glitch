import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DerivedTask, Metrics, Task } from '@/types';
import {
  computeAverageROI,
  computePerformanceGrade,
  computeRevenuePerHour,
  computeTimeEfficiency,
  computeTotalRevenue,
  withDerived,
  sortTasks as sortDerived,
} from '@/utils/logic';
import { generateSalesTasks } from '@/utils/seed';

interface UseTasksState {
  tasks: Task[];
  loading: boolean;
  error: string | null;
  derivedSorted: DerivedTask[];
  metrics: Metrics;
  lastDeleted: Task | null;
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'completedAt'>) => void;
  updateTask: (id: string, patch: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  undoDelete: () => void;
}

const INITIAL_METRICS: Metrics = {
  totalRevenue: 0,
  totalTimeTaken: 0,
  timeEfficiencyPct: 0,
  revenuePerHour: 0,
  averageROI: 0,
  performanceGrade: 'Needs Improvement',
};

export function useTasks(): UseTasksState {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<Task | null>(null);
  const fetchedRef = useRef(false);

  function normalizeTasks(input: any[]): Task[] {
    const now = Date.now();
    return (Array.isArray(input) ? input : []).map((t, idx) => {
      const revenue = Number(t.revenue);
      const timeTaken = Number(t.timeTaken);

      return {
        id: t.id ?? crypto.randomUUID(),
        title: t.title,
        revenue: Number.isFinite(revenue) && revenue > 0 ? revenue : 0,
        timeTaken: Number.isFinite(timeTaken) && timeTaken > 0 ? timeTaken : 1,
        priority: t.priority ?? 'Low',
        status: t.status ?? 'Todo',
        notes: t.notes ?? '',
        createdAt: t.createdAt ?? new Date(now - idx * 1000).toISOString(),
        completedAt:
          t.status === 'Done'
            ? t.completedAt ?? new Date().toISOString()
            : undefined,
      };
    });
  }

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let isMounted = true;

    async function load() {
      try {
        const res = await fetch('/tasks.json');
        if (!res.ok) throw new Error(`Failed to load tasks.json (${res.status})`);

        const data = await res.json();
        const normalized = normalizeTasks(data);
        const finalData =
          normalized.length > 0 ? normalized : generateSalesTasks(50);

        if (isMounted) setTasks(finalData);
      } catch (e: any) {
        if (isMounted) setError(e?.message ?? 'Failed to load tasks');
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const derivedSorted = useMemo<DerivedTask[]>(() => {
    const withRoi = tasks.map(withDerived);
    return sortDerived(withRoi);
  }, [tasks]);

  const metrics = useMemo<Metrics>(() => {
    if (tasks.length === 0) return INITIAL_METRICS;

    const totalRevenue = computeTotalRevenue(tasks);
    const totalTimeTaken = tasks.reduce((s, t) => s + t.timeTaken, 0);
    const timeEfficiencyPct = computeTimeEfficiency(tasks);
    const revenuePerHour = computeRevenuePerHour(tasks);
    const averageROI = computeAverageROI(tasks);
    const performanceGrade = computePerformanceGrade(averageROI);

    return {
      totalRevenue,
      totalTimeTaken,
      timeEfficiencyPct,
      revenuePerHour,
      averageROI,
      performanceGrade,
    };
  }, [tasks]);

  const addTask = useCallback(
    (task: Omit<Task, 'id' | 'createdAt' | 'completedAt'>) => {
      const now = new Date().toISOString();

      const newTask: Task = {
        ...task,
        id: crypto.randomUUID(),
        revenue: task.revenue > 0 ? task.revenue : 0,
        timeTaken: task.timeTaken > 0 ? task.timeTaken : 1,
        createdAt: now,
        completedAt: task.status === 'Done' ? now : undefined,
      };

      setTasks(prev => [...prev, newTask]);
    },
    []
  );

  const updateTask = useCallback((id: string, patch: Partial<Task>) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === id
          ? {
              ...t,
              ...patch,
              timeTaken:
                patch.timeTaken && patch.timeTaken > 0
                  ? patch.timeTaken
                  : t.timeTaken,
              completedAt:
                t.status !== 'Done' && patch.status === 'Done'
                  ? new Date().toISOString()
                  : t.completedAt,
            }
          : t
      )
    );
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks(prev => {
      const target = prev.find(t => t.id === id) || null;
      setLastDeleted(target);
      return prev.filter(t => t.id !== id);
    });
  }, []);

  const undoDelete = useCallback(() => {
    if (!lastDeleted) return;
    setTasks(prev => [...prev, lastDeleted]);
    setLastDeleted(null);
  }, [lastDeleted]);

  return {
    tasks,
    loading,
    error,
    derivedSorted,
    metrics,
    lastDeleted,
    addTask,
    updateTask,
    deleteTask,
    undoDelete,
  };
}


