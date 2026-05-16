"use client";
import { useState } from "react";
import { CreateRoomPayload, LANGUAGE_MAP, LEVEL_MAP, TOPICS } from "@/types/room";
import CustomSelect from "@/components/common/CustomSelect";

// ─── Constants ───────────────────────────────────────────────────────────────

const MIN_PARTICIPANTS = 2;
const MAX_PARTICIPANTS = 10;

// ─── Props ────────────────────────────────────────────────────────────────────

interface CreateRoomModalProps {
  onClose: () => void;
  onSubmit: (payload: CreateRoomPayload) => Promise<void>;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function CreateRoomModal({ onClose, onSubmit }: CreateRoomModalProps) {
  const [topics, setTopics] = useState<string[]>([]);
  const [language, setLanguage] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [maxParticipants, setMaxParticipants] = useState<number>(2);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX_TOPICS = 3;

  const toggleTopic = (label: string) => {
    setTopics((prev) => {
      if (prev.includes(label)) return prev.filter((t) => t !== label);
      if (prev.length >= MAX_TOPICS) return prev;
      return [...prev, label];
    });
  };

  const isValid = topics.length > 0 && language !== "" && level !== "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    try {
      setError(null);
      setSubmitting(true);
      await onSubmit({ topics, language, level, maxParticipants });
    } catch {
      setError("Failed to create room. Please try again.");
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ backgroundColor: "rgba(0,0,0,0.65)", backdropFilter: "blur(6px)" }}
    >
      <div
        className="flex min-h-full items-center justify-center p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className="relative w-full max-w-lg rounded-2xl border border-white/10 bg-[#12122a] p-6 shadow-2xl my-4"
          style={{ animation: "modalIn 0.2s ease" }}
        >
          {/* Close */}
          <button
            onClick={onClose}
            className="absolute cursor-pointer right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-gray-500 transition hover:bg-white/10 hover:text-white"
            aria-label="Close modal"
          >
            ✕
          </button>

          {/* Header */}
          <h2 className="mb-5 text-xl font-bold text-white">Create a new room</h2>
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">

            {/* ── Topic grid ── */}
            <div>
              <label className="mb-3 block text-sm font-semibold text-gray-300">
                Topic{" "}
                <span className="text-violet-400">*</span>
                <span className="ml-2 text-xs font-normal text-gray-500">
                  {topics.length}/{MAX_TOPICS} selected
                </span>
              </label>
              <div className="grid grid-cols-3 gap-2 max-h-[200px] overflow-y-auto pr-1 pb-1"
                style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(139, 92, 246, 0.5) transparent' }}>
                {TOPICS.map((t) => (
                  <button
                    type="button"
                    key={t.label}
                    onClick={() => toggleTopic(t.label)}
                    disabled={!topics.includes(t.label) && topics.length >= MAX_TOPICS}
                    className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2 text-center transition-all cursor-pointer ${topics.includes(t.label)
                      ? "border-violet-500 bg-violet-600/20 text-white shadow-lg shadow-violet-500/10"
                      : topics.length >= MAX_TOPICS
                        ? "border-white/5 bg-white/[0.02] text-gray-600 cursor-not-allowed opacity-40"
                        : "border-white/10 bg-white/5 text-gray-400 hover:border-violet-400/40 hover:bg-white/10 hover:text-white"
                      }`}
                  >
                    <span className="text-lg leading-none">{t.emoji}</span>
                    <span className="text-[10px] font-medium leading-tight">{t.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Language & Level Grid ── */}
            <div className="grid grid-cols-2 gap-4">
              {/* ── Language dropdown ── */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-300">
                  Language <span className="text-violet-400">*</span>
                </label>
                <CustomSelect
                  value={language}
                  onChange={(val) => setLanguage(val)}
                  options={Object.entries(LANGUAGE_MAP).map(([code, { label }]) => ({ value: code, label }))}
                  placeholder="Select..."
                  className="w-full"
                  buttonClassName="bg-white/5 px-4 py-3 text-sm text-white"
                />
              </div>

              {/* ── Level dropdown ── */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-300">
                  Level <span className="text-violet-400">*</span>
                </label>
                <CustomSelect
                  value={level}
                  onChange={(val) => setLevel(val)}
                  options={Object.entries(LEVEL_MAP).map(([code, { label }]) => ({ value: code, label }))}
                  placeholder="Select..."
                  className="w-full"
                  buttonClassName="bg-white/5 px-4 py-3 text-sm text-white"
                />
              </div>
            </div>

            {/* ── Max participants slider ── */}
            <div>
              <label htmlFor="participants-slider" className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-300">
                <span>Max Participants <span className="text-violet-400">*</span></span>
                <span className="text-gray-300 font-bold">{maxParticipants} <span className="text-xs font-normal text-gray-300">people</span></span>
              </label>
              <div className="mt-4 px-2">
                <input
                  id="participants-slider"
                  type="range"
                  min={MIN_PARTICIPANTS}
                  max={MAX_PARTICIPANTS}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-violet-400"
                  style={{
                    background: `linear-gradient(to right, #a78bfa ${((maxParticipants - MIN_PARTICIPANTS) / (MAX_PARTICIPANTS - MIN_PARTICIPANTS)) * 100}%, rgba(255, 255, 255, 0.1) ${((maxParticipants - MIN_PARTICIPANTS) / (MAX_PARTICIPANTS - MIN_PARTICIPANTS)) * 100}%)`
                  }}
                />
                <div className="flex justify-between text-xs text-gray-500 mt-2 px-1">
                  <span>{MIN_PARTICIPANTS}</span>
                  <span>{MAX_PARTICIPANTS}</span>
                </div>
              </div>
            </div>

            {/* ── Error ── */}
            {error && (
              <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
                {error}
              </p>
            )}

            {/* ── Actions ── */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 cursor-pointer rounded-xl border border-white/10 py-3 text-sm font-semibold text-gray-400 transition hover:border-white/20 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!isValid || submitting}
                className="flex-1 cursor-pointer rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white transition hover:bg-violet-500 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {submitting ? "Creating..." : "Create Room"}
              </button>
            </div>
          </form>
        </div>

        <style jsx>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
        .overflow-y-auto::-webkit-scrollbar {
          width: 4px;
        }
        .overflow-y-auto::-webkit-scrollbar-track {
          background: transparent;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb {
          background: rgba(139, 92, 246, 0.3);
          border-radius: 4px;
        }
        .overflow-y-auto::-webkit-scrollbar-thumb:hover {
          background: rgba(139, 92, 246, 0.5);
        }
      `}</style>
      </div>  {/* end min-h-full wrapper */}
    </div>
  );
}
