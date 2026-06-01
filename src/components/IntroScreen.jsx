import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import { TextFlippingBoard } from "./ui/text-flipping-board";

// ── Messages for the flip board ──────────────────────────────────────────────
const MESSAGES = [
  "50% OF PATIENTS\nRE-INJURE AT HOME.\nWE FIX THAT.",
  "33 BODY POINTS\nTRACKED IN\nREAL TIME.",
  "CLINICAL RULES.\nAI COACHING.\nZERO COST.",
  "YOUR PHONE IS NOW\nYOUR PERSONAL\nPHYSIOTHERAPIST.",
  "START YOUR\nRECOVERY\nNOW.",
];

// ── Stats ────────────────────────────────────────────────────────────────────
const STATS = [
  { value: "33", label: "Body Landmarks" },
  { value: "3", label: "Exercises" },
  { value: "0ms", label: "Upload Lag" },
  { value: "₹0", label: "Cost" },
];

// ── How it works ─────────────────────────────────────────────────────────────
const STEPS = [
  {
    number: "01",
    title: "Open Your Camera",
    desc: "No app download. Just tap and allow camera access in your browser.",
    icon: "📱",
  },
  {
    number: "02",
    title: "AI Tracks Your Body",
    desc: "Google MediaPipe maps 33 landmarks on your body in real-time at 30fps.",
    icon: "🤖",
  },
  {
    number: "03",
    title: "Get Coached Instantly",
    desc: "Clinical angle thresholds + Groq LLaMA 3 give you a physiotherapist's cue in under 500ms.",
    icon: "⚡",
  },
];

// ── Exercises ────────────────────────────────────────────────────────────────
const EXERCISES = [
  {
    id: "squat",
    name: "Therapeutic Squat",
    tag: "KNEE / HIP REHAB",
    rules: ["Knee flexion 85–100°", "No valgus (knees caving)", "Hip symmetry ±10°"],
    color: "#84cc16",
  },
  {
    id: "knee-ext",
    name: "Knee Extension",
    tag: "POST-SURGERY",
    rules: ["Start at 80–95°", "Full extension 0–15°", "No hip compensation"],
    color: "#22d3ee",
  },
  {
    id: "shoulder",
    name: "Shoulder Abduction",
    tag: "SHOULDER REHAB",
    rules: ["Target 0–90°", "Elevation <15° shrug", "Elbow bend <15°"],
    color: "#a78bfa",
  },
];

// ── Fade-in section wrapper ───────────────────────────────────────────────────
function FadeInSection({ children, delay = 0, className = "" }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-60px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Exercise Card ─────────────────────────────────────────────────────────────
function ExerciseCard({ ex, index }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-40px" });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, x: -20 }}
      animate={isInView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.5, delay: index * 0.12, ease: [0.22, 1, 0.36, 1] }}
      style={{ borderColor: `${ex.color}22` }}
      className="border rounded-2xl p-5 bg-[#0f0f0f]"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <span
            className="text-[10px] font-mono tracking-widest px-2 py-0.5 rounded-full"
            style={{ color: ex.color, backgroundColor: `${ex.color}18` }}
          >
            {ex.tag}
          </span>
          <h3 className="text-white font-bold text-base mt-2">{ex.name}</h3>
        </div>
        <div
          className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
          style={{ backgroundColor: ex.color, boxShadow: `0 0 8px ${ex.color}` }}
        />
      </div>
      <div className="space-y-1.5">
        {ex.rules.map((rule) => (
          <div key={rule} className="flex items-center gap-2">
            <span style={{ color: ex.color }} className="text-xs">—</span>
            <span className="text-gray-400 text-xs font-mono">{rule}</span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function IntroScreen({ onEnter }) {
  const [msgIdx, setMsgIdx] = useState(0);
  const [exiting, setExiting] = useState(false);

  const next = useCallback(() => setMsgIdx((i) => (i + 1) % MESSAGES.length), []);

  useEffect(() => {
    const id = setInterval(next, 6500);
    return () => clearInterval(id);
  }, [next]);

  const handleEnter = () => {
    setExiting(true);
    setTimeout(onEnter, 500);
  };

  return (
    <AnimatePresence>
      {!exiting && (
        <motion.div
          key="intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-screen bg-[#080808] text-white overflow-x-hidden"
        >
          {/* ── Top Nav ── */}
          <div className="flex items-center justify-between px-5 pt-6 pb-2">
            <span className="text-[10px] font-mono text-gray-600 tracking-[0.3em] uppercase">
              v1.0.0
            </span>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-400 animate-pulse" />
              <span className="text-[10px] font-mono text-lime-400 tracking-widest uppercase">
                Live
              </span>
            </div>
          </div>

          {/* ── Hero Section ── */}
          <section className="px-5 pt-4 pb-8 flex flex-col items-center gap-6">
            {/* Wordmark */}
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="text-center"
            >
              <p className="text-[10px] font-mono text-gray-500 tracking-[0.35em] uppercase mb-2">
                MediaPipe × Groq LLaMA 3
              </p>
              <h1 className="text-[52px] font-black tracking-tight leading-none">
                Rehab<span className="text-lime-400">.AI</span>
              </h1>
              <p className="text-gray-400 text-sm mt-2 leading-relaxed max-w-[280px] mx-auto">
                Real-time physiotherapy form correction — right in your browser.
              </p>
            </motion.div>

            {/* Flip Board */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              <TextFlippingBoard text={MESSAGES[msgIdx]} duration={2.4} />
            </motion.div>

            {/* CTA Button */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center gap-3 w-full"
            >
              <button
                id="enter-app-btn"
                onClick={handleEnter}
                className="w-full max-w-xs bg-lime-400 text-black font-bold py-4 rounded-xl text-sm tracking-widest uppercase active:scale-95 transition-transform"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                Start Rehab Session →
              </button>
              <p className="text-[10px] font-mono text-gray-600 tracking-widest uppercase">
                No download · No signup · Free
              </p>
            </motion.div>
          </section>

          {/* ── Stats Bar ── */}
          <FadeInSection>
            <div className="mx-5 mb-8 rounded-2xl bg-[#0f0f0f] border border-white/[0.06] overflow-hidden">
              <div className="grid grid-cols-4 divide-x divide-white/[0.06]">
                {STATS.map((s) => (
                  <div key={s.label} className="flex flex-col items-center justify-center py-5 px-1 gap-1">
                    <span className="text-lime-400 font-black text-xl font-mono leading-none">
                      {s.value}
                    </span>
                    <span className="text-gray-600 text-[9px] font-mono tracking-wide text-center leading-tight">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </FadeInSection>

          {/* ── How It Works ── */}
          <FadeInSection className="px-5 mb-10">
            <p className="text-[10px] font-mono text-gray-600 tracking-[0.35em] uppercase mb-4">
              How it works
            </p>
            <div className="space-y-4">
              {STEPS.map((step, i) => (
                <FadeInSection key={step.number} delay={i * 0.1}>
                  <div className="flex gap-4 items-start">
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#161616] border border-white/[0.07] flex items-center justify-center text-lg">
                      {step.icon}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-mono text-lime-400/70 tracking-widest">
                          {step.number}
                        </span>
                        <h3 className="text-sm font-bold text-white">{step.title}</h3>
                      </div>
                      <p className="text-gray-500 text-xs leading-relaxed">{step.desc}</p>
                    </div>
                  </div>
                </FadeInSection>
              ))}
            </div>
          </FadeInSection>

          {/* ── Divider ── */}
          <div className="mx-5 mb-10 h-px bg-gradient-to-r from-transparent via-white/[0.08] to-transparent" />

          {/* ── Exercise Cards ── */}
          <FadeInSection className="px-5 mb-10">
            <p className="text-[10px] font-mono text-gray-600 tracking-[0.35em] uppercase mb-4">
              Clinical exercises
            </p>
            <div className="space-y-3">
              {EXERCISES.map((ex, i) => (
                <ExerciseCard key={ex.id} ex={ex} index={i} />
              ))}
            </div>
          </FadeInSection>

          {/* ── Trust Bar ── */}
          <FadeInSection className="px-5 mb-10">
            <div className="rounded-2xl bg-[#0f0f0f] border border-white/[0.06] p-5">
              <p className="text-[10px] font-mono text-gray-600 tracking-[0.35em] uppercase mb-4">
                Powered by
              </p>
              <div className="space-y-3">
                {[
                  {
                    name: "Google MediaPipe",
                    desc: "Industry-standard real-time pose estimation. Runs entirely in-browser via WebAssembly. No data leaves your device.",
                    badge: "On-device AI",
                    color: "#4ade80",
                  },
                  {
                    name: "Groq LLaMA 3.3 70B",
                    desc: "World's fastest LLM inference. Sub-500ms coaching feedback. Free tier, no credit card.",
                    badge: "Free API",
                    color: "#fb923c",
                  },
                  {
                    name: "APTA Clinical Guidelines",
                    desc: "Joint angle thresholds sourced from American Physical Therapy Association rehabilitation protocols.",
                    badge: "Evidence-based",
                    color: "#818cf8",
                  },
                ].map((item) => (
                  <div key={item.name} className="flex items-start gap-3">
                    <div
                      className="w-1 h-1 rounded-full mt-2 flex-shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white text-sm font-semibold">{item.name}</span>
                        <span
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                          style={{ color: item.color, backgroundColor: `${item.color}18` }}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs leading-relaxed mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </FadeInSection>

          {/* ── Bottom CTA ── */}
          <FadeInSection className="px-5 pb-16">
            <div className="rounded-2xl bg-lime-400/[0.06] border border-lime-400/20 p-6 flex flex-col items-center gap-4 text-center">
              <div className="w-10 h-10 rounded-xl bg-lime-400/10 flex items-center justify-center text-2xl">
                🏃
              </div>
              <div>
                <h2 className="text-white font-bold text-lg mb-1">Ready to start?</h2>
                <p className="text-gray-500 text-xs max-w-[220px] mx-auto leading-relaxed">
                  Stand 2–3 metres from your phone. Ensure your full body is visible.
                </p>
              </div>
              <button
                id="enter-app-btn-2"
                onClick={handleEnter}
                className="w-full bg-lime-400 text-black font-bold py-4 rounded-xl text-sm tracking-widest uppercase active:scale-95 transition-transform"
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                Launch Camera →
              </button>
              <p className="text-[10px] font-mono text-gray-700 tracking-widest">
                WORKS ON ANY MODERN MOBILE BROWSER
              </p>
            </div>
          </FadeInSection>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
