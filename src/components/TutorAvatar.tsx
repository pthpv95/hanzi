"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { TutorPhase } from "./useLiveTutor";

type Props = {
  phase: TutorPhase;
  speaking: boolean;
  muted: boolean;
  level: number;
  outputLevel: number;
};

const labels = {
  idle: "Sẵn sàng cùng bạn",
  connecting: "Đang kết nối…",
  speaking: "Đang nói",
  listening: "Đang lắng nghe",
  muted: "Micro của bạn đang tắt",
  ended: "Hẹn gặp lại nhé",
  error: "Mình thử kết nối lại nhé",
};

export function TutorAvatar({ phase, speaking, muted, level, outputLevel }: Props) {
  const [wave, setWave] = useState(0);
  const greetingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const state = phase === "live"
    ? speaking ? "speaking" : muted ? "muted" : "listening"
    : phase;
  const mouth = state === "speaking" ? Math.min(1, Math.max(0, outputLevel)) : 0;
  const hearing = state === "listening" && level > 0.07;

  useEffect(() => () => {
    if (greetingTimer.current) clearTimeout(greetingTimer.current);
  }, []);

  function greet() {
    if (greetingTimer.current) clearTimeout(greetingTimer.current);
    setWave((previous) => previous + 1);
    greetingTimer.current = setTimeout(() => setWave(0), 2400);
  }

  return (
    <div
      className="tutor-avatar"
      data-state={state}
      data-hearing={hearing}
      data-waving={wave > 0}
      style={{ "--mouth-open": mouth } as CSSProperties}
    >
      <div className="avatar-greeting" role="status" aria-live="polite">
        {wave > 0 && <><strong lang="zh-CN">你好！</strong><span>Chào bạn, mình là Tiểu Lâm.</span></>}
      </div>
      <button
        type="button"
        className="avatar-button"
        aria-label="Chào Tiểu Lâm — vẫy tay"
        onClick={greet}
      >
        <svg className="avatar-portrait" viewBox="0 0 220 216" fill="none" aria-hidden="true">
          <circle className="avatar-halo" cx="110" cy="102" r="86" />
          <circle className="avatar-orbit" cx="110" cy="102" r="94" />
          <path className="avatar-sprig" d="M29 126Q16 103 26 82M23 101Q9 94 16 85Q28 87 23 101ZM24 92Q24 78 35 77Q40 88 24 92Z" />
          <path className="avatar-spark" d="M184 46V58M178 52H190M39 55V63M35 59H43" />
          <ellipse className="avatar-shadow" cx="110" cy="204" rx="64" ry="6" />
          <g className="avatar-body">
            <path className="avatar-hair" d="M65 91C51 48 78 23 109 23C146 20 167 53 151 104L147 146Q108 163 69 143Z" />
            <path className="avatar-shirt" d="M44 203L48 175Q52 151 92 145H123Q164 149 170 176L176 203Z" />
            <path className="avatar-sleeve-seam" d="M67 174L62 203M153 173L160 203" />
            <path className="avatar-neck" d="M93 124H121V146Q108 160 93 146Z" />
            <path className="avatar-collar" d="M84 146L96 161L108 155L120 161L132 147" />
            <path className="avatar-shirt-detail" d="M108 156V203" />
            <circle className="avatar-button-detail" cx="114" cy="174" r="1.5" />
            <circle className="avatar-button-detail" cx="114" cy="188" r="1.5" />
            <path className="avatar-pin" d="M79 178Q68 167 73 163Q85 161 79 178ZM79 178L83 166" />
            <g className="avatar-head">
              <ellipse className="avatar-skin" cx="72" cy="97" rx="8" ry="11" />
              <ellipse className="avatar-skin" cx="143" cy="97" rx="8" ry="11" />
              <path className="avatar-ear-detail" d="M69 94L73 100M146 94L142 100" />
              <path className="avatar-skin" d="M72 77Q73 47 108 46Q142 46 144 78L141 107Q136 135 108 139Q80 135 74 108Z" />
              <path className="avatar-hair" d="M65 86C61 55 78 29 107 29C138 25 157 50 150 88L142 92L137 68Q116 72 104 53Q98 72 79 76L74 92Z" />
              <path className="avatar-hair-shine" d="M80 52Q89 39 104 39M119 40Q132 42 138 51" />
              <g className="avatar-brows">
                <path d="M83 87Q89 84 95 87M120 87Q126 84 132 87" />
              </g>
              <g className="avatar-eyes">
                <ellipse className="avatar-eye" cx="90" cy="98" rx="3.1" ry="4.3" />
                <ellipse className="avatar-eye" cx="126" cy="98" rx="3.1" ry="4.3" />
                <circle className="avatar-eye-glint" cx="91" cy="96.5" r="0.9" />
                <circle className="avatar-eye-glint" cx="127" cy="96.5" r="0.9" />
              </g>
              <g className="avatar-happy-eyes">
                <path d="M85 99Q90 93 95 99M121 99Q126 93 131 99" />
              </g>
              <ellipse className="avatar-blush" cx="84" cy="110" rx="8" ry="4" />
              <ellipse className="avatar-blush" cx="132" cy="110" rx="8" ry="4" />
              <path className="avatar-nose" d="M108 100L106 108H110" />
              <path className="avatar-smile" d="M99 117Q108 125 117 117" />
              <g className="avatar-mouth">
                <ellipse className="avatar-mouth-inside" cx="108" cy="119" rx="6" ry="7" />
                <path className="avatar-tongue" d="M104 122Q108 119 112 122" />
              </g>
            </g>
            {wave > 0 && (
              <g key={wave} className="avatar-wave-arm">
                <path className="avatar-shirt" d="M150 168L173 134L194 141L181 181Q173 193 162 183Z" />
                <path className="avatar-skin" d="M174 138C169 132 167 123 168 114Q169 111 171 114L176 123L172 103Q171 98 175 98Q177 98 178 102L181 114L179 96Q179 92 182 93Q184 93 185 97L187 113L188 100Q189 96 192 98Q194 99 193 103L193 121Q199 111 202 115Q204 117 200 124L193 141Z" />
                <path className="avatar-cuff" d="M173 138L191 144" />
                <path className="avatar-palm" d="M179 126Q186 123 189 129" />
              </g>
            )}
          </g>
        </svg>
        <span className="avatar-status"><span />{labels[state]}</span>
      </button>
      <span className="avatar-hint">Chạm để chào</span>
    </div>
  );
}
