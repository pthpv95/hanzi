"use client";

import {
  ArrowRight,
  Bookmark,
  Check,
  ChevronRight,
  Compass,
  Flame,
  Headphones,
  Layers3,
  Leaf,
  Sparkles,
  Target,
} from "lucide-react";
import { expressions, topics } from "@/data/expressions";
import { todayKey } from "@/lib/learning";
import type { Expression, Progress, TopicId } from "@/lib/types";
import { AudioButton } from "./AudioProvider";
import { ExpressionCard } from "./ExpressionCard";

export function HomeView({
  day,
  progress,
  streak,
  dueCount,
  onExplore,
  onOpen,
  onSave,
  onStart,
  onSettings,
}: {
  day: string;
  progress: Progress;
  streak: number;
  dueCount: number;
  onExplore: (topic?: TopicId) => void;
  onOpen: (item: Expression) => void;
  onSave: (id: string) => void;
  onStart: () => void;
  onSettings: () => void;
}) {
  const today = day;
  const todayCount = progress.activity[today]?.length || 0;
  const daily =
    expressions[
      Math.floor(new Date(`${today}T12:00:00Z`).getTime() / 86_400_000) %
        expressions.length
    ];
  const spotlight = daily || expressions[0];
  const learned = Object.keys(progress.reviews).length;
  const recommended = [
    ...expressions.filter((e) => e.level === 1 && !progress.reviews[e.id]),
    ...expressions.filter((e) => e.level === 1 && progress.reviews[e.id]),
  ].slice(0, 6);
  const goal = progress.settings.dailyGoal;
  const complete = todayCount >= goal;

  return (
    <div className="home-view view-enter">
      <section className="welcome-section">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-line" />
            MỘT CHÚT MỖI NGÀY, MỘT BƯỚC TIẾN XA
          </p>
          <h1>
            Tiếng Trung đời thường.
            <br />
            <span>Kết nối thật gần.</span>
          </h1>
          <p className="welcome-description">
            Từ những câu chào đến chuyện mỗi ngày. Học cách nói tự nhiên,
            <br className="desktop-break" /> hiểu đúng ngữ cảnh, tự tin trò
            chuyện.
          </p>
          <div className="welcome-actions">
            <button className="button button-primary" onClick={onStart}>
              Bắt đầu học hôm nay <ArrowRight size={17} />
            </button>
            <span className="time-hint">
              <span className="tiny-clock" />
              Chỉ 5 phút mỗi ngày
            </span>
          </div>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <span className="art-caption">HỌC ĐỂ KẾT NỐI</span>
          <span className="art-char char-one">你</span>
          <span className="art-char char-two">好</span>
          <span className="art-stamp">
            每天
            <br />
            进步
          </span>
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-dot" />
          <span className="art-pinyin">nǐ hǎo — xin chào</span>
        </div>
      </section>

      <div className="home-feature-grid">
        <section className="daily-expression">
          <div className="daily-top">
            <span className="section-kicker">
              <Sparkles size={14} />
              CÁCH NÓI HÔM NAY
            </span>
            <span className="daily-category">
              {topics.find((t) => t.id === spotlight.topic)?.label}
            </span>
          </div>
          <div className="daily-content">
            <div>
              <button
                className="daily-title"
                onClick={() => onOpen(spotlight)}
                lang="zh-CN"
              >
                {spotlight.zh}
              </button>
              {progress.settings.showPinyin && (
                <p className="pinyin daily-pinyin">{spotlight.pinyin}</p>
              )}
              <p className="daily-meaning">{spotlight.meaning}</p>
            </div>
            <div className="daily-audio">
              <AudioButton
                audioKey={spotlight.id}
                text={spotlight.zh}
                slow={progress.settings.slowAudio}
              />
              <span>Nghe phát âm</span>
            </div>
          </div>
          <p className="daily-context">{spotlight.context}</p>
          <div className="daily-bottom">
            <button className="text-button" onClick={() => onOpen(spotlight)}>
              Khám phá cách dùng <ArrowRight size={15} />
            </button>
            <button
              className={`icon-button ${progress.bookmarks.includes(spotlight.id) ? "saved" : ""}`}
              aria-label="Lưu cách nói hôm nay"
              aria-pressed={progress.bookmarks.includes(spotlight.id)}
              onClick={() => onSave(spotlight.id)}
            >
              <Bookmark
                size={18}
                fill={
                  progress.bookmarks.includes(spotlight.id)
                    ? "currentColor"
                    : "none"
                }
              />
            </button>
          </div>
          <span className="daily-watermark" aria-hidden="true">
            言
          </span>
        </section>
        <section className="goal-card">
          <div className="goal-heading">
            <span className="section-kicker">
              <Target size={15} />
              MỤC TIÊU HÔM NAY
            </span>
            <button className="subtle-link" onClick={onSettings}>
              Điều chỉnh
            </button>
          </div>
          <div className="goal-progress">
            <div className="goal-ring">
              <svg viewBox="0 0 100 100" aria-hidden="true">
                <circle className="ring-track" cx="50" cy="50" r="42" />
                <circle
                  className="ring-value"
                  cx="50"
                  cy="50"
                  r="42"
                  strokeDasharray="264"
                  strokeDashoffset={264 * (1 - Math.min(1, todayCount / goal))}
                />
              </svg>
              <span>
                {complete ? (
                  <Check size={26} />
                ) : (
                  <>
                    <strong>{todayCount}</strong>
                    <small>/{goal}</small>
                  </>
                )}
              </span>
            </div>
            <div>
              <h3>
                {complete
                  ? "Bạn làm tốt lắm!"
                  : todayCount
                    ? "Giữ nhịp học nhé!"
                    : "Bắt đầu một thói quen"}
              </h3>
              <p>
                {complete
                  ? "Hôm nay bạn đã đạt mục tiêu."
                  : `${Math.max(0, goal - todayCount)} cách nói nữa cho hôm nay.`}
              </p>
              <span className="goal-caption">
                <Leaf size={13} />
                Mỗi chút đều đáng giá.
              </span>
            </div>
          </div>
          <div
            className="weekly-progress"
            aria-label="Hoạt động học trong 7 ngày gần nhất"
          >
            {Array.from({ length: 7 }, (_, i) => {
              const date = new Date(`${today}T12:00:00`);
              date.setDate(date.getDate() - 6 + i);
              const key = todayKey(date);
              const active = !!progress.activity[key]?.length;
              return (
                <div
                  key={key}
                  className={`week-day ${i === 6 ? "is-today" : ""}`}
                  title={`${date.toLocaleDateString("vi-VN")}: ${progress.activity[key]?.length || 0} cụm từ`}
                >
                  <span>
                    {["CN", "T2", "T3", "T4", "T5", "T6", "T7"][date.getDay()]}
                  </span>
                  <span className={`day-dot ${active ? "active" : ""}`}>
                    {active ? <Check size={11} /> : i === 6 ? <span /> : null}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="goal-footer">
            <Flame size={15} />
            <span>
              {streak
                ? `${streak} ngày học liên tiếp`
                : "Hôm nay là một ngày tốt để bắt đầu"}
            </span>
          </div>
        </section>
      </div>

      <section className="topics-section">
        <div className="section-heading">
          <div>
            <span className="overline">HỌC TỪ NHỮNG ĐIỀU QUEN THUỘC</span>
            <h2>Bạn muốn nói về điều gì?</h2>
          </div>
          <button className="text-button" onClick={() => onExplore()}>
            Tất cả chủ đề <ArrowRight size={16} />
          </button>
        </div>
        <div className="topic-grid">
          {topics.slice(0, 6).map((topic) => (
            <button
              key={topic.id}
              className="topic-card"
              onClick={() => onExplore(topic.id)}
            >
              <span className={`topic-character ${topic.color}`} lang="zh-CN">
                {topic.hanzi}
              </span>
              <strong>{topic.label}</strong>
              <span>
                {expressions.filter((e) => e.topic === topic.id).length} cách
                nói <ChevronRight size={12} />
              </span>
            </button>
          ))}
        </div>
      </section>

      <section>
        <div className="section-heading">
          <div>
            <span className="overline">NHỮNG CÂU NHỎ, DÙNG ĐƯỢC NGAY</span>
            <h2>Dành cho bước khởi đầu</h2>
          </div>
          <button className="text-button" onClick={() => onExplore()}>
            Khám phá thư viện <ArrowRight size={16} />
          </button>
        </div>
        <div className="expression-grid">
          {recommended.map((item) => (
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
      </section>

      <section className="review-banner">
        <div className="review-banner-icon">
          <Layers3 size={25} />
        </div>
        <div>
          <h3>Gặp lại để nhớ lâu hơn.</h3>
          <p>
            {dueCount
              ? `${dueCount} cách nói đang chờ bạn ôn lại. Một chút thôi, nhưng rất có ích.`
              : learned
                ? "Những cách nói đã học sẽ trở lại vào đúng lúc bạn cần ôn."
                : "Lật thẻ, thử nhớ và tự đánh giá. Để tiếng Trung ở lại lâu hơn."}
          </p>
        </div>
        <button className="button button-outline" onClick={onStart}>
          Ôn bằng flashcard <ArrowRight size={16} />
        </button>
      </section>
      <div className="home-footnote">
        <span>
          <Headphones size={14} />
          Phát âm Quan thoại
        </span>
        <span>
          <Compass size={14} />
          48 cách nói thực tế
        </span>
        <span>
          <Leaf size={14} />
          Học theo nhịp của bạn
        </span>
      </div>
    </div>
  );
}
