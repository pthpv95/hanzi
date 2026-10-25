"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { LiveServerMessage, Session } from "@google/genai";
import { LiveAudioPlayer, pcmBase64 } from "@/lib/live-audio";
import {
  markInterruptedCaption,
  parseFeedback,
  stopReason,
  updateTranscript,
  UsageLedger,
  type Caption,
  type Feedback,
  type Lesson,
} from "@/lib/tutor";

export type TutorPhase = "idle" | "connecting" | "live" | "ended" | "error";
export type EndReason = "manual" | "time" | "budget" | "connection";

export function useLiveTutor() {
  const [phase, setPhase] = useState<TutorPhase>("idle");
  const [error, setError] = useState("");
  const [captions, setCaptions] = useState<Caption[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [muted, setMuted] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [outputLevel, setOutputLevel] = useState(0);
  const [level, setLevel] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [cost, setCost] = useState(0);
  const [endReason, setEndReason] = useState<EndReason>("manual");
  const active = useRef(false);
  const mounted = useRef(true);
  const generation = useRef(0);
  const session = useRef<Session | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const context = useRef<AudioContext | null>(null);
  const recorder = useRef<AudioWorkletNode | null>(null);
  const source = useRef<MediaStreamAudioSourceNode | null>(null);
  const sink = useRef<GainNode | null>(null);
  const player = useRef<LiveAudioPlayer | null>(null);
  const abort = useRef<AbortController | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const mutedRef = useRef(false);

  useEffect(() => {
    if (!speaking) return;
    const meter = setInterval(() => {
      setOutputLevel(player.current?.outputLevel || 0);
    }, 80);
    return () => clearInterval(meter);
  }, [speaking]);

  const cleanup = useCallback(() => {
    generation.current++;
    active.current = false;
    abort.current?.abort();
    abort.current = null;
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    const connection = session.current;
    session.current = null;
    try {
      connection?.close();
    } catch {
      /* Closed by the provider. */
    }
    if (recorder.current) recorder.current.port.onmessage = null;
    recorder.current?.disconnect();
    recorder.current = null;
    source.current?.disconnect();
    source.current = null;
    sink.current?.disconnect();
    sink.current = null;
    stream.current?.getTracks().forEach((track) => track.stop());
    stream.current = null;
    player.current?.interrupt();
    player.current = null;
    const audio = context.current;
    context.current = null;
    if (audio && audio.state !== "closed") void audio.close().catch(() => {});
  }, []);

  const end = useCallback(
    (reason: EndReason = "manual") => {
      const wasPlaying = player.current?.isPlaying || false;
      cleanup();
      if (!mounted.current) return;
      setEndReason(reason);
      setPhase(reason === "connection" ? "error" : "ended");
      setSpeaking(false);
      setOutputLevel(0);
      setLevel(0);
      setMuted(false);
      mutedRef.current = false;
      setCaptions((lines) =>
        markInterruptedCaption(lines, wasPlaying).map((line) => ({
          ...line,
          final: true,
        })),
      );
    },
    [cleanup],
  );

  useEffect(() => {
    mounted.current = true;
    const leave = () => {
      if (active.current) end("manual");
      else cleanup();
    };
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted && !active.current) {
        setPhase((previous) =>
          previous === "live" || previous === "connecting" ? "ended" : previous,
        );
        setSpeaking(false);
        setOutputLevel(0);
        setLevel(0);
      }
    };
    window.addEventListener("pagehide", leave);
    window.addEventListener("pageshow", restore);
    return () => {
      mounted.current = false;
      cleanup();
      window.removeEventListener("pagehide", leave);
      window.removeEventListener("pageshow", restore);
    };
  }, [cleanup, end]);

  const start = useCallback(
    async (lesson: Lesson, accessCode: string) => {
      if (active.current) return;
      cleanup();
      const current = generation.current;
      const valid = () => mounted.current && generation.current === current;
      active.current = true;
      setPhase("connecting");
      setError("");
      setCaptions([]);
      setFeedback([]);
      setCost(0);
      setElapsed(0);
      setMuted(false);
      setSpeaking(false);
      setOutputLevel(0);
      mutedRef.current = false;
      const ledger = new UsageLedger();
      let startedAt = 0;
      let deadline = Infinity;
      try {
        if (
          !window.isSecureContext ||
          !navigator.mediaDevices?.getUserMedia ||
          !window.AudioContext ||
          !window.AudioWorkletNode
        )
          throw new Error("UNSUPPORTED");
        const audio = new AudioContext({ sampleRate: 16000 });
        context.current = audio;
        await audio.resume();
        if (!valid()) return;
        const microphone = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
          video: false,
        });
        if (!valid()) {
          microphone.getTracks().forEach((track) => track.stop());
          return;
        }
        stream.current = microphone;
        await audio.audioWorklet.addModule("/audio/mic-processor.js");
        if (!valid()) return;
        const controller = new AbortController();
        abort.current = controller;
        const response = await fetch("/api/tutor/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...lesson, accessCode }),
          signal: controller.signal,
        });
        const credentials = await response.json();
        if (!response.ok)
          throw new Error(credentials.error || "Không kết nối được lớp học.");
        if (!valid()) return;
        const { GoogleGenAI, Modality } = await import("@google/genai");
        if (!valid()) return;
        const playback = new LiveAudioPlayer(audio, (value) => {
          if (valid()) {
            setSpeaking(value);
            if (!value) setOutputLevel(0);
          }
        });
        player.current = playback;
        const fail = () => {
          if (!valid()) return;
          setError(
            "Kết nối gia sư đã dừng. Hội thoại hiện tại vẫn ở đây; bạn có thể thử kết nối lại.",
          );
          end("connection");
        };
        function message(data: LiveServerMessage) {
          if (!valid()) return;
          if (data.usageMetadata) ledger.observe(data.usageMetadata);
          const content = data.serverContent;
          if (content?.interrupted) {
            const wasPlaying = playback.isPlaying;
            playback.interrupt();
            setCaptions((lines) => markInterruptedCaption(lines, wasPlaying));
          }
          if (content?.interimInputTranscription?.text)
            setCaptions((lines) =>
              updateTranscript(
                lines,
                "user",
                content.interimInputTranscription!.text!,
                { interim: true },
              ),
            );
          if (content?.inputTranscription)
            setCaptions((lines) =>
              updateTranscript(
                lines,
                "user",
                content.inputTranscription!.text || "",
                { finished: content.inputTranscription!.finished },
              ),
            );
          if (content?.outputTranscription)
            setCaptions((lines) =>
              updateTranscript(
                lines,
                "tutor",
                content.outputTranscription!.text || "",
                { finished: content.outputTranscription!.finished },
              ),
            );
          for (const part of content?.modelTurn?.parts || []) {
            if (
              part.inlineData?.data &&
              part.inlineData.mimeType?.startsWith("audio/pcm")
            ) {
              const rate = Number(
                part.inlineData.mimeType.match(/rate=(\d+)/)?.[1] || 24000,
              );
              playback.push(part.inlineData.data, rate);
            }
          }
          if (content?.turnComplete) {
            ledger.commit();
            setCaptions((lines) =>
              lines.map((line) =>
                line.role === "tutor" && !line.final
                  ? { ...line, final: true }
                  : line,
              ),
            );
          }
          const calls = data.toolCall?.functionCalls;
          if (calls?.length) {
            const responses = calls.map((call) => {
              const note =
                call.name === "give_feedback"
                  ? parseFeedback(call.id || crypto.randomUUID(), call.args)
                  : null;
              if (note)
                setFeedback((notes) =>
                  [...notes.filter((n) => n.id !== note.id), note].slice(-20),
                );
              return {
                id: call.id,
                name: call.name,
                response: {
                  result: note
                    ? "Correction displayed. Respond supportively to the learner's meaning or question. Offer a small next step when helpful; any retry is optional."
                    : "Unsupported or invalid feedback.",
                },
              };
            });
            session.current?.sendToolResponse({ functionResponses: responses });
          }
          if (data.toolCallCancellation?.ids)
            setFeedback((notes) =>
              notes.filter(
                (note) => !data.toolCallCancellation!.ids!.includes(note.id),
              ),
            );
          const floor = startedAt
            ? ((Date.now() - startedAt) / 60_000) * 0.005 +
              (playback.generatedSeconds / 60) * 0.018
            : 0;
          const estimate = Math.max(ledger.total, floor);
          setCost(estimate);
          if (
            stopReason(Date.now(), Infinity, estimate, lesson.minutes) ===
            "budget"
          )
            end("budget");
          if (data.goAway?.timeLeft) {
            const seconds = parseFloat(data.goAway.timeLeft);
            if (Number.isFinite(seconds))
              deadline = Math.min(
                deadline,
                Date.now() + Math.max(0, seconds * 1000 - 1000),
              );
          }
        }
        const client = new GoogleGenAI({
          apiKey: credentials.token,
          httpOptions: { apiVersion: "v1beta" },
        });
        // Resolve late connections safely when the user cancels the permission/setup flow.
        const connecting = client.live.connect({
          model: credentials.model,
          config: { responseModalities: [Modality.AUDIO] },
          callbacks: { onmessage: message, onerror: fail, onclose: fail },
        });
        const timeout = setTimeout(() => {
          if (valid() && !session.current) fail();
        }, 20_000);
        let connection: Session;
        try {
          connection = await connecting;
        } finally {
          clearTimeout(timeout);
        }
        if (!valid()) {
          connection.close();
          return;
        }
        session.current = connection;
        startedAt = Date.now();
        deadline = Math.min(
          deadline,
          startedAt + lesson.minutes * 60_000,
          credentials.expiresAt - 5000,
        );
        const capture = new AudioWorkletNode(audio, "hanzi-mic");
        recorder.current = capture;
        source.current = audio.createMediaStreamSource(microphone);
        sink.current = audio.createGain();
        sink.current.gain.value = 0;
        source.current.connect(capture);
        capture.connect(sink.current);
        sink.current.connect(audio.destination);
        let lastMeter = 0;
        capture.port.onmessage = (event) => {
          if (!valid() || mutedRef.current) return;
          try {
            connection.sendRealtimeInput({
              audio: {
                data: pcmBase64(event.data.pcm),
                mimeType: `audio/pcm;rate=${audio.sampleRate}`,
              },
            });
          } catch {
            fail();
            return;
          }
          if (performance.now() - lastMeter > 100) {
            setLevel(Math.min(1, event.data.level * 4));
            lastMeter = performance.now();
          }
        };
        setPhase("live");
        timer.current = setInterval(() => {
          if (!valid()) return;
          const now = Date.now();
          const estimate = Math.max(
            ledger.total,
            ((now - startedAt) / 60_000) * 0.005 +
              (playback.generatedSeconds / 60) * 0.018,
          );
          setElapsed(Math.floor((now - startedAt) / 1000));
          setCost(estimate);
          const reason = stopReason(now, deadline, estimate, lesson.minutes);
          if (reason) end(reason);
        }, 1000);
        connection.sendClientContent({
          turns: [
            {
              role: "user",
              parts: [
                {
                  text: "Bắt đầu buổi học. Chào mình bằng một câu tiếng Trung ngắn đúng tình huống, rồi chờ mình trả lời.",
                },
              ],
            },
          ],
          turnComplete: true,
        });
      } catch (cause) {
        if (!valid()) return;
        const name = cause instanceof Error ? cause.name : "";
        const detail = cause instanceof Error ? cause.message : "";
        const description =
          name === "NotAllowedError"
            ? "Bạn cần cho phép dùng micro để trò chuyện. Kiểm tra quyền micro của trình duyệt rồi thử lại nhé."
            : name === "NotFoundError"
              ? "Chưa tìm thấy micro. Bạn kết nối micro rồi thử lại nhé."
              : detail === "UNSUPPORTED"
                ? "Trình duyệt chưa hỗ trợ lớp học giọng nói. Hãy dùng Chrome, Edge hoặc Safari mới trên HTTPS hoặc localhost."
                : detail.startsWith("Lớp") ||
                    detail.startsWith("Mã") ||
                    detail.startsWith("Vui lòng") ||
                    detail.startsWith("Chưa")
                  ? detail
                  : "Chưa bắt đầu được buổi học. Bạn kiểm tra mạng và cấu hình lớp học rồi thử lại nhé.";
        end("connection");
        setError(description);
      }
    },
    [cleanup, end],
  );

  function toggleMute() {
    if (phase !== "live") return;
    const next = !mutedRef.current;
    mutedRef.current = next;
    setMuted(next);
    setLevel(0);
    stream.current?.getAudioTracks().forEach((track) => {
      track.enabled = !next;
    });
    if (next) {
      try {
        session.current?.sendRealtimeInput({ audioStreamEnd: true });
      } catch {
        end("connection");
      }
    }
  }

  function sendText(text: string) {
    const value = text.trim().slice(0, 500);
    if (!value || !session.current || phase !== "live") return;
    const wasPlaying = player.current?.isPlaying || false;
    player.current?.interrupt();
    setCaptions((lines) =>
      [
        ...markInterruptedCaption(lines, wasPlaying).map((line) =>
          !line.final ? { ...line, final: true } : line,
        ),
        {
          id: crypto.randomUUID(),
          role: "user" as const,
          text: value,
          final: true,
        },
      ].slice(-160),
    );
    try {
      session.current.sendClientContent({
        turns: [{ role: "user", parts: [{ text: value }] }],
        turnComplete: true,
      });
    } catch {
      setError("Không gửi được tin nhắn.");
      end("connection");
    }
  }

  function reset() {
    cleanup();
    setPhase("idle");
    setError("");
    setCaptions([]);
    setFeedback([]);
    setElapsed(0);
    setCost(0);
    setLevel(0);
    setSpeaking(false);
    setOutputLevel(0);
    setMuted(false);
    mutedRef.current = false;
  }

  return {
    phase,
    error,
    captions,
    feedback,
    muted,
    speaking,
    outputLevel,
    level,
    elapsed,
    cost,
    endReason,
    start,
    end,
    toggleMute,
    sendText,
    reset,
  };
}
