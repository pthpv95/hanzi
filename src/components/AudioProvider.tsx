"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { LoaderCircle, Square, Volume2 } from "lucide-react";

interface AudioContextValue {
  active: string | null;
  loading: boolean;
  play: (key: string, text: string, slow?: boolean) => void;
  stop: () => void;
}
const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({
  children,
  onError,
}: {
  children: ReactNode;
  onError: (message: string) => void;
}) {
  const [active, setActive] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const audio = useRef<HTMLAudioElement | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const sequence = useRef(0);
  const stop = useCallback(() => {
    sequence.current++;
    if (audio.current) {
      audio.current.pause();
      audio.current = null;
    }
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    utterance.current = null;
    setActive(null);
    setLoading(false);
  }, []);
  useEffect(
    () => () => {
      audio.current?.pause();
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  const play = useCallback(
    (key: string, text: string, slow = false) => {
      stop();
      const current = sequence.current;
      setActive(`${key}:${slow ? "slow" : "normal"}`);
      setLoading(true);
      const finish = () => {
        if (current === sequence.current) {
          setActive(null);
          setLoading(false);
        }
      };
      const fallback = () => {
        if (current !== sequence.current) return;
        const voice =
          "speechSynthesis" in window &&
          window.speechSynthesis
            .getVoices()
            .find((v) => /^zh[-_]CN/i.test(v.lang));
        if (!voice) {
          finish();
          onError("Chưa phát được âm thanh. Bạn thử lại sau nhé.");
          return;
        }
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = "zh-CN";
        speech.voice = voice;
        speech.rate = slow ? 0.7 : 0.9;
        speech.onend = finish;
        speech.onerror = finish;
        utterance.current = speech;
        setLoading(false);
        window.speechSynthesis.speak(speech);
      };
      const clip = new Audio(`/audio/${key}.m4a`);
      clip.playbackRate = slow ? 0.75 : 1;
      clip.onplaying = () => {
        if (current === sequence.current) setLoading(false);
      };
      clip.onended = finish;
      clip.onerror = fallback;
      audio.current = clip;
      void clip.play().catch(fallback);
    },
    [onError, stop],
  );

  return (
    <AudioContext.Provider value={{ active, loading, play, stop }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const value = useContext(AudioContext);
  if (!value) throw new Error("Audio controls require AudioProvider");
  return value;
}

export function AudioButton({
  audioKey,
  text,
  slow = false,
  label,
  className = "",
}: {
  audioKey: string;
  text: string;
  slow?: boolean;
  label?: string;
  className?: string;
}) {
  const { active, loading, play, stop } = useAudio();
  const playing = active === `${audioKey}:${slow ? "slow" : "normal"}`;
  return (
    <button
      type="button"
      className={`audio-button ${playing ? "is-playing" : ""} ${className}`}
      aria-label={playing ? "Dừng âm thanh" : label || `Nghe: ${text}`}
      aria-pressed={playing}
      onClick={(e) => {
        e.stopPropagation();
        if (playing) stop();
        else play(audioKey, text, slow);
      }}
    >
      {playing && loading ? (
        <LoaderCircle size={18} className="spin" />
      ) : playing ? (
        <Square size={15} fill="currentColor" />
      ) : (
        <Volume2 size={18} />
      )}
      {label && <span>{playing ? "Đang phát" : label}</span>}
    </button>
  );
}
