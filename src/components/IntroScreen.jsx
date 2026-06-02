import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence, useInView } from "motion/react";
import { TextFlippingBoard } from "./ui/text-flipping-board";
import "./Dashboard.css";

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
  { value: "33", label: "Landmarks" },
  { value: "3",  label: "Exercises" },
  { value: "0ms", label: "Lag" },
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
    color: "#00FF88",
  },
  {
    id: "knee-ext",
    name: "Knee Extension",
    tag: "POST-SURGERY",
    rules: ["Start at 80–95°", "Full extension 0–15°", "No hip compensation"],
    color: "#00d4ff",
  },
  {
    id: "shoulder",
    name: "Shoulder Abduction",
    tag: "SHOULDER REHAB",
    rules: ["Target 0–90°", "Elevation <15° shrug", "Elbow bend <15°"],
    color: "#a78bfa",
  },
];

// ── Particle Canvas (same as Dashboard) ──────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles = Array.from({ length: 45 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.4,
      o: Math.random() * 0.5 + 0.2,
    }));

    let raf;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        p.o = Math.max(0.1, Math.min(0.55, p.o + (Math.random() - 0.5) * 0.02));
        ctx.fillStyle = `rgba(0,255,136,${p.o})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 140) {
            ctx.strokeStyle = `rgba(0,255,136,${0.08 * (1 - dist / 140)})`;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();

    const onResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);
  return <canvas id="db-particle-canvas" ref={canvasRef} />;
}

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
      className="db-card"
      style={{ borderColor: `${ex.color}33`, marginBottom: 12 }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <span
            style={{
              fontSize: 10, fontFamily: "'Courier New', monospace",
              letterSpacing: "0.1em", padding: "2px 8px", borderRadius: 20,
              color: ex.color, background: `${ex.color}18`,
            }}
          >
            {ex.tag}
          </span>
          <div style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 15, marginTop: 6 }}>
            {ex.name}
          </div>
        </div>
        <div
          style={{
            width: 8, height: 8, borderRadius: "50%", marginTop: 4, flexShrink: 0,
            background: ex.color, boxShadow: `0 0 8px ${ex.color}`,
          }}
        />
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
        {ex.rules.map((rule) => (
          <div key={rule} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: ex.color, fontSize: 12 }}>—</span>
            <span style={{ color: "var(--text-secondary)", fontSize: 11, fontFamily: "'Courier New', monospace" }}>
              {rule}
            </span>
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
          /* re-use the same root class as Session/Dashboard for identical bg */
          className="db-root"
          style={{ overflowX: "hidden", minHeight: "100vh" }}
        >
          {/* ── Shared particle background ── */}
          <ParticleCanvas />

          <div style={{ position: "relative", zIndex: 10 }}>

            {/* ── Top Nav ── */}
            <div style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "20px 16px 8px",
            }}>
              <span style={{
                fontSize: 10, fontFamily: "'Courier New', monospace",
                color: "rgba(176,184,212,0.35)", letterSpacing: "0.3em", textTransform: "uppercase",
              }}>
                v1.0.0
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 7, height: 7, borderRadius: "50%", background: "var(--primary-neon)",
                  display: "inline-block", animation: "heartbeat 1.4s ease-in-out infinite",
                }} />
                <span style={{
                  fontSize: 10, fontFamily: "'Courier New', monospace",
                  color: "var(--primary-neon)", letterSpacing: "0.2em", textTransform: "uppercase",
                }}>
                  Live
                </span>
              </div>
            </div>

            {/* ── Hero Section ── */}
            <section style={{
              padding: "12px 16px 28px",
              display: "flex", flexDirection: "column", alignItems: "center", gap: 22,
            }}>

              {/* Wordmark */}
              <motion.div
                initial={{ opacity: 0, y: -16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                style={{ textAlign: "center" }}
              >
                <p style={{
                  fontSize: 10, fontFamily: "'Courier New', monospace",
                  color: "rgba(176,184,212,0.45)", letterSpacing: "0.35em",
                  textTransform: "uppercase", margin: "0 0 10px",
                }}>
                  MediaPipe × Groq LLaMA 3
                </p>
                {/* Logo — identical gradient to .db-header-title in Dashboard */}
                <h1 style={{
                  fontSize: 52, fontWeight: 900, letterSpacing: "-0.02em",
                  lineHeight: 1, margin: 0,
                }}>
                  <span style={{ color: "var(--text-primary)" }}>Rehab</span>
                  <span style={{
                    background: "linear-gradient(135deg, var(--primary-neon), var(--secondary-lime))",
                    WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    animation: "glowPulse 3s ease-in-out infinite",
                  }}>.AI</span>
                </h1>
                <p style={{
                  color: "var(--text-secondary)", fontSize: 13,
                  margin: "10px auto 0", lineHeight: 1.6, maxWidth: 280,
                }}>
                  Real-time physiotherapy form correction — right in your browser.
                </p>
              </motion.div>

              {/* Flip Board */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3, duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                style={{ width: "100%" }}
              >
                <TextFlippingBoard text={MESSAGES[msgIdx]} duration={2.4} />
              </motion.div>

              {/* CTA — same class as every other primary action */}
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.55, duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, width: "100%" }}
              >
                <button
                  id="enter-app-btn"
                  onClick={handleEnter}
                  className="db-start-btn"
                  style={{ maxWidth: 320 }}
                >
                  Start Rehab Session →
                </button>
                <p style={{
                  fontSize: 10, fontFamily: "'Courier New', monospace",
                  color: "rgba(176,184,212,0.35)", letterSpacing: "0.2em",
                  textTransform: "uppercase", margin: 0,
                }}>
                  No download · No signup · Free
                </p>
              </motion.div>
            </section>

            {/* ── Stats Bar — matches db-stat-box layout ── */}
            <FadeInSection>
              <div className="db-card" style={{ margin: "0 16px 16px", padding: 0, overflow: "hidden" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)" }}>
                  {STATS.map((s, i) => (
                    <div
                      key={s.label}
                      className="db-stat-box"
                      style={{
                        borderRadius: 0, border: "none",
                        borderRight: i < 3 ? "1px solid rgba(0,255,136,0.08)" : "none",
                        animationDelay: `${0.1 + i * 0.08}s`,
                        padding: "14px 6px",
                      }}
                    >
                      <div className="db-stat-value" style={{ fontSize: 20 }}>{s.value}</div>
                      <div className="db-stat-label">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeInSection>

            {/* ── How It Works — inside a db-card ── */}
            <FadeInSection>
              <div className="db-card" style={{ margin: "0 16px 16px" }}>
                <div className="db-card-title">How it works</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  {STEPS.map((step, i) => (
                    <FadeInSection key={step.number} delay={i * 0.1}>
                      <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                        <div style={{
                          flexShrink: 0, width: 38, height: 38, borderRadius: 10,
                          background: "rgba(0,255,136,0.08)", border: "1px solid rgba(0,255,136,0.15)",
                          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
                        }}>
                          {step.icon}
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                            <span style={{
                              fontSize: 10, fontFamily: "'Courier New', monospace",
                              color: "rgba(0,255,136,0.7)", letterSpacing: "0.15em",
                            }}>
                              {step.number}
                            </span>
                            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                              {step.title}
                            </span>
                          </div>
                          <p style={{ color: "var(--text-secondary)", fontSize: 12, lineHeight: 1.5, margin: 0 }}>
                            {step.desc}
                          </p>
                        </div>
                      </div>
                    </FadeInSection>
                  ))}
                </div>
              </div>
            </FadeInSection>

            {/* ── Divider ── */}
            <div style={{
              margin: "0 16px 16px", height: 1,
              background: "linear-gradient(to right, transparent, rgba(0,255,136,0.1), transparent)",
            }} />

            {/* ── Exercise Cards ── */}
            <FadeInSection>
              <div style={{ margin: "0 16px 16px" }}>
                <div className="db-card-title" style={{ marginBottom: 12 }}>Clinical exercises</div>
                {EXERCISES.map((ex, i) => (
                  <ExerciseCard key={ex.id} ex={ex} index={i} />
                ))}
              </div>
            </FadeInSection>

            {/* ── Trust Bar — inside a db-card ── */}
            <FadeInSection>
              <div className="db-card" style={{ margin: "0 16px 16px" }}>
                <div className="db-card-title">Powered by</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {[
                    {
                      name: "Google MediaPipe",
                      desc: "Industry-standard real-time pose estimation. Runs entirely in-browser via WebAssembly. No data leaves your device.",
                      badge: "On-device AI",
                      color: "#00FF88",
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
                    <div key={item.name} style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                      <div style={{
                        width: 4, height: 4, borderRadius: "50%", marginTop: 7, flexShrink: 0,
                        background: item.color, boxShadow: `0 0 6px ${item.color}`,
                      }} />
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                            {item.name}
                          </span>
                          <span style={{
                            fontSize: 9, fontFamily: "'Courier New', monospace",
                            padding: "1px 6px", borderRadius: 10,
                            color: item.color, background: `${item.color}18`,
                          }}>
                            {item.badge}
                          </span>
                        </div>
                        <p style={{ fontSize: 11, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                          {item.desc}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeInSection>

            {/* ── Bottom CTA — matches the Dashboard's featured card style ── */}
            <FadeInSection>
              <div
                className="db-card"
                style={{
                  margin: "0 16px 80px",
                  background: "linear-gradient(135deg, rgba(0,255,136,0.08), rgba(0,212,255,0.04))",
                  borderColor: "rgba(0,255,136,0.25)",
                  display: "flex", flexDirection: "column",
                  alignItems: "center", gap: 16, textAlign: "center",
                }}
              >
                <div style={{
                  width: 44, height: 44, borderRadius: 12,
                  background: "rgba(0,255,136,0.1)", border: "1px solid rgba(0,255,136,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24,
                  animation: "iconFloat 3s ease-in-out infinite",
                }}>
                  🏃
                </div>
                <div>
                  <h2 style={{ color: "var(--text-primary)", fontWeight: 700, fontSize: 18, margin: "0 0 4px" }}>
                    Ready to start?
                  </h2>
                  <p style={{
                    color: "var(--text-secondary)", fontSize: 12,
                    maxWidth: 240, margin: "0 auto", lineHeight: 1.6,
                  }}>
                    Stand 2–3 metres from your phone. Ensure your full body is visible.
                  </p>
                </div>
                <button
                  id="enter-app-btn-2"
                  onClick={handleEnter}
                  className="db-start-btn"
                  style={{ width: "100%" }}
                >
                  Launch Camera →
                </button>
                <p style={{
                  fontSize: 10, fontFamily: "'Courier New', monospace",
                  color: "rgba(176,184,212,0.3)", letterSpacing: "0.15em",
                  textTransform: "uppercase", margin: 0,
                }}>
                  Works on any modern mobile browser
                </p>
              </div>
            </FadeInSection>

          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
