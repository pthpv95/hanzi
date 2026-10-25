"use client";

import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronRight,
  Headphones,
  Layers3,
  Lightbulb,
  MessageCircle,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { gradeReview, type PracticeQuestion } from "@/lib/learning";
import type { Expression, Progress, Rating } from "@/lib/types";
import { AudioButton, useAudio } from "./AudioProvider";

const ratings: { id: Rating; label: string; className: string }[] = [
  { id: "again", label: "Chưa nhớ", className: "rating-again" },
  { id: "hard", label: "Hơi khó", className: "rating-hard" },
  { id: "good", label: "Đã nhớ", className: "rating-good" },
  { id: "easy", label: "Rất dễ", className: "rating-easy" },
];

export function FlashcardsView({
  session,
  progress,
  onGrade,
  onRestart,
  onExplore,
}: {
  session: Expression[];
  progress: Progress;
  onGrade: (id: string, rating: Rating) => void;
  onRestart: () => void;
  onExplore: () => void;
}) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [reverse, setReverse] = useState(false);
  const { stop } = useAudio();
  const item = session[index];
  return (
    <div className="study-view view-enter">
      <div className="page-intro">
        <p className="eyebrow">
          <span className="eyebrow-line" />
          GẶP LẠI ĐỂ NHỚ LÂU HƠN
        </p>
        <h1>Từng tấm thẻ. Từng chút nhớ.</h1>
        <p>Thử nhớ trước khi lật thẻ. Đánh giá thật lòng để ôn lại đúng lúc.</p>
      </div>
      {!item ? (
        <div className="session-complete">
          <div className="completion-mark">
            <CheckCircle2 size={42} />
          </div>
          <p className="overline">MỘT BƯỚC TIẾN NHỎ HÔM NAY</p>
          <h2>
            {session.length
              ? "Bạn đã hoàn thành lượt học!"
              : "Bạn đã ôn hết thẻ đến hạn!"}
          </h2>
          <p>
            {session.length
              ? `Đã ôn ${session.length} cách nói. Các thẻ sẽ quay lại theo mức độ bạn đã chọn.`
              : "Hãy trở lại khi đến lịch ôn, hoặc khám phá thêm cách nói mới."}
          </p>
          <div className="completion-actions">
            <button className="button button-primary" onClick={onRestart}>
              <RotateCcw size={16} />
              Lượt học tiếp theo
            </button>
            <button className="button button-outline" onClick={onExplore}>
              Khám phá thư viện <ArrowRight size={16} />
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="study-toolbar">
            <span>
              <Layers3 size={17} />
              Thẻ {index + 1} <span className="muted">/ {session.length}</span>
            </span>
            <button
              className="subtle-link direction-toggle"
              onClick={() => {
                stop();
                setReverse(!reverse);
                setRevealed(false);
              }}
            >
              <RotateCcw size={14} />
              {reverse ? "Việt → Trung" : "Trung → Việt"}
            </button>
          </div>
          <div className="session-track">
            <span style={{ width: `${(index / session.length) * 100}%` }} />
          </div>
          <div className={`flashcard ${revealed ? "is-revealed" : ""}`}>
            <span className="flashcard-label">
              {reverse
                ? "BẠN SẼ NÓI THẾ NÀO BẰNG TIẾNG TRUNG?"
                : "BẠN CÒN NHỚ CÁCH NÓI NÀY KHÔNG?"}
            </span>
            <button
              className="flashcard-face"
              onClick={() => setRevealed(!revealed)}
              aria-label={revealed ? "Ẩn đáp án" : "Lật thẻ xem đáp án"}
            >
              <h2
                lang={reverse && !revealed ? "vi" : "zh-CN"}
                className={reverse && !revealed ? "vietnamese-face" : ""}
              >
                {reverse && !revealed ? item.meaning : item.zh}
              </h2>
              {progress.settings.showPinyin && (!reverse || revealed) && (
                <p className="pinyin">{item.pinyin}</p>
              )}
              {revealed && (
                <>
                  <div className="flashcard-divider" />
                  <h3>{item.meaning}</h3>
                  <p className="flashcard-context">{item.context}</p>
                </>
              )}
              {!revealed && (
                <span className="flip-hint">
                  <RotateCcw size={15} />
                  Chạm để lật thẻ
                </span>
              )}
            </button>
            {(!reverse || revealed) && (
              <AudioButton
                audioKey={item.id}
                text={item.zh}
                slow={progress.settings.slowAudio}
                label="Nghe phát âm"
              />
            )}
          </div>
          {!revealed ? (
            <button
              className="button button-primary reveal-button"
              onClick={() => setRevealed(true)}
            >
              Xem đáp án <ArrowRight size={17} />
            </button>
          ) : (
            <div className="rating-section">
              <p>Bạn nhớ cách nói này đến đâu?</p>
              <div className="rating-buttons">
                {ratings.map((rating) => {
                  const review = gradeReview(
                    progress.reviews[item.id],
                    rating.id,
                  );
                  return (
                    <button
                      key={rating.id}
                      className={`rating-button ${rating.className}`}
                      onClick={() => {
                        stop();
                        onGrade(item.id, rating.id);
                        setIndex(index + 1);
                        setRevealed(false);
                      }}
                    >
                      <strong>{rating.label}</strong>
                      <span>
                        {rating.id === "again"
                          ? "10 phút"
                          : `${review.interval} ngày`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <p className="study-footnote">
            <Lightbulb size={15} />
            Thẻ đến hạn xuất hiện trước, tiếp theo là những cách nói mới.
          </p>
        </>
      )}
    </div>
  );
}

type PracticeMode = "meaning" | "listening" | "context";
const modes = [
  { id: "meaning" as const, label: "Chọn nghĩa", icon: Lightbulb },
  { id: "listening" as const, label: "Nghe & hiểu", icon: Headphones },
  { id: "context" as const, label: "Tình huống", icon: MessageCircle },
];

export function PracticeView({
  questions,
  progress,
  onAnswer,
  onRestart,
  onOpen,
}: {
  questions: PracticeQuestion[];
  progress: Progress;
  onAnswer: (id: string, correct: boolean) => void;
  onRestart: () => void;
  onOpen: (item: Expression) => void;
}) {
  const [mode, setMode] = useState<PracticeMode>("meaning");
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const { stop } = useAudio();
  const question = questions[index];
  const item = question?.item;
  function reset(nextMode: PracticeMode) {
    stop();
    setMode(nextMode);
    setIndex(0);
    setChoice(null);
    setScore(0);
    onRestart();
  }
  return (
    <div className="study-view practice-view view-enter">
      <div className="page-intro">
        <p className="eyebrow">
          <span className="eyebrow-line" />
          THỬ MỘT CHÚT, NHỚ THÊM MỘT CHÚT
        </p>
        <h1>Biến điều đã học thành phản xạ.</h1>
        <p>
          Nghe, hiểu và chọn cách nói phù hợp. Mỗi lượt có {questions.length}{" "}
          câu hỏi.
        </p>
      </div>
      <div className="practice-mode-tabs" aria-label="Chế độ luyện tập">
        {modes.map((m) => (
          <button
            key={m.id}
            className={mode === m.id ? "active" : ""}
            aria-pressed={mode === m.id}
            onClick={() => {
              if (m.id !== mode) reset(m.id);
            }}
          >
            <m.icon size={17} />
            {m.label}
          </button>
        ))}
      </div>
      {!question || !item ? (
        <div className="session-complete">
          <div className="completion-mark">
            <Trophy size={42} />
          </div>
          <p className="overline">MỘT LƯỢT LUYỆN TẬP THẬT TỐT</p>
          <h2>
            {score}/{questions.length} câu trả lời đúng
          </h2>
          <p>
            {score === questions.length
              ? "Bạn đã nhận ra tất cả các cách nói trong lượt này!"
              : "Mỗi lần nhầm là một lần hiểu thêm. Các câu cần luyện đã được đưa vào lịch ôn."}
          </p>
          <button className="button button-primary" onClick={() => reset(mode)}>
            <RotateCcw size={16} />
            Thử một lượt mới
          </button>
        </div>
      ) : (
        <>
          <div className="study-toolbar">
            <span>
              Câu {index + 1}{" "}
              <span className="muted">/ {questions.length}</span>
            </span>
            <span className="score-label">
              <CheckCircle2 size={15} />
              {score} câu đúng
            </span>
          </div>
          <div className="session-track">
            <span
              style={{
                width: `${((index + (choice ? 1 : 0)) / questions.length) * 100}%`,
              }}
            />
          </div>
          <div className="practice-question">
            <p className="flashcard-label">
              {mode === "meaning"
                ? "CÁCH NÓI NÀY CÓ NGHĨA LÀ GÌ?"
                : mode === "listening"
                  ? "LẮNG NGHE VÀ CHỌN NGHĨA ĐÚNG"
                  : "BẠN SẼ NÓI GÌ TRONG TÌNH HUỐNG NÀY?"}
            </p>
            {mode === "context" ? (
              <h2 className="context-question">{item.context}</h2>
            ) : mode === "listening" && !choice ? (
              <div className="listening-prompt">
                <span className="listening-orbit">
                  <Headphones size={38} />
                </span>
                <AudioButton
                  audioKey={item.id}
                  text={item.zh}
                  slow={progress.settings.slowAudio}
                  label="Nghe cách nói"
                />
                <AudioButton
                  audioKey={item.id}
                  text={item.zh}
                  slow
                  label="Nghe chậm"
                  className="listen-slow"
                />
              </div>
            ) : (
              <>
                <h2 lang="zh-CN">{item.zh}</h2>
                {progress.settings.showPinyin && (
                  <p className="pinyin">{item.pinyin}</p>
                )}
                <AudioButton
                  audioKey={item.id}
                  text={item.zh}
                  slow={progress.settings.slowAudio}
                />
              </>
            )}
          </div>
          <div className="answer-options">
            {question.options.map((option, i) => {
              const correct = !!choice && option.id === item.id;
              const wrong = choice === option.id && !correct;
              return (
                <button
                  key={option.id}
                  className={`answer-option ${correct ? "correct" : ""} ${wrong ? "incorrect" : ""}`}
                  disabled={!!choice}
                  onClick={() => {
                    stop();
                    setChoice(option.id);
                    const isCorrect = option.id === item.id;
                    if (isCorrect) setScore(score + 1);
                    onAnswer(item.id, isCorrect);
                  }}
                >
                  <span className="option-letter">
                    {correct ? (
                      <Check size={17} />
                    ) : wrong ? (
                      <X size={17} />
                    ) : (
                      "ABCD"[i]
                    )}
                  </span>
                  <span
                    lang={mode === "context" ? "zh-CN" : "vi"}
                    className={mode === "context" ? "chinese-option" : ""}
                  >
                    {mode === "context" ? option.zh : option.meaning}
                  </span>
                </button>
              );
            })}
          </div>
          {choice && (
            <div className="answer-feedback" role="status">
              <div>
                <h3>
                  {choice === item.id ? (
                    <>
                      <CheckCircle2 size={18} />
                      Chính xác, bạn nhớ tốt đấy!
                    </>
                  ) : (
                    <>
                      <Lightbulb size={18} />
                      Thêm một điều để nhớ.
                    </>
                  )}
                </h3>
                <p>
                  <strong lang="zh-CN">{item.zh}</strong> — {item.meaning}
                </p>
                <p>{item.note}</p>
                <button className="text-button" onClick={() => onOpen(item)}>
                  Xem hội thoại <ChevronRight size={15} />
                </button>
              </div>
              <button
                className="button button-primary"
                onClick={() => {
                  stop();
                  setIndex(index + 1);
                  setChoice(null);
                }}
              >
                {index + 1 === questions.length
                  ? "Xem kết quả"
                  : "Câu tiếp theo"}
                <ArrowRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
