import { DerivedTask, Task } from '@/types';

export function computeROI(revenue: number, timeTaken: number): number | null {
  // FIX (BUG 5): safe ROI calculation
  if (!Number.isFinite(revenue) || !Number.isFinite(timeTaken) || timeTaken <= 0) {
    return null;
  }
  return Number((revenue / timeTaken).toFixed(2));
}

export function computePriorityWeight(priority: Task['priority']): 3 | 2 | 1 {
  switch (priority) {
    case 'High':
      return 3;
    case 'Medium':
      return 2;
    default:
      return 1;
  }
}

export function withDerived(task: Task): DerivedTask {
  return {
    ...task,
    roi: computeROI(task.revenue, task.timeTaken),
    priorityWeight: computePriorityWeight(task.priority),
  };
}

export function sortTasks(tasks: ReadonlyArray<DerivedTask>): DerivedTask[] {
  return [...tasks].sort((a, b) => {
    const aROI = a.roi ?? -Infinity;
    const bROI = b.roi ?? -Infinity;

    //  ROI (descending)
    if (bROI !== aROI) return bROI - aROI;

    //  Priority (High > Medium > Low)
    if (b.priorityWeight !== a.priorityWeight) {
      return b.priorityWeight - a.priorityWeight;
    }

    //  FIX (BUG 3): deterministic tie-breaker
    return a.title.localeCompare(b.title);
  });
}

export function computeTotalRevenue(tasks: ReadonlyArray<Task>): number {
  return tasks.filter(t => t.status === 'Done').reduce((sum, t) => sum + t.revenue, 0);
}

export function computeTotalTimeTaken(tasks: ReadonlyArray<Task>): number {
  return tasks.reduce((sum, t) => sum + t.timeTaken, 0);
}

export function computeTimeEfficiency(tasks: ReadonlyArray<Task>): number {
  if (tasks.length === 0) return 0;
  const done = tasks.filter(t => t.status === 'Done').length;
  return (done / tasks.length) * 100;
}

export function computeRevenuePerHour(tasks: ReadonlyArray<Task>): number {
  const revenue = computeTotalRevenue(tasks);
  const time = computeTotalTimeTaken(tasks);
  return time > 0 ? revenue / time : 0;
}

export function computeAverageROI(tasks: ReadonlyArray<Task>): number {
  const rois = tasks
    .map(t => computeROI(t.revenue, t.timeTaken))
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

  if (rois.length === 0) return 0;
  return rois.reduce((s, r) => s + r, 0) / rois.length;
}

export function computePerformanceGrade(avgROI: number): 'Excellent' | 'Good' | 'Needs Improvement' {
  if (avgROI > 500) return 'Excellent';
  if (avgROI >= 200) return 'Good';
  return 'Needs Improvement';
}
// ---------- Analytics helpers (RESTORED FOR DASHBOARD) ----------

export type FunnelCounts = {
  todo: number;
  inProgress: number;
  done: number;
};

export function computeFunnel(tasks: ReadonlyArray<Task>): FunnelCounts {
  return {
    todo: tasks.filter(t => t.status === 'Todo').length,
    inProgress: tasks.filter(t => t.status === 'In Progress').length,
    done: tasks.filter(t => t.status === 'Done').length,
  };
}

export function computeThroughputByWeek(tasks: ReadonlyArray<Task>) {
  const map = new Map<string, number>();

  tasks.forEach(t => {
    if (!t.completedAt) return;
    const d = new Date(t.completedAt);
    const key = `${d.getFullYear()}-W${getWeekNumber(d)}`;
    map.set(key, (map.get(key) ?? 0) + 1);
  });

  return Array.from(map.entries()).map(([week, count]) => ({
    week,
    count,
  }));
}

export function computeWeightedPipeline(tasks: ReadonlyArray<Task>): number {
  const weights = { Todo: 0.1, 'In Progress': 0.5, Done: 1 } as const;
  return tasks.reduce((sum, t) => sum + t.revenue * weights[t.status], 0);
}

export function computeVelocityByPriority(tasks: ReadonlyArray<Task>) {
  const result: Record<Task['priority'], number> = {
    High: 0,
    Medium: 0,
    Low: 0,
  };

  tasks.forEach(t => {
    if (t.completedAt) result[t.priority]++;
  });

  return result;
}

function getWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}




