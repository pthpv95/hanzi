import type {
  ActivityHandling,
  LiveConnectConfig,
  Modality,
  UsageMetadata,
} from "@google/genai";
import { expressions } from "../data/expressions";
export interface Lesson {
  scenario: string;
  minutes: 5 | 10;
}
export interface Caption {
  id: string;
  role: "user" | "tutor";
  text: string;
  final: boolean;
  interim?: boolean;
  interrupted?: boolean;
}
export interface Feedback {
  id: string;
  original: string;
  corrected: string;
  pinyin: string;
  meaning: string;
  explanation: string;
}
export function markInterruptedCaption(
  lines: Caption[],
  audioPlaying: boolean,
): Caption[] {
  const index = lines.findLastIndex((line) => line.role === "tutor");
  return lines.map((line, i) =>
    i === index && (audioPlaying || !line.final)
      ? { ...line, final: true, interrupted: true }
      : line,
  );
}
export const TUTOR_MODEL = "gemini-3.8-live";
export const scenarios = [
  {
    id: "food",
    title: "Một bữa ăn ngon",
    subtitle: "Gọi món, dặn khẩu vị và tính tiền",
    hanzi: "食",
    color: "amber",
    scene:
      "You are a friendly restaurant server in a small Chinese restaurant. Help the learner order a meal and pay.",
    phrases: ["bu-yao-la", "mai-dan", "da-bao"],
    opener: "你好，欢迎光临！你想吃什么？",
  },
  {
    id: "social",
    title: "Lần đầu gặp gỡ",
    subtitle: "Làm quen và trò chuyện thật tự nhiên",
    hanzi: "聊",
    color: "peach",
    scene:
      "You are a new classmate. Meet the learner, exchange names and have an easy friendly conversation.",
    phrases: ["hao-jiu-bu-jian", "mei-guan-xi", "bu-ke-qi"],
    opener: "你好！我叫小林。你叫什么名字？",
  },
  {
    id: "travel",
    title: "Dạo một vòng thành phố",
    subtitle: "Hỏi đường và nhờ người khác giúp",
    hanzi: "行",
    color: "blue",
    scene:
      "You are a helpful local. Help the learner find the metro station and a cafe, then ask them to practise asking for directions.",
    phrases: ["zen-me-zou", "zai-na-li", "bang-wo-pai-zhao"],
    opener: "你好！你想去哪里？",
  },
  {
    id: "work",
    title: "Chuyện ở công sở",
    subtitle: "Xác nhận lịch và phối hợp công việc",
    hanzi: "事",
    color: "violet",
    scene:
      "You are a supportive coworker arranging a short meeting. Practise asking about time, confirming information, and thanking a colleague.",
    phrases: ["mei-wen-ti", "wo-que-ren-yi-xia", "xin-ku-le"],
    opener: "你好！我们明天开个会，好吗？",
  },
  {
    id: "daily",
    title: "Một ngày bình thường",
    subtitle: "Rủ bạn đi chơi, chào hỏi và tạm biệt",
    hanzi: "日",
    color: "green",
    scene:
      "You are a friend chatting about daily plans. Encourage the learner to use small everyday expressions.",
    phrases: ["man-man-lai", "deng-yi-xia", "wo-xian-zou-le"],
    opener: "你好！今天你想做什么？",
  },
  {
    id: "free",
    title: "Cứ trò chuyện thôi",
    subtitle: "Nói về điều bạn đang quan tâm",
    hanzi: "言",
    color: "rose",
    scene:
      "Ask the learner what everyday topic they want to practise and adapt to their Chinese level. Stay focused on language learning.",
    phrases: ["zui-jin-zen-me-yang", "you-kong-ma", "yi-qi-jia-you"],
    opener: "你好！今天你想聊什么？",
  },
] as const;

export function parseLesson(value: unknown): Lesson {
  if (!value || typeof value !== "object") throw new Error("Invalid lesson");
  const v = value as Record<string, unknown>;
  if (
    !scenarios.some((s) => s.id === v.scenario) ||
    (v.minutes !== 5 && v.minutes !== 10)
  )
    throw new Error("Invalid lesson");
  return { scenario: v.scenario as string, minutes: v.minutes };
}

export function lessonPhrases(scenario: string) {
  const scene = scenarios.find((s) => s.id === scenario) || scenarios[0];
  return scene.phrases
    .map((id) => expressions.find((e) => e.id === id)!)
    .filter(Boolean);
}

export function buildTutorConfig(lesson: Lesson): LiveConnectConfig {
  const scene = scenarios.find((s) => s.id === lesson.scenario)!;
  const phrases = lessonPhrases(lesson.scenario)
    .map((e) => `${e.zh} (${e.pinyin}): ${e.meaning}`)
    .join("\n");
  return {
    responseModalities: ["AUDIO" as Modality],
    maxOutputTokens: 320,
    speechConfig: {
      voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
    },
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    contextWindowCompression: {
      triggerTokens: "2048",
      slidingWindow: { targetTokens: "1024" },
    },
    realtimeInputConfig: {
      activityHandling: "START_OF_ACTIVITY_INTERRUPTS" as ActivityHandling,
      automaticActivityDetection: {
        disabled: false,
        silenceDurationMs: 900,
        prefixPaddingMs: 300,
      },
    },
    systemInstruction: `You are 小林 (Xiaolin), a warm, patient, open-minded Mandarin tutor for a Vietnamese adult beginner using Hanzi. Bring the curiosity and care of a teacher who enjoys teaching and is glad to help, even when something needs explaining several times. This is a ${lesson.minutes}-minute audio-only lesson.

TEACHING ATTITUDE
Treat the learner as a capable adult. Make it comfortable to ask questions, make mistakes, disagree, or say "I don't know". Listen to what they want to communicate and respond to that meaning before considering a correction. Be curious about their interests, background, and opinions without judging or making assumptions. Encourage specific effort or progress you actually notice; avoid empty praise, baby talk, comparisons, or pretending an incorrect answer is correct. When discouraged, acknowledge the difficulty calmly and offer one manageable next step. Never sound impatient or disappointed.
Welcome follow-up questions and different ways of learning. If an explanation did not help, explain it differently with a simpler example rather than repeating the same instruction. Admit uncertainty, ask for clarification when needed, and acknowledge a learner's correction graciously. Accept valid alternative wording; distinguish a real error from a stylistic preference or a difference in register.

LESSON AND LEARNER CHOICE
${scene.scene}
This role-play is a starting point, not a script the learner must follow. Step out of character whenever they need teaching help. Follow their questions, interests, and requested pace; a useful language question takes priority over completing the scenario or covering every expression.
Speak clear, natural Mainland Mandarin at a calm beginner pace. Use simplified Chinese. Welcome Vietnamese, Mandarin, and mixed speech. Explain in Vietnamese when asked or when the learner seems stuck. Help with one small step or one concrete example at a time. If they cannot answer, offer a short model or two easy choices instead of demanding another attempt. Invite practice without insisting; respect a request to skip, change topic, or hear the explanation again.

CONVERSATION RHYTHM
Usually use one or two short sentences, about 10 seconds. For a requested explanation, use up to four short sentences with one simple example, then leave room for the learner. Ask at most one simple question per turn; a helpful answer does not always need to end in a question. Let the learner speak more than you do and wait through thinking pauses. Do not give monologues, repeat captions, read pinyin aloud, or translate every sentence automatically. When interrupted, follow their new question immediately. Do not respond to background noises or your own echoed audio.
Open warmly with: ${scene.opener}
Useful expressions to introduce naturally when helpful, not as a checklist:
${phrases}

GENTLE, ACCURATE FEEDBACK
Do not turn every reply into a correction. For a clear wording or grammar mistake that matters to understanding or the current learning goal, first acknowledge what the learner means, then briefly model one improvement. Offer at most one correction per learner turn; an optional retry is an invitation, not a requirement. Use give_feedback only for a real mistake in something they actually said, showing the corrected Chinese, pinyin, natural Vietnamese meaning, and a short, kind Vietnamese explanation of why it helps. Do not use it for valid alternatives, stylistic preferences, or praise. Never invent a learner mistake or a numeric pronunciation score. A transcript is not sufficient evidence to judge exact tones. Offer a pronunciation model when helpful, and ask gently to hear something again if the audio was unclear.
For "nói chậm", "慢一点" or "repeat", willingly repeat the last short sentence more slowly without adding difficulty. For "giải thích", answer the actual question in simple Vietnamese with an example. The app controls timing and ends the lesson. Do not promise an exact price.`,
    tools: [
      {
        functionDeclarations: [
          {
            name: "give_feedback",
            description:
              "Display one gentle correction of a clear language mistake in something the learner actually said. Explain why it helps in kind, simple Vietnamese. Do not call for valid alternative wording, stylistic preferences, or praise; never require a retry.",
            parametersJsonSchema: {
              type: "object",
              properties: {
                original: { type: "string" },
                corrected: { type: "string" },
                pinyin: { type: "string" },
                meaning: { type: "string" },
                explanation: { type: "string" },
              },
              required: [
                "original",
                "corrected",
                "pinyin",
                "meaning",
                "explanation",
              ],
              additionalProperties: false,
            },
          },
        ],
      },
    ],
  };
}

type TokenUsage = {
  promptTokenCount?: number;
  responseTokenCount?: number;
  thoughtsTokenCount?: number;
  promptTokensDetails?: { modality?: string; tokenCount?: number }[];
  responseTokensDetails?: { modality?: string; tokenCount?: number }[];
};
export function estimateUsage(usage: TokenUsage): number {
  const count = (
    details: TokenUsage["promptTokensDetails"],
    total: number,
    input: boolean,
  ) => {
    let tokens = 0,
      cost = 0;
    for (const item of details || []) {
      const n = Math.max(0, item.tokenCount || 0);
      tokens += n;
      cost +=
        n *
        (input
          ? item.modality === "TEXT"
            ? 0.75
            : 3
          : item.modality === "TEXT"
            ? 4.5
            : 12);
    }
    // Treat unclassified tokens conservatively as audio.
    return cost + Math.max(0, total - tokens) * (input ? 3 : 12);
  };
  return (
    (count(usage.promptTokensDetails, usage.promptTokenCount || 0, true) +
      count(usage.responseTokensDetails, usage.responseTokenCount || 0, false) +
      Math.max(0, usage.thoughtsTokenCount || 0) * 4.5) /
    1_000_000
  );
}

// Replace streaming snapshots within a turn; commit once at turn completion.
export class UsageLedger {
  private committed = 0;
  private pending = 0;
  get total() {
    return this.committed + this.pending;
  }
  observe(usage: UsageMetadata | TokenUsage) {
    this.pending = Math.max(this.pending, estimateUsage(usage));
  }
  commit() {
    this.committed += this.pending;
    this.pending = 0;
  }
}

export function stopReason(
  now: number,
  deadline: number,
  cost: number,
  minutes: number,
): "time" | "budget" | null {
  if (now >= deadline) return "time";
  // Reserve one sixth of the $0.30/10min target for delayed usage reporting.
  if (cost >= minutes * 0.025) return "budget";
  return null;
}

export function updateTranscript(
  lines: Caption[],
  role: Caption["role"],
  text: string,
  options: { interim?: boolean; finished?: boolean },
): Caption[] {
  if (!text)
    return options.finished
      ? lines.map((line) =>
          line.role === role && !line.final
            ? { ...line, final: true, interim: false }
            : line,
        )
      : lines;
  const result = [...lines];
  const index = result.findLastIndex(
    (line) => line.role === role && !line.final,
  );
  const previous = result[index];
  const merged =
    !previous || previous.interim || options.interim
      ? text
      : text.startsWith(previous.text)
        ? text
        : previous.text + text;
  const line: Caption = {
    id:
      previous?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    text: merged.slice(-12_000),
    final: !!options.finished,
    interim: !!options.interim,
  };
  if (index >= 0) result[index] = line;
  else result.push(line);
  return result.slice(-160);
}

export function parseFeedback(id: string, value: unknown): Feedback | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const fields = [
    "original",
    "corrected",
    "pinyin",
    "meaning",
    "explanation",
  ] as const;
  if (
    !fields.every(
      (key) =>
        typeof v[key] === "string" &&
        v[key].trim().length > 0 &&
        v[key].length <= 700,
    )
  )
    return null;
  return {
    id,
    original: v.original as string,
    corrected: v.corrected as string,
    pinyin: v.pinyin as string,
    meaning: v.meaning as string,
    explanation: v.explanation as string,
  };
}
