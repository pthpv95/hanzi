"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  Bookmark,
  Check,
  ChevronDown,
  Clock3,
  Download,
  Headphones,
  Languages,
  Leaf,
  Lightbulb,
  LoaderCircle,
  LockKeyhole,
  MessageCircle,
  Mic,
  MicOff,
  PhoneOff,
  Play,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Wallet,
  X,
} from "lucide-react";
import { lessonPhrases, scenarios, type Lesson } from "@/lib/tutor";
import { useLiveTutor } from "./useLiveTutor";
import { Dialog } from "./Dialog";
import { TutorAvatar } from "./TutorAvatar";

type ConnectionState = "loading" | "ready" | "unconfigured" | "failed";
const formatTime = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

export function ClassroomView({
  bookmarks,
  onSave,
}: {
  bookmarks: string[];
  onSave: (id: string) => void;
}) {
  const [scenario, setScenario] = useState("food");
  const [minutes, setMinutes] = useState<5 | 10>(10);
  const [accessCode, setAccessCode] = useState("");
  const [connection, setConnection] = useState<ConnectionState>("loading");
  const [setupOpen, setSetupOpen] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [text, setText] = useState("");
  const [showCaptions, setShowCaptions] = useState(true);
  const tutor = useLiveTutor();
  const transcript = useRef<HTMLDivElement>(null);
  const scene = scenarios.find((s) => s.id === scenario)!;
  const phrases = lessonPhrases(scenario);
  const busy = tutor.phase === "live" || tutor.phase === "connecting";
  const hasConversation = tutor.captions.length > 0;
  const complete = tutor.phase === "ended" || tutor.phase === "error";
  const phaseTitle =
    tutor.phase === "connecting"
      ? "Đang mở một cuộc trò chuyện…"
      : tutor.phase === "live"
        ? tutor.speaking
          ? "Tiểu Lâm đang nói…"
          : tutor.muted
            ? "Micro đang tắt."
            : "Đến lượt bạn. Cứ từ từ nhé."
        : complete
          ? "Một chút luyện tập, một bước tự tin."
          : "Cứ mạnh dạn nói. Mình cùng học.";

  async function checkConnection() {
    setConnection("loading");
    try {
      const response = await fetch("/api/tutor/session", { cache: "no-store" });
      if (!response.ok) throw new Error();
      const result = await response.json();
      setConnection(result.configured ? "ready" : "unconfigured");
    } catch {
      setConnection("failed");
    }
  }
  useEffect(() => {
    let alive = true;
    void fetch("/api/tutor/session", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error();
        const value = await response.json();
        if (alive) setConnection(value.configured ? "ready" : "unconfigured");
      })
      .catch(() => {
        if (alive) setConnection("failed");
      });
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    const panel = transcript.current;
    if (
      panel &&
      panel.scrollHeight - panel.scrollTop - panel.clientHeight < 150
    )
      panel.scrollTo({ top: panel.scrollHeight, behavior: "smooth" });
  }, [tutor.captions]);

  function start() {
    if (!accessCode.trim()) {
      setCodeError("Nhập mã lớp học để bắt đầu nhé.");
      return;
    }
    setCodeError("");
    void tutor.start({ scenario, minutes }, accessCode.trim());
  }
  function download() {
    const lines = [
      `HANZI · LỚP HỌC CÙNG TIỂU LÂM`,
      scene.title,
      `${new Date().toLocaleString("vi-VN")} · ${formatTime(tutor.elapsed)}`,
      `Chi phí mô hình ước tính: $${tutor.cost.toFixed(3)} (không phải hóa đơn)`,
      "",
      ...tutor.captions.map(
        (line) =>
          `${line.role === "user" ? "Bạn" : "Tiểu Lâm"}: ${line.text}${line.interrupted ? " [đã ngắt]" : ""}`,
      ),
      "",
      "GHI CHÚ CỦA GIA SƯ",
      ...tutor.feedback.map(
        (note) =>
          `${note.original} → ${note.corrected}\n${note.pinyin}\n${note.meaning}\n${note.explanation}`,
      ),
    ];
    const url = URL.createObjectURL(
      new Blob([lines.join("\n\n")], { type: "text/plain;charset=utf-8" }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `hanzi-hoi-thoai-${new Date().toISOString().slice(0, 10)}.txt`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <div className="classroom-view view-enter">
      <div className="classroom-intro">
        <div>
          <p className="eyebrow">
            <span className="eyebrow-line" />
            MỘT NGƯỜI BẠN ĐỂ CÙNG LUYỆN NÓI
          </p>
          <h1>Ở đây, cứ mạnh dạn nói.</h1>
          <p>
            Trò chuyện bằng tiếng Trung. Khi cần, hỏi bằng tiếng Việt.
            <br className="desktop-break" /> Tiểu Lâm sẽ lắng nghe và cùng bạn
            luyện từng chút một.
          </p>
        </div>
      </div>

      {connection !== "ready" && (
        <div
          className={`connection-notice ${connection === "loading" ? "checking" : ""}`}
          role="status"
        >
          <span className="connection-notice-icon">
            {connection === "loading" ? (
              <LoaderCircle size={19} className="spin" />
            ) : (
              <Headphones size={19} />
            )}
          </span>
          <div>
            <strong>
              {connection === "loading"
                ? "Đang kiểm tra lớp học…"
                : connection === "failed"
                  ? "Chưa kiểm tra được kết nối"
                  : "Không gian đã sẵn sàng. Gia sư cần được kết nối."}
            </strong>
            {connection !== "loading" && (
              <p>
                {connection === "failed"
                  ? "Bạn kiểm tra mạng và thử lại nhé."
                  : "Chủ lớp cần hoàn tất kết nối gia sư trước khi bắt đầu buổi học đầu tiên."}
              </p>
            )}
          </div>
          {/* {connection !== "loading" && (
            <>
              <button
                className="text-button"
                onClick={() => setSetupOpen(true)}
              >
                Hướng dẫn kết nối <ArrowRight size={15} />
              </button>
              <button
                className="icon-button"
                onClick={checkConnection}
                aria-label="Kiểm tra lại kết nối"
              >
                <RefreshCw size={17} />
              </button>
            </>
          )} */}
        </div>
      )}

      <section
        className="lesson-selection"
        aria-label="Chọn tình huống luyện nói"
      >
        <div className="classroom-section-heading">
          <span className="overline">HÔM NAY, MÌNH NÓI VỀ ĐIỀU GÌ?</span>
          <span className="muted">Chọn một tình huống quen thuộc</span>
        </div>
        <div className="scenario-grid">
          {scenarios.map((item) => (
            <button
              key={item.id}
              className={`scenario-card ${scenario === item.id ? "selected" : ""}`}
              aria-pressed={scenario === item.id}
              disabled={busy}
              onClick={() => {
                if (complete) tutor.reset();
                setScenario(item.id);
              }}
            >
              <span className={`scenario-hanzi ${item.color}`} lang="zh-CN">
                {item.hanzi}
              </span>
              <span>
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
              </span>
              {scenario === item.id && (
                <span className="scenario-check">
                  <Check size={11} />
                </span>
              )}
            </button>
          ))}
        </div>
      </section>

      <div className="classroom-grid">
        <section
          className={`voice-classroom ${tutor.phase === "live" ? "is-live" : ""}`}
          aria-label="Phòng luyện nói"
        >
          <div className="classroom-stage-header">
            <span className="tutor-identity">
              <span
                className={`connection-dot ${tutor.phase === "live" ? "live" : ""}`}
              />
              TIỂU LÂM <span className="ai-label">GIA SƯ AI</span>
            </span>
            <span className="classroom-live-label">
              {tutor.phase === "live"
                ? "ĐANG TRỰC TIẾP"
                : tutor.phase === "connecting"
                  ? "ĐANG KẾT NỐI"
                  : complete
                    ? "ĐÃ KẾT THÚC"
                    : "LUYỆN NÓI 1:1"}
            </span>
          </div>
          <div className="voice-stage">
            <TutorAvatar
              phase={tutor.phase}
              speaking={tutor.speaking}
              muted={tutor.muted}
              level={tutor.level}
              outputLevel={tutor.outputLevel}
            />
            <p className="tutor-name">
              小林 <span>Xiǎolín · Tiểu Lâm</span>
            </p>
            <h2 aria-live="polite">{phaseTitle}</h2>
            <p className="voice-stage-description">
              {tutor.phase === "live"
                ? "Bạn có thể nói xen vào bất cứ lúc nào."
                : complete
                  ? "Những câu đã nói và ghi chú vẫn ở bên dưới."
                  : "Không cần nói hoàn hảo. Chỉ cần bắt đầu một câu."}
            </p>
            <div
              className={`voice-wave ${tutor.speaking ? "tutor-speaking" : ""}`}
              aria-label={busy ? "Mức âm thanh micro" : "Chưa thu âm"}
            >
              {Array.from({ length: 23 }, (_, i) => (
                <span
                  key={i}
                  style={{
                    height: `${busy ? 5 + (tutor.speaking ? 18 : tutor.muted ? 0 : tutor.level * 34) * (0.3 + Math.abs(Math.sin(i * 1.8)) * 0.7) : 4 + Math.abs(Math.sin(i * 0.7)) * 4}px`,
                    animationDelay: `${i * 0.07}s`,
                  }}
                />
              ))}
            </div>
          </div>
          <section className="transcript-section">
            <div className="transcript-header">
              <div>
                <MessageCircle size={17} />
                <h2>Những điều mình vừa nói.</h2>
                <span className="transcript-badge">PHỤ ĐỀ TRỰC TIẾP</span>
              </div>
              <div>
                {hasConversation && (
                  <button
                    className="icon-button"
                    aria-label="Tải hội thoại"
                    onClick={download}
                  >
                    <Download size={17} />
                  </button>
                )}
                <button
                  className="subtle-link"
                  onClick={() => setShowCaptions(!showCaptions)}
                >
                  {showCaptions ? "Ẩn phụ đề" : "Hiện phụ đề"}
                </button>
              </div>
            </div>
            {showCaptions && (
              <>
                <div
                  className="classroom-transcript"
                  ref={transcript}
                  role="log"
                  aria-label="Hội thoại trực tiếp"
                  aria-live="polite"
                  aria-relevant="additions"
                >
                  {!hasConversation ? (
                    <div className="transcript-empty">
                      <span>
                        <MessageCircle size={25} strokeWidth={1.4} />
                      </span>
                      <h3>Mỗi cuộc trò chuyện đều bắt đầu bằng một câu.</h3>
                      <p>
                        Phụ đề của bạn và Tiểu Lâm sẽ xuất hiện ở đây khi buổi học
                        bắt đầu.
                      </p>
                      <small>Phụ đề có thể được sửa lại khi bạn nói xong.</small>
                    </div>
                  ) : (
                    tutor.captions.map((line) => (
                      <div
                        className={`caption-line caption-${line.role} ${!line.final ? "partial" : ""}`}
                        key={line.id}
                      >
                        <span className="caption-avatar">
                          {line.role === "tutor" ? "林" : "B"}
                        </span>
                        <div>
                          <span className="caption-name">
                            {line.role === "tutor" ? "Tiểu Lâm" : "Bạn"}
                            {!line.final && <small>đang nói…</small>}
                            {line.interrupted && (
                              <small>
                                đã ngắt · phần chữ có thể chưa được đọc hết
                              </small>
                            )}
                          </span>
                          <p>{line.text}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <form
                  className="classroom-text-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    tutor.sendText(text);
                    setText("");
                  }}
                >
                  <input
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    aria-label="Nhắn cho gia sư"
                    placeholder="Hoặc gõ một câu tiếng Trung, tiếng Việt…"
                    maxLength={500}
                    disabled={tutor.phase !== "live"}
                  />
                  <button
                    type="submit"
                    className="icon-button"
                    disabled={tutor.phase !== "live" || !text.trim()}
                    aria-label="Gửi tin nhắn"
                  >
                    <Send size={17} />
                  </button>
                </form>
              </>
            )}
          </section>
          {tutor.error && (
            <div className="classroom-error" role="alert">
              <Lightbulb size={17} />
              <p>{tutor.error}</p>
            </div>
          )}
          {complete && (
            <div className="lesson-finished-message">
              <Check size={16} />
              <p>
                {tutor.endReason === "budget"
                  ? "Mình tạm dừng buổi học tại đây. Bạn có thể xem lại hội thoại và tiếp tục vào lượt sau."
                  : tutor.endReason === "time"
                    ? "Đã hết thời gian của lượt học. Nghỉ một chút rồi gặp lại nhé."
                    : tutor.phase === "error"
                      ? "Micro đã tắt và kết nối đã đóng."
                      : "Buổi học đã kết thúc. Micro đã tắt và kết nối đã đóng."}
              </p>
            </div>
          )}
          <div className="voice-controls">
            {busy ? (
              <>
                <button
                  className={`mic-control ${tutor.muted ? "muted" : ""}`}
                  disabled={tutor.phase !== "live"}
                  aria-label={tutor.muted ? "Bật micro" : "Tắt micro"}
                  aria-pressed={tutor.muted}
                  onClick={tutor.toggleMute}
                >
                  {tutor.muted ? <MicOff size={19} /> : <Mic size={19} />}
                </button>
                <button
                  className="button end-call-button"
                  onClick={() => tutor.end()}
                >
                  <PhoneOff size={17} />
                  {tutor.phase === "connecting"
                    ? "Hủy kết nối"
                    : "Kết thúc buổi học"}
                </button>
                <span className="classroom-timer">
                  <Clock3 size={15} />
                  {formatTime(tutor.elapsed)}
                  <small>/ {minutes}:00</small>
                </span>
              </>
            ) : (
              <>
                <div
                  className="duration-picker"
                  aria-label="Thời lượng buổi học"
                >
                  {([5, 10] as const).map((duration) => (
                    <button
                      key={duration}
                      aria-pressed={minutes === duration}
                      className={minutes === duration ? "selected" : ""}
                      onClick={() => setMinutes(duration)}
                    >
                      {duration} phút
                    </button>
                  ))}
                </div>
                <button
                  className="button button-primary join-classroom"
                  disabled={connection !== "ready"}
                  onClick={start}
                >
                  {connection === "loading" ? (
                    <LoaderCircle size={17} className="spin" />
                  ) : (
                    <Mic size={17} />
                  )}
                  {complete ? "Bắt đầu lượt mới" : "Vào lớp trò chuyện"}
                  <ArrowRight size={16} />
                </button>
              </>
            )}
          </div>
          {!busy && connection === "ready" && (
            <div className="classroom-code">
              <LockKeyhole size={15} />
              <input
                type="password"
                value={accessCode}
                onChange={(event) => {
                  setAccessCode(event.target.value);
                  setCodeError("");
                }}
                maxLength={200}
                placeholder="Nhập mã lớp học"
                aria-label="Mã lớp học"
                autoComplete="off"
              />
              {codeError && <span role="alert">{codeError}</span>}
            </div>
          )}
          <p className="classroom-privacy">
            <ShieldCheck size={13} />
            {busy
              ? "Tắt micro không kết thúc buổi học. Chọn “Kết thúc” để đóng kết nối."
              : "Khi vào lớp, âm thanh được gửi tới Google. Hanzi không lưu bản ghi âm."}
          </p>
          <div className="classroom-shortcuts">
            <span>KHI CẦN MỘT CHÚT TRỢ GIÚP</span>
            <div>
              <button
                disabled={tutor.phase !== "live"}
                onClick={() => tutor.sendText("请说慢一点。")}
              >
                <AudioLines size={14} />
                Nói chậm hơn
              </button>
              <button
                disabled={tutor.phase !== "live"}
                onClick={() => tutor.sendText("请再说一遍。")}
              >
                <RefreshCw size={13} />
                Nói lại nhé
              </button>
              <button
                disabled={tutor.phase !== "live"}
                onClick={() =>
                  tutor.sendText(
                    "Giải thích câu vừa rồi bằng tiếng Việt giúp mình nhé.",
                  )
                }
              >
                <Languages size={14} />
                Giải thích tiếng Việt
              </button>
            </div>
          </div>
        </section>

        <aside className="classroom-notebook">
          <section className="lesson-phrase-card">
            <p className="overline">MANG THEO VÀO CUỘC TRÒ CHUYỆN</p>
            <h2>Ba cách nói để thử.</h2>
            <p className="notebook-description">
              Không cần thuộc trước. Cứ nhìn khi bạn cần.
            </p>
            {phrases.map((item) => (
              <div className="classroom-phrase" key={item.id}>
                <div>
                  <h3 lang="zh-CN">{item.zh}</h3>
                  <p className="pinyin">{item.pinyin}</p>
                  <p>{item.meaning}</p>
                </div>
                <button
                  className={`icon-button ${bookmarks.includes(item.id) ? "saved" : ""}`}
                  aria-label={`${bookmarks.includes(item.id) ? "Bỏ lưu" : "Lưu"}: ${item.zh}`}
                  aria-pressed={bookmarks.includes(item.id)}
                  onClick={() => onSave(item.id)}
                >
                  <Bookmark
                    size={17}
                    fill={bookmarks.includes(item.id) ? "currentColor" : "none"}
                  />
                </button>
              </div>
            ))}
          </section>
          <section className="tutor-feedback">
            <div className="feedback-heading">
              <Lightbulb size={17} />
              <h2>Ghi chú của Tiểu Lâm</h2>
            </div>
            {!tutor.feedback.length ? (
              <div className="feedback-empty">
                <span className="feedback-flower">✳</span>
                <p>
                  Một cách nói tự nhiên hơn,
                  <br />
                  một điều nhỏ để nhớ.
                </p>
                <small>
                  Khi có điều cần sửa, gia sư sẽ ghi lại ở đây. Không chấm điểm
                  phát âm chỉ từ bản chép lời.
                </small>
              </div>
            ) : (
              <div className="feedback-notes">
                {tutor.feedback.map((note) => (
                  <article key={note.id} className="feedback-note">
                    <p className="original-sentence">{note.original}</p>
                    <h3 lang="zh-CN">{note.corrected}</h3>
                    <p className="pinyin">{note.pinyin}</p>
                    <p className="feedback-meaning">{note.meaning}</p>
                    <p className="feedback-explanation">{note.explanation}</p>
                  </article>
                ))}
              </div>
            )}
          </section>
        </aside>
      </div>

      <p className="classroom-bottom-note">
        <Leaf size={14} />
        Nói chậm một chút cũng được. Nghĩ lâu một chút cũng được. Mỗi câu đều là
        một bước tiến.
      </p>

      {setupOpen && (
        <Dialog
          title="Kết nối gia sư AI"
          onClose={() => setSetupOpen(false)}
          className="tutor-setup-dialog"
        >
          <span className="dialog-eyebrow">
            <Headphones size={17} />
            DÀNH CHO CHỦ LỚP
          </span>
          <h2>Kết nối Tiểu Lâm</h2>
          <p className="dialog-description">
            Lớp học dùng Gemini Live. Chủ lớp cấu hình một lần; người học chỉ
            cần mã lớp học.
          </p>
          <ol className="setup-steps">
            <li>
              Tạo API key có quyền truy cập Gemini Live và bật thanh toán tại{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noreferrer"
              >
                Google AI Studio ↗
              </a>
              .
            </li>
            <li>
              Trong tệp <code>.env.local</code> của dự án, thêm{" "}
              <code>GEMINI_API_KEY</code> và <code>TUTOR_ACCESS_CODE</code> (ít
              nhất 12 ký tự). Giữ API key trên máy chủ.
            </li>
            <li>
              Khởi động lại máy chủ, rồi chọn “Kiểm tra lại kết nối”. Dùng mã
              lớp học để vào lớp.
            </li>
          </ol>
          <div className="setup-budget-note">
            <Wallet size={17} />
            <p>
              Mục tiêu $0.20–0.30 cho 10 phút. Cần đo các buổi học thật để kiểm
              tra mức phí; hạn mức hiển thị không phải giới hạn hóa đơn cứng của
              Google.
            </p>
          </div>
          <button
            className="button button-primary settings-done"
            onClick={() => {
              setSetupOpen(false);
              void checkConnection();
            }}
          >
            Kiểm tra lại kết nối <RefreshCw size={16} />
          </button>
        </Dialog>
      )}
    </div>
  );
}
