"use client";

import { Bookmark, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { expressions, levels, topics } from "@/data/expressions";
import { filterExpressions } from "@/lib/learning";
import type { Expression, Filters, Progress } from "@/lib/types";
import { ExpressionCard } from "./ExpressionCard";

export function ExploreView({
  filters,
  setFilters,
  progress,
  savedOnly,
  onOpen,
  onSave,
  onExplore,
}: {
  filters: Filters;
  setFilters: (f: Filters) => void;
  progress: Progress;
  savedOnly: boolean;
  onOpen: (e: Expression) => void;
  onSave: (id: string) => void;
  onExplore: () => void;
}) {
  const filtered = filterExpressions(
    expressions,
    { ...filters, savedOnly },
    progress.bookmarks,
  );
  return (
    <div className="view-enter">
      <div className="page-intro">
        <p className="eyebrow">
          <span className="eyebrow-line" />
          {savedOnly
            ? "BỘ SƯU TẬP CỦA RIÊNG BẠN"
            : "TIẾNG TRUNG CHO NHỮNG CUỘC TRÒ CHUYỆN THẬT"}
        </p>
        <h1>
          {savedOnly ? "Những câu muốn nhớ." : "Một cách nói. Nhiều kết nối."}
        </h1>
        <p>
          {savedOnly
            ? "Lưu lại những cách nói bạn yêu thích. Trở lại bất cứ lúc nào."
            : "48 cách nói đời thường, có ngữ cảnh, âm thanh và lời giải thích dễ hiểu."}
        </p>
      </div>
      <section className="library-toolbar" aria-label="Bộ lọc thư viện">
        <div className="topic-filters">
          <button
            className={
              !filters.topic || filters.topic === "all"
                ? "filter-chip active"
                : "filter-chip"
            }
            onClick={() => setFilters({ ...filters, topic: "all" })}
          >
            Tất cả
          </button>
          {topics.map((topic) => (
            <button
              key={topic.id}
              className={
                filters.topic === topic.id
                  ? "filter-chip active"
                  : "filter-chip"
              }
              onClick={() => setFilters({ ...filters, topic: topic.id })}
            >
              {topic.label}
            </button>
          ))}
        </div>
        <div className="library-meta">
          <p>
            <strong>{filtered.length}</strong> cách nói
            {filters.query && <> cho “{filters.query}”</>}
          </p>
          <label className="level-select">
            <SlidersHorizontal size={15} />
            <select
              aria-label="Chọn cấp độ"
              value={filters.level || "all"}
              onChange={(e) =>
                setFilters({
                  ...filters,
                  level:
                    e.target.value === "all"
                      ? "all"
                      : (Number(e.target.value) as 1 | 2 | 3),
                })
              }
            >
              <option value="all">Mọi cấp độ</option>
              {Object.entries(levels).map(([key, value]) => (
                <option key={key} value={key}>
                  {value}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>
      {filtered.length ? (
        <div className="expression-grid library-grid">
          {filtered.map((item) => (
            <ExpressionCard
              key={item.id}
              item={item}
              saved={progress.bookmarks.includes(item.id)}
              learned={!!progress.reviews[item.id]}
              showPinyin={progress.settings.showPinyin}
              slowAudio={progress.settings.slowAudio}
              onOpen={onOpen}
              onSave={onSave}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            {savedOnly && !progress.bookmarks.length ? (
              <Bookmark size={30} />
            ) : (
              <Search size={30} />
            )}
          </div>
          <h2>
            {savedOnly && !progress.bookmarks.length
              ? "Một bộ sưu tập đang chờ bạn."
              : "Chưa tìm thấy cách nói phù hợp."}
          </h2>
          <p>
            {savedOnly && !progress.bookmarks.length
              ? "Chạm vào biểu tượng lưu trên một cụm từ để giữ lại ở đây."
              : "Thử từ khóa khác, hoặc bỏ bớt bộ lọc. Bạn có thể tìm bằng tiếng Việt không dấu."}
          </p>
          <button
            className="button button-primary"
            onClick={() => {
              setFilters({ query: "", level: "all", topic: "all" });
              if (savedOnly && !progress.bookmarks.length) onExplore();
            }}
          >
            <RotateCcw size={16} />
            {savedOnly && !progress.bookmarks.length
              ? "Khám phá cách nói"
              : "Xóa bộ lọc"}
          </button>
        </div>
      )}
    </div>
  );
}
