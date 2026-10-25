import assert from "node:assert/strict";
import { test } from "node:test";
import {
  filterExpressions,
  gradeReview,
  recordStudy,
  parseProgress,
  createProgress,
  getStreak,
  getStudyQueue,
  buildPractice,
} from "../src/lib/learning";
import { expressions } from "../src/data/expressions";

test("search finds phrases by Chinese, unaccented Vietnamese and pinyin with or without spaces or tone numbers", () => {
  for (const query of [
    "没关系",
    "khong sao",
    "méi guān xi",
    "meiguanxi",
    "mei2 guan1 xi5",
  ]) {
    assert.ok(
      filterExpressions(expressions, { query }).some(
        (e) => e.id === "mei-guan-xi",
      ),
      query,
    );
  }
});

test("topic, level and saved filters intersect instead of overriding one another", () => {
  const result = filterExpressions(
    expressions,
    { topic: "daily", level: 1, savedOnly: true },
    ["man-man-lai", "mei-guan-xi"],
  );
  assert.deepEqual(
    result.map((e) => e.id),
    ["man-man-lai"],
  );
  assert.deepEqual(
    filterExpressions(expressions, { query: "nothing matches this" }),
    [],
  );
});

test("forgotten cards return in ten minutes and lose mastery", () => {
  const now = new Date("2026-10-24T05:00:00Z").getTime();
  const reviewed = gradeReview(
    { due: now, interval: 14, successes: 4 },
    "again",
    now,
  );
  assert.equal(reviewed.due, now + 600_000);
  assert.equal(reviewed.successes, 0);
});

test("successful reviews expand intervals and the queue excludes cards not yet due", () => {
  const now = 1_000_000;
  const first = gradeReview(undefined, "good", now);
  assert.equal(first.due, now + 3 * 86_400_000);
  const second = gradeReview(first, "good", first.due);
  assert.ok(second.interval > first.interval);
  const progress = createProgress();
  progress.reviews["mei-guan-xi"] = first;
  progress.reviews["man-man-lai"] = { due: now - 1, interval: 1, successes: 1 };
  const queue = getStudyQueue(expressions, progress, now);
  assert.equal(queue[0].id, "man-man-lai");
  assert.ok(!queue.some((e) => e.id === "mei-guan-xi"));
});

test("daily goal counts unique phrases rather than repeated attempts", () => {
  const progress = createProgress();
  const first = recordStudy(progress, "mei-guan-xi", "2026-10-24");
  const repeat = recordStudy(first, "mei-guan-xi", "2026-10-24");
  assert.deepEqual(repeat.activity["2026-10-24"], ["mei-guan-xi"]);
  assert.deepEqual(progress.activity, {});
});

test("streak survives an unfinished today but ends after an empty yesterday", () => {
  assert.equal(
    getStreak({ "2026-10-23": ["a"], "2026-10-22": ["b"] }, "2026-10-24"),
    2,
  );
  assert.equal(getStreak({ "2026-10-22": ["b"] }, "2026-10-24"), 0);
  assert.equal(
    getStreak({ "2026-10-24": ["a"], "2026-10-23": ["b"] }, "2026-10-24"),
    2,
  );
});

test("invalid saved progress safely falls back and corrupted settings cannot break study sessions", () => {
  assert.equal(parseProgress("{broken").settings.dailyGoal, 5);
  assert.equal(
    parseProgress(
      JSON.stringify({
        settings: { dailyGoal: -100 },
        bookmarks: "oops",
        reviews: { bad: { due: "tomorrow" } },
      }),
    ).settings.dailyGoal,
    5,
  );
  assert.deepEqual(
    parseProgress(JSON.stringify({ bookmarks: "oops" })).bookmarks,
    [],
  );
  assert.deepEqual(
    parseProgress(JSON.stringify({ reviews: { bad: { due: "tomorrow" } } }))
      .reviews,
    {},
  );
});

test("valid bookmarks, settings and reviews survive a round trip through browser storage", () => {
  const progress = createProgress();
  progress.bookmarks = ["mei-guan-xi"];
  progress.settings.dailyGoal = 10;
  progress.reviews["mei-guan-xi"] = { due: 123456, interval: 3, successes: 1 };
  assert.deepEqual(parseProgress(JSON.stringify(progress)), progress);
});

test("all learning entries have pronounceable examples, Vietnamese guidance and unique ids", () => {
  assert.ok(expressions.length >= 48);
  assert.equal(new Set(expressions.map((e) => e.id)).size, expressions.length);
  for (const entry of expressions) {
    assert.ok(entry.dialogue.length >= 2, entry.id);
    assert.ok(entry.note.length > 15, entry.id);
    for (const line of entry.dialogue) {
      assert.match(line.zh, /\p{Script=Han}/u);
      assert.ok(line.pinyin && line.vi, entry.id);
    }
  }
});

test("a practice session never repeats a question and includes one correct answer among four distinct options", () => {
  const questions = buildPractice(expressions, 10);
  assert.equal(questions.length, 10);
  assert.equal(new Set(questions.map((q) => q.item.id)).size, 10);
  for (const q of questions) {
    assert.equal(q.options.length, 4);
    assert.equal(new Set(q.options.map((o) => o.id)).size, 4);
    assert.equal(q.options.filter((o) => o.id === q.item.id).length, 1);
  }
});
