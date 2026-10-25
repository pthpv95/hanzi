import type { Expression, Filters, Progress, Rating, Review } from "./types";

export function createProgress(): Progress {
  return {
    bookmarks: [],
    reviews: {},
    activity: {},
    settings: {
      dailyGoal: 5,
      showPinyin: true,
      theme: "light",
      slowAudio: false,
    },
  };
}
export const STORAGE_KEY = "hanzi-vietnamese-v1";
export interface PracticeQuestion {
  item: Expression;
  options: Expression[];
}
export function shuffled<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function buildPractice(
  items: Expression[],
  count = 10,
): PracticeQuestion[] {
  return shuffled(items)
    .slice(0, count)
    .map((item) => ({
      item,
      options: shuffled([
        item,
        ...shuffled(items.filter((e) => e.id !== item.id)).slice(0, 3),
      ]),
    }));
}

export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .replace(/[1-5]/g, "")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

export function filterExpressions(
  items: Expression[],
  filters: Filters,
  bookmarks: string[] = [],
): Expression[] {
  const query = normalizeSearch(filters.query || "");
  return items.filter((item) => {
    if (
      filters.topic &&
      filters.topic !== "all" &&
      item.topic !== filters.topic
    )
      return false;
    if (
      filters.level &&
      filters.level !== "all" &&
      item.level !== filters.level
    )
      return false;
    if (filters.savedOnly && !bookmarks.includes(item.id)) return false;
    return (
      !query ||
      [item.zh, item.pinyin, item.meaning, item.context].some((value) =>
        normalizeSearch(value).includes(query),
      )
    );
  });
}

export function gradeReview(
  previous: Review | undefined,
  rating: Rating,
  now = Date.now(),
): Review {
  if (rating === "again")
    return { due: now + 600_000, interval: 0, successes: 0 };
  const interval =
    rating === "hard"
      ? Math.max(1, Math.round((previous?.interval || 0) * 1.2))
      : rating === "good"
        ? Math.max(3, Math.round((previous?.interval || 0) * 2))
        : Math.max(7, Math.round((previous?.interval || 0) * 2.5));
  return {
    due: now + interval * 86_400_000,
    interval,
    successes: (previous?.successes || 0) + 1,
  };
}

export function recordStudy(
  progress: Progress,
  id: string,
  day = todayKey(),
): Progress {
  const studied = progress.activity[day] || [];
  if (studied.includes(id)) return progress;
  return {
    ...progress,
    activity: { ...progress.activity, [day]: [...studied, id] },
  };
}

export function parseProgress(raw: string): Progress {
  const defaults = createProgress();
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return defaults;
    const settings = parsed.settings || {};
    const reviews: Progress["reviews"] = {};
    for (const [id, value] of Object.entries(parsed.reviews || {})) {
      const r = value as Review | null;
      if (
        r &&
        Number.isFinite(r.due) &&
        Number.isFinite(r.interval) &&
        r.interval >= 0 &&
        Number.isInteger(r.successes) &&
        r.successes >= 0
      )
        reviews[id] = r;
    }
    const activity: Progress["activity"] = {};
    for (const [day, value] of Object.entries(parsed.activity || {})) {
      if (/^\d{4}-\d{2}-\d{2}$/.test(day) && Array.isArray(value))
        activity[day] = [
          ...new Set(
            value.filter((id): id is string => typeof id === "string"),
          ),
        ];
    }
    return {
      bookmarks: Array.isArray(parsed.bookmarks)
        ? ([
            ...new Set(
              parsed.bookmarks.filter(
                (id: unknown): id is string => typeof id === "string",
              ),
            ),
          ] as string[])
        : [],
      reviews,
      activity,
      settings: {
        dailyGoal: [5, 10, 15, 20].includes(settings.dailyGoal)
          ? settings.dailyGoal
          : 5,
        showPinyin:
          typeof settings.showPinyin === "boolean" ? settings.showPinyin : true,
        theme: settings.theme === "dark" ? "dark" : "light",
        slowAudio: settings.slowAudio === true,
      },
    };
  } catch {
    return defaults;
  }
}

export function todayKey(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function getStreak(
  activity: Record<string, string[]>,
  today = todayKey(),
): number {
  const cursor = new Date(`${today}T12:00:00`);
  if (!activity[today]?.length) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (activity[todayKey(cursor)]?.length) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getStudyQueue(
  items: Expression[],
  progress: Progress,
  now = Date.now(),
): Expression[] {
  const due = items
    .filter((e) => progress.reviews[e.id] && progress.reviews[e.id].due <= now)
    .sort((a, b) => progress.reviews[a.id].due - progress.reviews[b.id].due);
  const fresh = items
    .filter((e) => !progress.reviews[e.id])
    .sort((a, b) => a.level - b.level);
  return [...due, ...fresh];
}
