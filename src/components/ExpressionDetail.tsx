"use client";

import {
  Bookmark,
  Check,
  CheckCheck,
  Lightbulb,
  MessageCircle,
  ArrowRight,
} from "lucide-react";
import type { Expression, Progress } from "@/lib/types";
import { expressions, levels, topics } from "@/data/expressions";
import { todayKey } from "@/lib/learning";
import { AudioButton } from "./AudioProvider";
import { Dialog } from "./Dialog";

export function ExpressionDetail({
  item,
  progress,
  onClose,
  onSave,
  onStudy,
  onOpen,
}: {
  item: Expression;
  progress: Progress;
  onClose: () => void;
  onSave: (id: string) => void;
  onStudy: (id: string) => void;
  onOpen: (item: Expression) => void;
}) {
  const saved = progress.bookmarks.includes(item.id);
  const studied = progress.activity[todayKey()]?.includes(item.id);
  const topic = topics.find((t) => t.id === item.topic)!;
  return (
    <Dialog
      title={`Học cách nói: ${item.zh}`}
      onClose={onClose}
      className="expression-dialog"
    >
      <div className="detail-heading">
        <span className={`level-tag level-${item.level}`}>
          <span />
          {levels[item.level]}
        </span>
        <span className="muted">{topic.label}</span>
      </div>
      <div className="detail-title">
        <h2 lang="zh-CN">{item.zh}</h2>
        <AudioButton
          audioKey={item.id}
          text={item.zh}
          slow={progress.settings.slowAudio}
        />
      </div>
      {progress.settings.showPinyin && (
        <p className="pinyin detail-pinyin">{item.pinyin}</p>
      )}
      <h3 className="detail-meaning">{item.meaning}</h3>
      <p className="detail-context">{item.context}</p>
      <div className="detail-controls">
        <AudioButton
          audioKey={item.id}
          text={item.zh}
          slow
          label="Nghe chậm · 0.75×"
        />
        <button
          className={`button button-ghost ${saved ? "saved" : ""}`}
          onClick={() => onSave(item.id)}
        >
          <Bookmark size={16} fill={saved ? "currentColor" : "none"} />
          {saved ? "Đã lưu" : "Lưu cụm từ"}
        </button>
      </div>
      <section className="dialogue-section">
        <h4>
          <MessageCircle size={17} /> Đặt vào cuộc trò chuyện
        </h4>
        <div className="dialogue-lines">
          {item.dialogue.map((line, i) => (
            <div
              className={`dialogue-line speaker-${i % 2}`}
              key={`${item.id}-${i}`}
            >
              <span className="speaker-avatar">{i % 2 === 0 ? "A" : "B"}</span>
              <div className="dialogue-copy">
                <p lang="zh-CN">{line.zh}</p>
                {progress.settings.showPinyin && (
                  <p className="pinyin">{line.pinyin}</p>
                )}
                <p className="dialogue-vi">{line.vi}</p>
              </div>
              <AudioButton
                audioKey={`${item.id}-${i}`}
                text={line.zh}
                slow={progress.settings.slowAudio}
              />
            </div>
          ))}
        </div>
      </section>
      <section className="usage-note">
        <h4>
          <Lightbulb size={17} /> Nói sao cho tự nhiên?
        </h4>
        <p>{item.note}</p>
      </section>
      <button
        className={`button button-primary detail-study ${studied ? "completed-button" : ""}`}
        onClick={() => onStudy(item.id)}
        disabled={studied}
      >
        {studied ? <CheckCheck size={18} /> : <Check size={18} />}
        {studied ? "Đã học hôm nay" : "Mình đã học cụm này"}
      </button>
      <div className="related-section">
        <h4>Thử thêm một cách nói</h4>
        {expressions
          .filter((e) => e.topic === item.topic && e.id !== item.id)
          .slice(0, 2)
          .map((e) => (
            <button
              key={e.id}
              className="related-expression"
              onClick={() => onOpen(e)}
            >
              <span lang="zh-CN">{e.zh}</span>
              <span>{e.meaning}</span>
              <ArrowRight size={16} />
            </button>
          ))}
      </div>
    </Dialog>
  );
}
