"use client";

import { ArrowUpRight, Bookmark, Check } from "lucide-react";
import { levels, topics } from "@/data/expressions";
import type { Expression } from "@/lib/types";
import { AudioButton } from "./AudioProvider";

interface Props {
  item: Expression;
  saved: boolean;
  learned: boolean;
  showPinyin: boolean;
  slowAudio: boolean;
  onOpen: (item: Expression) => void;
  onSave: (id: string) => void;
}

export function ExpressionCard({
  item,
  saved,
  learned,
  showPinyin,
  slowAudio,
  onOpen,
  onSave,
}: Props) {
  const topic = topics.find((t) => t.id === item.topic)!;
  return (
    <article className="expression-card">
      <div className="card-topline">
        <span className={`level-tag level-${item.level}`}>
          <span />
          {levels[item.level]}
        </span>
        <button
          className={`icon-button bookmark-button ${saved ? "saved" : ""}`}
          aria-label={`${saved ? "Bỏ lưu" : "Lưu"}: ${item.zh}`}
          aria-pressed={saved}
          onClick={() => onSave(item.id)}
        >
          <Bookmark size={18} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <button className="expression-open" onClick={() => onOpen(item)}>
        <h3 lang="zh-CN">{item.zh}</h3>
        {showPinyin && <p className="pinyin">{item.pinyin}</p>}
        <p className="expression-meaning">{item.meaning}</p>
        <span className="card-context">{item.context}</span>
      </button>
      <div className="card-bottom">
        <span className="card-topic">
          {learned ? (
            <>
              <Check size={13} /> Đã học
            </>
          ) : (
            <>
              <span className={`topic-dot ${topic.color}`} />
              {topic.label}
            </>
          )}
        </span>
        <div className="card-actions">
          <AudioButton audioKey={item.id} text={item.zh} slow={slowAudio} />
          <button
            className="icon-button detail-arrow"
            aria-label={`Xem chi tiết: ${item.zh}`}
            onClick={() => onOpen(item)}
          >
            <ArrowUpRight size={18} />
          </button>
        </div>
      </div>
    </article>
  );
}
