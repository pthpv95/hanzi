import { LearningApp } from "@/components/LearningApp";
import { todayKey } from "@/lib/learning";

export default function Home() {
  return <LearningApp initialDay={todayKey()} />;
}
