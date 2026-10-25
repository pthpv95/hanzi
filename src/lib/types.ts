export type TopicId =
  | "social"
  | "daily"
  | "food"
  | "travel"
  | "work"
  | "feelings"
  | "shopping"
  | "relationships";
export type Level = 1 | 2 | 3;
export type View =
  | "home"
  | "explore"
  | "flashcards"
  | "practice"
  | "saved"
  | "classroom";
export type Rating = "again" | "hard" | "good" | "easy";
export interface DialogueLine {
  zh: string;
  pinyin: string;
  vi: string;
}
export interface Expression {
  id: string;
  zh: string;
  pinyin: string;
  meaning: string;
  topic: TopicId;
  level: Level;
  context: string;
  note: string;
  dialogue: DialogueLine[];
}
export interface Review {
  due: number;
  interval: number;
  successes: number;
}
export interface Settings {
  dailyGoal: number;
  showPinyin: boolean;
  theme: "light" | "dark";
  slowAudio: boolean;
}
export interface Progress {
  bookmarks: string[];
  reviews: Record<string, Review>;
  activity: Record<string, string[]>;
  settings: Settings;
}
export interface Filters {
  query?: string;
  topic?: TopicId | "all";
  level?: Level | "all";
  savedOnly?: boolean;
}
