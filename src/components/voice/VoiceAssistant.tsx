"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Mic, MicOff, Send, Sparkles, Volume2, VolumeX, X } from "lucide-react";
import { useUiStore } from "@/stores/ui";
import { useSessionStore } from "@/stores/session";
import { useTwinStore } from "@/stores/twin";
import { matchVoiceIntent } from "@/lib/voice/intents";
import { Button } from "@/components/ui/button";

interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
}

export function VoiceAssistant() {
  const router = useRouter();
  const user = useSessionStore((s) => s.user);
  const isOpen = useUiStore((s) => s.voiceOpen);
  const setOpen = useUiStore((s) => s.setVoiceOpen);
  const toggleOpen = useUiStore((s) => s.toggleVoice);
  const setDevice = useTwinStore((s) => s.setDevice);

  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "initial",
      sender: "assistant",
      text: "Hello! I am your SAVERA Voice & Query Assistant. Ask me anything about electricity, water, LPG, or your Green Score.",
    },
  ]);
  const [isListening, setIsListening] = useState(false);
  const [speechEnabled, setSpeechEnabled] = useState(false);

  const recognitionRef = useRef<unknown>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const role = user?.role ?? "citizen";

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (isOpen) {
      chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Handle Speech Recognition setup if supported
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as unknown as { SpeechRecognition?: unknown }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition;

      if (SpeechRecognition) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rec = new (SpeechRecognition as any)();
        rec.continuous = false;
        rec.interimResults = false;
        rec.lang = "en-IN";

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        rec.onresult = (e: any) => {
          const transcript = e.results[0][0].transcript;
          handleQuery(transcript);
          setIsListening(false);
        };

        rec.onerror = () => {
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }
    }
  }, [role]);

  const speak = (text: string) => {
    if (!speechEnabled || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-IN";
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) {
      // Speech recognition not supported, prompt to use text
      return;
    }

    if (isListening) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (recognitionRef.current as any).stop();
      setIsListening(false);
    } else {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (recognitionRef.current as any).start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleQuery = (queryText: string) => {
    if (!queryText.trim()) return;

    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      sender: "user",
      text: queryText,
    };

    const intent = matchVoiceIntent(queryText, role);

    const assistantMsg: Message = {
      id: Math.random().toString(36).substring(7),
      sender: "assistant",
      text: intent.response,
    };

    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");

    // Trigger twin action if present
    if (intent.twinAction) {
      if (intent.twinAction.device === "ac") {
        if (intent.twinAction.state === "off") {
          setDevice("ac", { on: false });
        } else if (intent.twinAction.state === "on") {
          setDevice("ac", { on: true, setpointC: intent.twinAction.temp ?? 26 });
        }
      }
    }

    // Speak response if voice audio output enabled
    speak(intent.response);

    // Route if applicable
    if (intent.route) {
      router.push(intent.route);
    }
  };

  const quickPrompts =
    role === "citizen"
      ? [
          "Which appliance is consuming the most?",
          "How much electricity did I use this month?",
          "When will my LPG cylinder finish?",
          "What's my Green Score?",
          "Turn off the simulated AC",
        ]
      : role === "supervisor"
      ? [
          "Show high-consumption areas in Ward 24",
          "Show pending field verifications",
          "Summarise today's water complaints",
          "Open the XYZ Colony case",
        ]
      : [
          "Show wards where water demand is above baseline",
          "What is next month's LPG requirement?",
          "Open the resource heatmap",
          "Publish a power interruption alert for Ward 24",
        ];

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={toggleOpen}
          className="relative group flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-tr from-emerald-500 to-teal-400 text-black shadow-lg shadow-emerald-500/30 hover:scale-105 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2 focus:ring-offset-[#050B08]"
          aria-label="Toggle Voice Assistant"
        >
          <div className="absolute -inset-1 rounded-full bg-emerald-400/30 blur-sm animate-pulse pointer-events-none" />
          <Mic className="h-5 w-5 text-black relative z-10" />
        </button>
      </div>

      {/* Slide-in Assistant Modal / Drawer */}
      {isOpen && (
        <div className="fixed bottom-22 right-6 z-40 w-96 max-w-[calc(100vw-3rem)] rounded-2xl bg-[#070D0A]/95 border border-white/15 backdrop-blur-2xl shadow-2xl flex flex-col overflow-hidden text-white animate-scale-in">
          {/* Header */}
          <div className="p-4 border-b border-white/10 flex items-center justify-between bg-black/40">
            <div className="flex items-center gap-2.5">
              <div className="h-7 w-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">SAVERA Voice & Query</h3>
                <p className="text-[10px] text-muted-foreground">Natural Language Resource Assistant</p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setSpeechEnabled(!speechEnabled)}
                className={`p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors ${
                  speechEnabled ? "text-emerald-400" : ""
                }`}
                title={speechEnabled ? "Speech audio output on" : "Speech audio output off"}
              >
                {speechEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </button>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Conversation Transcript */}
          <div className="p-4 h-64 overflow-y-auto space-y-3 scrollbar-thin scrollbar-thumb-white/10">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    m.sender === "user"
                      ? "bg-emerald-500 text-black font-medium rounded-br-none shadow-sm"
                      : "bg-white/10 text-white/90 rounded-bl-none border border-white/5"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={chatBottomRef} />
          </div>

          {/* Quick suggestions */}
          <div className="px-3 py-2 border-t border-white/5 bg-black/20 flex gap-1.5 overflow-x-auto scrollbar-none">
            {quickPrompts.slice(0, 3).map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => handleQuery(prompt)}
                className="shrink-0 text-[11px] px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/5 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* Input Controls */}
          <div className="p-3 border-t border-white/10 bg-black/40 flex items-center gap-2">
            <button
              onClick={toggleListening}
              className={`p-2 rounded-xl transition-all ${
                isListening
                  ? "bg-rose-500 text-white animate-pulse"
                  : "bg-white/10 hover:bg-white/15 text-white/80"
              }`}
              title={isListening ? "Listening... click to stop" : "Speak command"}
            >
              {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            </button>

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleQuery(input)}
              placeholder={isListening ? "Listening..." : "Type or speak query..."}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-emerald-500/50"
            />

            <Button
              size="sm"
              onClick={() => handleQuery(input)}
              disabled={!input.trim()}
              className="h-8 w-8 p-0 rounded-xl bg-emerald-500 text-black hover:bg-emerald-400"
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
