import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Volume2, Settings, Send, Dog, KeyRound, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const STORAGE_KEY = "hayanga_gemini_api_key";
const MODEL = "gemini-2.5-flash";

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

async function requestMicrophonePermission() {
  if (!navigator.mediaDevices?.getUserMedia) {
    return { ok: false, reason: "not-supported" };
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error?.name || "unknown" };
  }
}

function cleanText(text) {
  return String(text || "").replace(/[*#`_>\[\]{}]/g, "").trim();
}

export default function HayangaGrandmaAIApp() {
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(STORAGE_KEY) || "");
  const [showSettings, setShowSettings] = useState(!localStorage.getItem(STORAGE_KEY));
  const [isListening, setIsListening] = useState(false);
  const [isAwake, setIsAwake] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [heardText, setHeardText] = useState("");
  const [inputText, setInputText] = useState("");
  const [dogText, setDogText] = useState("하양이를 불러주세요.\n\"하양아\" 라고 말하면 대답해요.");
  const [logs, setLogs] = useState([
    { role: "dog", text: "안녕하세요 할머니. 저는 하양이에요." },
  ]);
  const recognitionRef = useRef(null);
  const awakeTimerRef = useRef(null);

  const saveKey = () => {
    if (!apiKey.trim()) return;
    localStorage.setItem(STORAGE_KEY, apiKey.trim());
    setShowSettings(false);
    setDogText("API 키가 저장됐어요. 이제 하양이를 불러보세요!");
    speak("API 키가 저장됐어요. 이제 하양이를 불러보세요!");
  };

  const clearKey = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey("");
    setShowSettings(true);
    setDogText("API 키를 지웠어요.");
  };

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(cleanText(text));
    utter.lang = "ko-KR";
    utter.rate = 0.9;
    utter.pitch = 1.25;
    utter.volume = 1;

    const voices = window.speechSynthesis.getVoices();
    const koreanVoice = voices.find((v) => v.lang?.toLowerCase().includes("ko"));
    if (koreanVoice) utter.voice = koreanVoice;

    window.speechSynthesis.speak(utter);
  };

  const wakeUp = () => {
    clearTimeout(awakeTimerRef.current);
    setIsAwake(true);
    const reply = "네! 할머니";
    setDogText(reply);
    setLogs((prev) => [...prev, { role: "dog", text: reply }]);
    speak(reply);
    awakeTimerRef.current = setTimeout(() => {
      setIsAwake(false);
      setDogText("무엇을 도와드릴까요? 말씀해 주세요.");
    }, 7000);
  };

  const callGemini = async (question) => {
    const key = (localStorage.getItem(STORAGE_KEY) || apiKey).trim();
    if (!key) {
      setShowSettings(true);
      const msg = "먼저 오른쪽 위 설정에서 구글 Gemini API 키를 넣어주세요.";
      setDogText(msg);
      speak(msg);
      return;
    }

    setIsThinking(true);
    setDogText("할머니 말씀을 생각하고 있어요...");
    setLogs((prev) => [...prev, { role: "grandma", text: question }]);

    const systemPrompt = `너는 할머니를 위한 귀엽고 다정한 강아지 AI '하양이'야.
항상 한국어로 대답해.
말투는 쉽고 천천히 읽기 좋게 해.
할머니를 '할머니'라고 부르고, 너무 길게 말하지 마.
위험하거나 건강 관련 질문은 병원/보호자에게 확인하라고 부드럽게 안내해.
외로운 이야기에는 따뜻하게 공감해.
절대 무섭게 말하지 말고, 강아지처럼 다정하고 밝게 대답해.`;

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `${systemPrompt}\n\n할머니가 이렇게 말했어: ${question}`,
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 350,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "API 오류");
      }

      const data = await response.json();
      const answer =
        data?.candidates?.[0]?.content?.parts?.map((p) => p.text).join(" ") ||
        "할머니, 제가 지금은 대답을 잘 못 들었어요. 한 번만 다시 말해 주세요.";

      const cleaned = cleanText(answer);
      setDogText(cleaned);
      setLogs((prev) => [...prev, { role: "dog", text: cleaned }]);
      speak(cleaned);
    } catch (err) {
      const msg = "앗, 지금 AI 연결이 잘 안 돼요. API 키가 맞는지 확인해 주세요.";
      console.error(err);
      setDogText(msg);
      setLogs((prev) => [...prev, { role: "dog", text: msg }]);
      speak(msg);
    } finally {
      setIsThinking(false);
    }
  };

  const handleTranscript = (text) => {
    const transcript = cleanText(text);
    setHeardText(transcript);
    if (!transcript) return;

    const normalized = transcript.replace(/\s/g, "");
    const wakeWords = ["하양아", "하얀아", "하양이", "하얀이"];
    const hasWakeWord = wakeWords.some((word) => normalized.includes(word));

    if (hasWakeWord) {
      wakeUp();
      const question = transcript
        .replace(/하양아/g, "")
        .replace(/하얀아/g, "")
        .replace(/하양이/g, "")
        .replace(/하얀이/g, "")
        .trim();
      if (question.length >= 2) {
        setTimeout(() => callGemini(question), 900);
      }
      return;
    }

    if (isAwake && transcript.length >= 2) {
      callGemini(transcript);
    }
  };

  const startListening = async () => {
    setDogText("마이크 권한을 요청하고 있어요. 허용을 눌러주세요.");

    if (!window.isSecureContext) {
      const msg = "마이크는 보안 연결에서만 켤 수 있어요. https 주소 또는 localhost에서 실행해 주세요.";
      setDogText(msg);
      speak(msg);
      return;
    }

    const permission = await requestMicrophonePermission();
    if (!permission.ok) {
      let msg = "마이크 권한 창이 안 뜨거나 거부됐어요. 브라우저 주소창 옆 자물쇠/설정에서 마이크를 허용해 주세요.";
      if (permission.reason === "not-supported") {
        msg = "이 브라우저는 마이크 권한 요청을 지원하지 않아요. 크롬에서 열어주세요.";
      }
      if (permission.reason === "NotAllowedError") {
        msg = "마이크가 차단돼 있어요. 주소창 옆 자물쇠를 누르고 마이크를 허용으로 바꿔주세요.";
      }
      if (permission.reason === "NotFoundError") {
        msg = "마이크 장치를 찾지 못했어요. 이어폰이나 기기 마이크를 확인해 주세요.";
      }
      setDogText(msg);
      speak(msg);
      return;
    }

    const Recognition = getSpeechRecognition();
    if (!Recognition) {
      const msg = "이 브라우저는 음성 인식을 지원하지 않아요. 크롬에서 열어주세요.";
      setDogText(msg);
      speak(msg);
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "ko-KR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += text;
        else interimText += text;
      }
      setHeardText(finalText || interimText);
      if (finalText) handleTranscript(finalText);
    };

    recognition.onerror = (event) => {
      console.warn(event.error);
      if (event.error === "not-allowed") {
        const msg = "마이크 권한을 허용해야 하양이가 들을 수 있어요.";
        setDogText(msg);
        speak(msg);
      }
    };

    recognition.onend = () => {
      if (isListening) {
        try {
          recognition.start();
        } catch {}
      }
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    setDogText("듣고 있어요. \"하양아\" 라고 불러주세요.");
    recognition.start();
  };

  const stopListening = () => {
    setIsListening(false);
    recognitionRef.current?.stop?.();
    recognitionRef.current = null;
    setDogText("마이크를 껐어요.");
  };

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop?.();
      clearTimeout(awakeTimerRef.current);
      window.speechSynthesis?.cancel?.();
    };
  }, []);

  const sendManual = () => {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    if (text.replace(/\s/g, "").includes("하양아")) {
      wakeUp();
      const q = text.replace(/하양아/g, "").trim();
      if (q) setTimeout(() => callGemini(q), 800);
    } else {
      callGemini(text);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 via-white to-amber-100 p-4 text-slate-900">
      <div className="mx-auto flex max-w-5xl flex-col gap-4">
        <header className="flex items-center justify-between rounded-3xl bg-white/75 p-4 shadow-lg backdrop-blur">
          <div>
            <h1 className="text-2xl font-black tracking-tight sm:text-4xl">하양아</h1>
            <p className="text-sm text-slate-600 sm:text-base">할머니 전용 강아지 AI 친구</p>
          </div>
          <Button onClick={() => setShowSettings(true)} className="rounded-2xl" variant="outline">
            <Settings className="mr-2 h-4 w-4" /> 설정
          </Button>
        </header>

        <main className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="overflow-hidden rounded-[2rem] border-0 bg-white/80 shadow-xl backdrop-blur">
            <CardContent className="flex min-h-[560px] flex-col items-center justify-center p-6 text-center">
              <div className="relative mb-6 h-72 w-72 sm:h-80 sm:w-80">
                <motion.div
                  className="absolute inset-0 rounded-full bg-amber-200/60 blur-2xl"
                  animate={{ scale: isAwake ? [1, 1.12, 1] : [1, 1.04, 1] }}
                  transition={{ repeat: Infinity, duration: isAwake ? 1.2 : 3 }}
                />

                <motion.div
                  className="absolute inset-8 flex items-center justify-center rounded-full bg-white shadow-2xl"
                  animate={{ y: isThinking ? [0, -8, 0] : [0, -4, 0] }}
                  transition={{ repeat: Infinity, duration: isThinking ? 0.7 : 2.4 }}
                >
                  <div className="relative h-48 w-52">
                    <motion.div
                      className="absolute left-3 top-2 h-20 w-16 rounded-[80%_20%_70%_30%] bg-amber-300"
                      animate={{ rotate: isAwake ? [-16, -28, -16] : -16 }}
                      transition={{ repeat: Infinity, duration: 1.4 }}
                    />
                    <motion.div
                      className="absolute right-3 top-2 h-20 w-16 rounded-[20%_80%_30%_70%] bg-amber-300"
                      animate={{ rotate: isAwake ? [16, 28, 16] : 16 }}
                      transition={{ repeat: Infinity, duration: 1.4 }}
                    />
                    <div className="absolute left-8 top-8 h-36 w-36 rounded-[45%] bg-white shadow-inner" />
                    <motion.div
                      className="absolute left-16 top-20 h-7 w-7 rounded-full bg-slate-900"
                      animate={{ x: isAwake ? [0, 4, -3, 0] : [0, 2, 0] }}
                      transition={{ repeat: Infinity, duration: 2.2 }}
                    >
                      <div className="ml-1 mt-1 h-2 w-2 rounded-full bg-white" />
                    </motion.div>
                    <motion.div
                      className="absolute right-16 top-20 h-7 w-7 rounded-full bg-slate-900"
                      animate={{ x: isAwake ? [0, 4, -3, 0] : [0, 2, 0] }}
                      transition={{ repeat: Infinity, duration: 2.2 }}
                    >
                      <div className="ml-1 mt-1 h-2 w-2 rounded-full bg-white" />
                    </motion.div>
                    <div className="absolute left-[92px] top-[112px] h-6 w-8 rounded-full bg-slate-900" />
                    <motion.div
                      className="absolute left-[88px] top-[138px] h-5 w-12 rounded-b-full bg-rose-300"
                      animate={{ scaleY: isThinking || isAwake ? [0.8, 1.25, 0.8] : [0.5, 0.8, 0.5] }}
                      transition={{ repeat: Infinity, duration: isThinking ? 0.35 : 1.5 }}
                    />
                    <motion.div
                      className="absolute -right-2 bottom-4 h-16 w-8 rounded-full bg-amber-300"
                      animate={{ rotate: isAwake ? [20, 70, 20] : [20, 35, 20] }}
                      transition={{ repeat: Infinity, duration: isAwake ? 0.8 : 1.8 }}
                    />
                    <Dog className="absolute bottom-0 left-[78px] h-10 w-10 text-amber-500" />
                  </div>
                </motion.div>
              </div>

              <motion.div
                className="mb-4 max-w-xl rounded-3xl bg-slate-900 px-6 py-5 text-xl font-bold leading-relaxed text-white shadow-xl sm:text-2xl"
                animate={{ scale: isAwake ? 1.03 : 1 }}
              >
                {dogText.split("\n").map((line, i) => (
                  <p key={i}>{line}</p>
                ))}
              </motion.div>

              <div className="flex flex-wrap justify-center gap-3">
                {!isListening ? (
                  <Button onClick={startListening} className="rounded-2xl px-6 py-6 text-lg">
                    <Mic className="mr-2 h-5 w-5" /> 마이크 켜기
                  </Button>
                ) : (
                  <Button onClick={stopListening} className="rounded-2xl px-6 py-6 text-lg" variant="destructive">
                    <MicOff className="mr-2 h-5 w-5" /> 마이크 끄기
                  </Button>
                )}
                <Button onClick={() => speak(dogText)} className="rounded-2xl px-6 py-6 text-lg" variant="outline">
                  <Volume2 className="mr-2 h-5 w-5" /> 다시 말하기
                </Button>
              </div>

              <div className="mt-5 w-full max-w-2xl rounded-2xl bg-slate-100 p-3 text-left text-sm text-slate-600">
                <b>들은 말:</b> {heardText || "아직 없음"}
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            <Card className="rounded-[2rem] border-0 bg-white/80 shadow-xl backdrop-blur">
              <CardContent className="p-4">
                <h2 className="mb-3 text-xl font-black">직접 입력하기</h2>
                <div className="flex gap-2">
                  <input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && sendManual()}
                    placeholder="예: 하양아 오늘 날씨 어때?"
                    className="min-w-0 flex-1 rounded-2xl border bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-amber-300"
                  />
                  <Button onClick={sendManual} className="rounded-2xl px-4 py-6">
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="flex-1 rounded-[2rem] border-0 bg-white/80 shadow-xl backdrop-blur">
              <CardContent className="p-4">
                <h2 className="mb-3 text-xl font-black">대화 기록</h2>
                <div className="max-h-[430px] space-y-3 overflow-auto pr-1">
                  {logs.map((item, idx) => (
                    <div
                      key={idx}
                      className={`rounded-3xl p-4 ${
                        item.role === "dog" ? "bg-amber-100" : "bg-sky-100"
                      }`}
                    >
                      <p className="mb-1 text-xs font-bold text-slate-500">
                        {item.role === "dog" ? "하양이" : "할머니"}
                      </p>
                      <p className="leading-relaxed">{item.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-lg rounded-[2rem] bg-white p-6 shadow-2xl"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
            >
              <div className="mb-4 flex items-center gap-2">
                <KeyRound className="h-6 w-6 text-amber-500" />
                <h2 className="text-2xl font-black">Gemini API 키 설정</h2>
              </div>
              <p className="mb-4 text-sm leading-relaxed text-slate-600">
                API 키는 이 기기 브라우저에만 저장돼요. 실제 배포할 때는 서버를 만들어 키를 숨기는 방식이 더 안전해요.
              </p>
              <input
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="AIza... 로 시작하는 Gemini API 키"
                className="mb-3 w-full rounded-2xl border px-4 py-3 outline-none focus:ring-2 focus:ring-amber-300"
                type="password"
              />
              <div className="flex flex-wrap gap-2">
                <Button onClick={saveKey} className="rounded-2xl">저장</Button>
                <Button onClick={() => setShowSettings(false)} variant="outline" className="rounded-2xl">닫기</Button>
                <Button onClick={clearKey} variant="destructive" className="rounded-2xl">
                  <Trash2 className="mr-2 h-4 w-4" /> 키 삭제
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
