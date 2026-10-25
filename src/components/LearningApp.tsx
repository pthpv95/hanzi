"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  AudioLines,
  BookOpen,
  Bookmark,
  Check,
  Compass,
  Flame,
  GraduationCap,
  Headphones,
  Layers3,
  Leaf,
  Menu,
  Moon,
  Search,
  Settings2,
  Sparkles,
  Sun,
  Target,
  X,
} from "lucide-react";
import { expressions } from "@/data/expressions";
import {
  buildPractice,
  createProgress,
  getStreak,
  getStudyQueue,
  gradeReview,
  parseProgress,
  recordStudy,
  STORAGE_KEY,
  todayKey,
  type PracticeQuestion,
} from "@/lib/learning";
import type {
  Expression,
  Filters,
  Progress,
  Rating,
  TopicId,
  View,
} from "@/lib/types";
import { AudioProvider, useAudio } from "./AudioProvider";
import { Dialog } from "./Dialog";
import { HomeView } from "./HomeView";
import { ExploreView } from "./ExploreView";
import { ExpressionDetail } from "./ExpressionDetail";
import { FlashcardsView, PracticeView } from "./StudyViews";
import { ClassroomView } from "./ClassroomView";

const navItems = [
  { id: "home" as const, label: "Học mỗi ngày", icon: BookOpen },
  { id: "explore" as const, label: "Khám phá", icon: Compass },
  { id: "flashcards" as const, label: "Thẻ ghi nhớ", icon: Layers3 },
  { id: "practice" as const, label: "Luyện tập", icon: Headphones },
  { id: "classroom" as const, label: "Lớp học AI", icon: AudioLines },
  { id: "saved" as const, label: "Đã lưu", icon: Bookmark },
];

export function LearningApp({ initialDay }: { initialDay: string }) {
  const [toast, setToast] = useState("");
  const notify = useCallback((message: string) => setToast(message), []);
  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(""), 3600);
    return () => clearTimeout(timeout);
  }, [toast]);
  return (
    <AudioProvider onError={notify}>
      <Workspace initialDay={initialDay} notify={notify} />
      <div
        className={`toast ${toast ? "visible" : ""}`}
        role="status"
        aria-live="polite"
      >
        {toast && (
          <>
            <Check size={16} />
            <span>{toast}</span>
          </>
        )}
      </div>
    </AudioProvider>
  );
}

function Workspace({
  notify,
  initialDay,
}: {
  notify: (message: string) => void;
  initialDay: string;
}) {
  const [progress, setProgress] = useState<Progress>(createProgress);
  const progressRef = useRef(progress);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState<View>("home");
  const [filters, setFilters] = useState<Filters>({
    query: "",
    topic: "all",
    level: "all",
  });
  const [selected, setSelected] = useState<Expression | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [session, setSession] = useState<Expression[]>([]);
  const [studyKey, setStudyKey] = useState(0);
  const [questions, setQuestions] = useState<PracticeQuestion[]>([]);
  const [clock, setClock] = useState(0);
  const [day, setDay] = useState(initialDay);
  const searchRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const sidebarRef = useRef<HTMLElement>(null);
  const { stop } = useAudio();
  const today = day;
  const studiedToday = progress.activity[today]?.length || 0;
  const dueCount = Object.values(progress.reviews).filter(
    (r) => r.due <= (clock || Date.now()),
  ).length;
  const streak = getStreak(progress.activity, today);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => {
      setIsMobile(media.matches);
      if (!media.matches) setMobileNav(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!mobileNav) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    sidebarRef.current
      ?.querySelector<HTMLButtonElement>(".mobile-close")
      ?.focus();
    return () => {
      document.body.style.overflow = previousOverflow;
      menuRef.current?.focus();
    };
  }, [mobileNav]);

  useEffect(() => {
    let loaded = createProgress();
    try {
      loaded = parseProgress(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      /* Browser privacy mode: study still works for this session. */
    }
    setProgress(loaded);
    progressRef.current = loaded;
    setSession(
      getStudyQueue(expressions, loaded).slice(0, loaded.settings.dailyGoal),
    );
    setQuestions(buildPractice(expressions));
    setReady(true);
    setDay(todayKey());
    function readHash() {
      const id = window.location.hash.slice(1);
      if (!id || navItems.some((item) => item.id === id)) {
        if (id === "flashcards") {
          const current = progressRef.current;
          setSession(
            getStudyQueue(expressions, current).slice(
              0,
              current.settings.dailyGoal,
            ),
          );
          setStudyKey((key) => key + 1);
        }
        setView((id || "home") as View);
        setMobileNav(false);
        stop();
      }
    }
    readHash();
    window.addEventListener("hashchange", readHash);
    const interval = setInterval(() => {
      setClock(Date.now());
      setDay(todayKey());
    }, 60_000);
    function keyboard(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileNav(false);
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", keyboard);
    return () => {
      window.removeEventListener("hashchange", readHash);
      window.removeEventListener("keydown", keyboard);
      clearInterval(interval);
    };
  }, [stop]);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.dataset.theme = progress.settings.theme;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch {
      notify(
        "Trình duyệt chưa cho phép lưu tiến độ. Bạn vẫn có thể học trong phiên này.",
      );
    }
  }, [progress, ready, notify]);

  function navigate(next: View) {
    stop();
    setView(next);
    setMobileNav(false);
    if (next !== view) window.scrollTo({ top: 0, behavior: "instant" });
    if (window.location.hash !== `#${next}`) window.location.hash = next;
  }
  function startFlashcards() {
    setSession(
      getStudyQueue(expressions, progress).slice(
        0,
        progress.settings.dailyGoal,
      ),
    );
    setStudyKey((key) => key + 1);
    navigate("flashcards");
  }
  function openExplore(topic?: TopicId) {
    setFilters({ query: "", topic: topic || "all", level: "all" });
    navigate("explore");
  }
  function search(query: string) {
    if (view === "explore" || view === "saved")
      setFilters({ ...filters, query });
    else {
      setFilters({ query, topic: "all", level: "all" });
      navigate("explore");
    }
  }
  function save(id: string) {
    setProgress((p) => ({
      ...p,
      bookmarks: p.bookmarks.includes(id)
        ? p.bookmarks.filter((s) => s !== id)
        : [...p.bookmarks, id],
    }));
  }
  function grade(id: string, rating: Rating) {
    setProgress((p) =>
      recordStudy(
        {
          ...p,
          reviews: { ...p.reviews, [id]: gradeReview(p.reviews[id], rating) },
        },
        id,
      ),
    );
    setClock(Date.now());
  }
  function open(item: Expression) {
    stop();
    setSelected(item);
  }
  function closeDetail() {
    stop();
    setSelected(null);
  }
  function updateSetting<K extends keyof Progress["settings"]>(
    key: K,
    value: Progress["settings"][K],
  ) {
    setProgress((p) => ({ ...p, settings: { ...p.settings, [key]: value } }));
  }
  const learned = Object.keys(progress.reviews).length;

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Chuyển đến nội dung
      </a>
      {mobileNav && (
        <button
          className="nav-scrim"
          aria-label="Đóng menu"
          onClick={() => setMobileNav(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        id="sidebar-nav"
        inert={isMobile && !mobileNav}
        className={`sidebar ${mobileNav ? "mobile-open" : ""}`}
        aria-label="Điều hướng chính"
      >
        <a
          href="#home"
          className="brand"
          onClick={(e) => {
            e.preventDefault();
            navigate("home");
          }}
        >
          <span className="brand-mark" lang="zh-CN">
            言
          </span>
          <span>
            <strong>
              hanzi<span className="brand-period">.</span>
            </strong>
            <small>TIẾNG TRUNG ĐỜI THƯỜNG</small>
          </span>
        </a>
        <button
          className="icon-button mobile-close"
          aria-label="Đóng menu"
          onClick={() => setMobileNav(false)}
        >
          <X size={20} />
        </button>
        <span className="nav-label">KHÔNG GIAN HỌC TẬP</span>
        <nav>
          {navItems.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`nav-item ${view === item.id ? "active" : ""}`}
              aria-current={view === item.id ? "page" : undefined}
              onClick={(e) => {
                e.preventDefault();
                if (item.id === "flashcards") startFlashcards();
                else {
                  if (item.id === "explore" || item.id === "saved")
                    setFilters({ query: "", topic: "all", level: "all" });
                  navigate(item.id);
                }
              }}
            >
              <item.icon size={19} strokeWidth={view === item.id ? 2 : 1.7} />
              <span>{item.label}</span>
              {item.id === "classroom" && (
                <span className="classroom-nav-tag">MỚI</span>
              )}
              {item.id === "flashcards" && dueCount > 0 && (
                <span className="nav-count due-count">{dueCount}</span>
              )}
              {item.id === "saved" && progress.bookmarks.length > 0 && (
                <span className="nav-count">{progress.bookmarks.length}</span>
              )}
            </a>
          ))}
        </nav>
        <div className="sidebar-learning">
          <div className="sidebar-learning-top">
            <span className="seed-icon">
              <Leaf size={18} />
            </span>
            <span>Tích nhỏ thành nhiều</span>
          </div>
          <p>
            Bạn đã học{" "}
            <strong>
              {learned}/{expressions.length}
            </strong>{" "}
            cách nói.
          </p>
          <div className="sidebar-progress-track">
            <span
              style={{ width: `${(learned / expressions.length) * 100}%` }}
            />
          </div>
          <small>Cứ đi theo nhịp của mình nhé.</small>
        </div>
        <div className="sidebar-bottom">
          <button
            className="nav-item"
            onClick={() => {
              setMobileNav(false);
              setGuideOpen(true);
            }}
          >
            <GraduationCap size={19} strokeWidth={1.7} />
            <span>Góc nhỏ cho người mới</span>
            <ArrowRight size={14} />
          </button>
          <button
            className="nav-item"
            onClick={() => {
              setMobileNav(false);
              setSettingsOpen(true);
            }}
          >
            <Settings2 size={19} strokeWidth={1.7} />
            <span>Cài đặt học tập</span>
          </button>
          <div className="sidebar-credit">
            <span className="credit-flower">✳</span>
            <span>
              Làm cho người Việt.
              <br />
              <strong>Học để gần nhau hơn.</strong>
            </span>
          </div>
        </div>
      </aside>
      <div className="app-body" inert={mobileNav}>
        <header className="topbar">
          <div className="topbar-location">
            <button
              ref={menuRef}
              className="icon-button menu-button"
              aria-label="Mở menu"
              aria-controls="sidebar-nav"
              aria-expanded={mobileNav}
              onClick={() => setMobileNav(true)}
            >
              <Menu size={22} />
            </button>
            <span className="desktop-location">
              Không gian học tập<span className="breadcrumb-slash">/</span>
              <strong>
                {navItems.find((item) => item.id === view)?.label}
              </strong>
            </span>
            <a
              className="mobile-brand"
              href="#home"
              onClick={() => navigate("home")}
            >
              hanzi<span>.</span>
            </a>
          </div>
          <div className="header-right">
            <label className="global-search">
              <Search size={17} />
              <input
                ref={searchRef}
                type="search"
                aria-label="Tìm cách nói"
                placeholder="Tìm tiếng Trung, pinyin, nghĩa Việt…"
                value={filters.query || ""}
                onChange={(e) => search(e.target.value)}
              />
              <kbd>⌘ K</kbd>
            </label>
            <div
              className={`streak-pill ${streak ? "has-streak" : ""}`}
              title="Chuỗi ngày học liên tiếp"
            >
              <Flame size={18} />
              <span>
                {streak}
                <span className="streak-day-label"> ngày</span>
              </span>
            </div>
            <button
              className="icon-button theme-button"
              aria-label={
                progress.settings.theme === "light"
                  ? "Bật giao diện tối"
                  : "Bật giao diện sáng"
              }
              onClick={() =>
                updateSetting(
                  "theme",
                  progress.settings.theme === "light" ? "dark" : "light",
                )
              }
            >
              {progress.settings.theme === "light" ? (
                <Moon size={19} />
              ) : (
                <Sun size={19} />
              )}
            </button>
            <span className="profile-avatar" title="Người học tự do">
              B
            </span>
          </div>
        </header>
        <main id="main-content" className="main-content" aria-busy={!ready}>
          {view === "classroom" && (
            <ClassroomView bookmarks={progress.bookmarks} onSave={save} />
          )}
          {view === "home" && (
            <HomeView
              day={day}
              progress={progress}
              streak={streak}
              dueCount={dueCount}
              onExplore={openExplore}
              onOpen={open}
              onSave={save}
              onStart={startFlashcards}
              onSettings={() => setSettingsOpen(true)}
            />
          )}
          {(view === "explore" || view === "saved") && (
            <ExploreView
              filters={filters}
              setFilters={setFilters}
              progress={progress}
              savedOnly={view === "saved"}
              onOpen={open}
              onSave={save}
              onExplore={() => openExplore()}
            />
          )}
          {view === "flashcards" && ready && (
            <FlashcardsView
              key={studyKey}
              session={session}
              progress={progress}
              onGrade={grade}
              onRestart={startFlashcards}
              onExplore={() => openExplore()}
            />
          )}
          {view === "practice" && ready && (
            <PracticeView
              questions={questions}
              progress={progress}
              onAnswer={(id, correct) => grade(id, correct ? "good" : "again")}
              onRestart={() => setQuestions(buildPractice(expressions))}
              onOpen={open}
            />
          )}
        </main>
        <footer className="app-footer">
          <a
            href="#home"
            onClick={(e) => {
              e.preventDefault();
              navigate("home");
            }}
          >
            hanzi.
          </a>
          <span>Mỗi ngày một chút, tiếng Trung thật gần.</span>
          <span className="footer-language">
            Tiếng Việt <span /> 简体中文
          </span>
        </footer>
      </div>
      {selected && (
        <ExpressionDetail
          item={selected}
          progress={progress}
          onClose={closeDetail}
          onOpen={open}
          onSave={save}
          onStudy={(id) => {
            grade(id, "good");
            notify("Đã ghi nhận! Cách nói này sẽ trở lại trong lịch ôn.");
          }}
        />
      )}
      {settingsOpen && (
        <Dialog
          title="Cài đặt học tập"
          onClose={() => setSettingsOpen(false)}
          className="settings-dialog"
        >
          <span className="dialog-eyebrow">
            <Settings2 size={18} />
            THEO NHỊP CỦA BẠN
          </span>
          <h2>Cài đặt học tập</h2>
          <p className="dialog-description">
            Một không gian học vừa vặn với bạn.
          </p>
          <div className="setting-row setting-goal">
            <div>
              <strong>Mục tiêu mỗi ngày</strong>
              <p>Số cách nói bạn muốn học hoặc ôn lại.</p>
            </div>
            <div className="goal-options">
              {[5, 10, 15, 20].map((goal) => (
                <button
                  key={goal}
                  aria-pressed={progress.settings.dailyGoal === goal}
                  className={
                    progress.settings.dailyGoal === goal ? "selected" : ""
                  }
                  onClick={() => updateSetting("dailyGoal", goal)}
                >
                  {goal}
                  <small>cụm</small>
                </button>
              ))}
            </div>
          </div>
          <SettingToggle
            title="Hiện pinyin"
            description="Hiển thị phiên âm dưới chữ Hán."
            checked={progress.settings.showPinyin}
            onChange={() =>
              updateSetting("showPinyin", !progress.settings.showPinyin)
            }
          />
          <SettingToggle
            title="Nghe chậm mặc định"
            description="Phát âm ở tốc độ 0.75× để dễ bắt âm hơn."
            checked={progress.settings.slowAudio}
            onChange={() =>
              updateSetting("slowAudio", !progress.settings.slowAudio)
            }
          />
          <SettingToggle
            title="Giao diện tối"
            description="Dịu mắt hơn khi học vào buổi tối."
            checked={progress.settings.theme === "dark"}
            onChange={() =>
              updateSetting(
                "theme",
                progress.settings.theme === "light" ? "dark" : "light",
              )
            }
          />
          <p className="storage-note">
            <Leaf size={16} />
            Tiến độ được lưu trên trình duyệt này. Chưa có đồng bộ giữa các
            thiết bị.
          </p>
          <button
            className="button button-primary settings-done"
            onClick={() => setSettingsOpen(false)}
          >
            Sẵn sàng học <Check size={17} />
          </button>
        </Dialog>
      )}
      {guideOpen && (
        <Dialog
          title="Góc nhỏ cho người mới"
          onClose={() => setGuideOpen(false)}
          className="guide-dialog"
        >
          <span className="dialog-eyebrow">
            <GraduationCap size={18} />
            BẮT ĐẦU THẬT NHẸ NHÀNG
          </span>
          <h2>Chào bạn, 你好!</h2>
          <p className="dialog-description">
            Ở đây, bạn học tiếng Phổ thông (Quan thoại) qua những câu nói đời
            thường, dùng chữ giản thể.
          </p>
          <div className="guide-step">
            <span>01</span>
            <div>
              <h3>Nghe trước, đọc sau</h3>
              <p>
                Chạm vào loa để nghe. Pinyin giúp bạn đọc âm; các dấu mā, má,
                mǎ, mà thể hiện bốn thanh điệu. Âm nhẹ không mang dấu.
              </p>
            </div>
          </div>
          <div className="tone-guide" aria-label="Bốn thanh điệu tiếng Trung">
            <div>
              <b>mā</b>
              <span>→</span>
              <small>Thanh 1 · cao, ngang</small>
            </div>
            <div>
              <b>má</b>
              <span>↗</span>
              <small>Thanh 2 · đi lên</small>
            </div>
            <div>
              <b>mǎ</b>
              <span>⌄</span>
              <small>Thanh 3 · hạ rồi lên</small>
            </div>
            <div>
              <b>mà</b>
              <span>↘</span>
              <small>Thanh 4 · đi xuống</small>
            </div>
          </div>
          <p className="guide-tone-note">
            Khi nói liền, thanh điệu có thể biến đổi. Pinyin ở đây thể hiện cách
            đọc biến điệu của 一, 不 và nhiều âm nhẹ; thanh 3 giữ dấu gốc. Hãy
            nghe cả câu để bắt ngữ điệu.
          </p>
          <div className="guide-step">
            <span>02</span>
            <div>
              <h3>Học cả tình huống</h3>
              <p>
                Mỗi cụm có hội thoại và ghi chú: ai nói với ai, khi nào phù hợp,
                chỗ nào dễ dịch nhầm. Không cần thuộc từng chữ trước khi bắt
                đầu.
              </p>
            </div>
          </div>
          <div className="guide-step">
            <span>03</span>
            <div>
              <h3>Thử nhớ, rồi mới lật thẻ</h3>
              <p>
                Chọn “Chưa nhớ”, “Hơi khó”, “Đã nhớ” hoặc “Rất dễ”. Lịch ôn sẽ
                điều chỉnh theo mức bạn chọn. Mục tiêu mỗi ngày tính số cụm khác
                nhau đã học, kể cả khi bạn cần ôn thêm.
              </p>
            </div>
          </div>
          <div className="guide-levels">
            <strong>Chọn nhịp học phù hợp</strong>
            <p>
              <b>Nhập môn:</b> câu ngắn, dễ dùng. <b>Giao tiếp:</b> cách diễn
              đạt theo tình huống. <b>Tự nhiên:</b> khẩu ngữ và sắc thái tinh
              tế. Đây là cấp độ của thư viện, không phải phân loại HSK.
            </p>
          </div>
          <button
            className="button button-primary settings-done"
            onClick={() => {
              setGuideOpen(false);
              openExplore();
            }}
          >
            Khám phá cách nói đầu tiên <ArrowRight size={17} />
          </button>
        </Dialog>
      )}
    </div>
  );
}

function SettingToggle({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="setting-row">
      <div>
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={title}
        className={`toggle ${checked ? "on" : ""}`}
        onClick={onChange}
      >
        <span />
      </button>
    </div>
  );
}
