import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale,
  PointElement, LineElement, BarElement,
  Tooltip, Filler,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
  getSessions, getTodaySessions, getWeeklyActivity,
  getAggregatedIssues, getExerciseBreakdownToday,
  getLast7DaysFormScores, getProgressForExercise, clearAllSessions,
} from '../utils/sessions';
import './Dashboard.css';

ChartJS.register(
  CategoryScale, LinearScale,
  PointElement, LineElement, BarElement,
  Tooltip, Filler,
);

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(iso) {
  const d = new Date(iso);
  const today = new Date();
  const diff = Math.floor((today - d) / 86400000);
  if (diff === 0) return `Today ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  if (diff === 1) return `Yesterday ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}

function formatDuration(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}

function scoreClass(score) {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  return 'fair';
}

function scoreColor(score) {
  if (score >= 85) return '#00FF88';
  if (score >= 70) return '#AAFF00';
  return '#ffa502';
}

function exerciseLabel(id) {
  return { squat: 'Squat', 'knee-ext': 'Knee Ext.', shoulder: 'Shoulder Abd.' }[id] || id;
}

function exerciseIcon(id) {
  return { squat: '🦵', 'knee-ext': '🦵', shoulder: '💪' }[id] || '🏋️';
}

// ── Particle background ───────────────────────────────────────────────────────
function ParticleCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
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
      // lines
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
    window.addEventListener('resize', onResize);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, []);
  return <canvas id="db-particle-canvas" ref={canvasRef} />;
}

// ── Animated counter ──────────────────────────────────────────────────────────
function AnimatedNumber({ value }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const target = Number(value) || 0;
    if (target === 0) { setDisplay(0); return; }
    const dur = 900;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / dur, 1);
      const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      setDisplay(Math.round(target * ease));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [value]);
  return <>{display}</>;
}

// ── Ripple on tap ─────────────────────────────────────────────────────────────
function addRipple(e, el) {
  const rect = el.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height);
  const touch = e.touches ? e.touches[0] : e;
  const x = (touch.clientX - rect.left) - size / 2;
  const y = (touch.clientY - rect.top) - size / 2;
  const ripple = document.createElement('div');
  ripple.className = 'db-ripple';
  ripple.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;`;
  el.appendChild(ripple);
  if (navigator.vibrate) navigator.vibrate(8);
  setTimeout(() => ripple.remove(), 600);
}

// ── Confetti ──────────────────────────────────────────────────────────────────
function fireConfetti() {
  for (let i = 0; i < 40; i++) {
    const el = document.createElement('div');
    el.style.cssText = `
      position:fixed; pointer-events:none; z-index:9999;
      left:${Math.random() * 100}%; top:-10px;
      font-size:${Math.random() * 18 + 16}px;
      animation: confettiFall ${Math.random() * 2 + 2}s ease forwards;
      opacity:${Math.random() * 0.7 + 0.3};
    `;
    el.textContent = ['🎉','✨','⭐','🌟','💫','🎊'][Math.floor(Math.random() * 6)];
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 4500);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
//  DASHBOARD TAB — HOME
// ─────────────────────────────────────────────────────────────────────────────
function HomeTab({ onStartSession }) {
  const sessions = getSessions();
  const todaySessions = getTodaySessions();
  const totalRepsToday = todaySessions.reduce((s, x) => s + x.reps, 0);
  const avgScore = todaySessions.length
    ? Math.round(todaySessions.reduce((s, x) => s + x.formScore, 0) / todaySessions.length)
    : 0;
  const breakdown = getExerciseBreakdownToday();
  const weekly = getWeeklyActivity();
  const maxWeekly = Math.max(...weekly.map((d) => d.reps), 1);
  const issues = getAggregatedIssues();
  const maxIssue = Math.max(...issues.map((i) => i.count), 1);
  const { labels: chartLabels, scores: chartScores } = getLast7DaysFormScores();

  const lastSession = sessions.length ? sessions[sessions.length - 1] : null;
  const displayScore = lastSession ? lastSession.formScore : 0;
  const recentSessions = [...sessions].reverse().slice(0, 5);

  // ── Chart configs ────────────────────────────────────────────────
  const lineData = {
    labels: chartLabels,
    datasets: [{
      label: 'Form Score',
      data: chartScores,
      borderColor: '#00FF88',
      backgroundColor: 'rgba(0,255,136,0.12)',
      borderWidth: 3, fill: true, tension: 0.4,
      pointBackgroundColor: '#00FF88',
      pointRadius: 5, pointHoverRadius: 7,
      spanGaps: true,
    }],
  };

  const barData = {
    labels: ['Squat', 'Knee Ext.', 'Shoulder'],
    datasets: [{
      data: [breakdown.squat, breakdown['knee-ext'], breakdown.shoulder],
      backgroundColor: ['rgba(0,255,136,0.75)', 'rgba(170,255,0,0.75)', 'rgba(0,212,255,0.75)'],
      borderColor: ['#00FF88', '#AAFF00', '#00d4ff'],
      borderWidth: 2, borderRadius: 8,
    }],
  };

  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        beginAtZero: true, max: 100,
        grid: { color: 'rgba(0,255,136,0.08)' },
        ticks: { color: 'rgba(176,184,212,0.7)', font: { size: 10 } },
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(176,184,212,0.7)', font: { size: 10 } },
      },
    },
    animation: { duration: 1400, easing: 'easeInOutQuart' },
  };

  const barOpts = {
    ...chartOpts,
    indexAxis: 'y',
    scales: {
      ...chartOpts.scales,
      y: {
        grid: { display: false },
        ticks: { color: 'rgba(176,184,212,0.7)', font: { size: 10 } },
      },
      x: {
        beginAtZero: true,
        grid: { color: 'rgba(0,255,136,0.08)' },
        ticks: { color: 'rgba(176,184,212,0.7)', font: { size: 10 } },
      },
    },
  };

  return (
    <div className="db-container">
      {/* Today's stats */}
      <div className="db-card" style={{ animationDelay: '0.1s' }}>
        <div className="db-card-title">Today's Session</div>
        {todaySessions.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: '12px 0' }}>
            No sessions recorded today.<br />
            <button className="db-start-btn" style={{ marginTop: 12 }} onClick={() => onStartSession('squat')}>
              Start First Session →
            </button>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="db-stat-box" style={{ animationDelay: '0.25s' }}>
              <div className="db-stat-value"><AnimatedNumber value={totalRepsToday} /></div>
              <div className="db-stat-label">Total Reps</div>
            </div>
            <div className="db-stat-box" style={{ animationDelay: '0.35s' }}>
              <div className="db-stat-value"><AnimatedNumber value={avgScore} /></div>
              <div className="db-stat-label">Avg Form Score</div>
            </div>
          </div>
        )}
      </div>

      {/* Exercise breakdown */}
      <div className="db-card" style={{ animationDelay: '0.2s' }}>
        <div className="db-card-title">Exercise Breakdown</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { id: 'squat', label: 'Squats', count: breakdown.squat },
            { id: 'knee-ext', label: 'Knee Ext.', count: breakdown['knee-ext'] },
            { id: 'shoulder', label: 'Shoulder', count: breakdown.shoulder },
          ].map((ex, i) => (
            <div
              key={ex.id}
              className="db-exercise-card"
              style={{ animationDelay: `${0.3 + i * 0.1}s` }}
              onClick={(e) => { addRipple(e, e.currentTarget); onStartSession(ex.id); }}
            >
              <div className="db-exercise-icon">{exerciseIcon(ex.id)}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 4 }}>
                {ex.label}
              </div>
              <div className="db-exercise-reps"><AnimatedNumber value={ex.count} /></div>
              <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>reps today</div>
            </div>
          ))}
        </div>
      </div>

      {/* Last session form score */}
      {lastSession && (
        <div className="db-card" style={{ animationDelay: '0.3s' }}>
          <div className="db-card-title">Last Session — {exerciseLabel(lastSession.exercise)}</div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
              <svg width="80" height="80" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="40" cy="40" r="35" fill="none" stroke="rgba(0,255,136,0.1)" strokeWidth="4" />
                <circle
                  className="db-score-ring-fill"
                  cx="40" cy="40" r="35"
                  fill="none"
                  stroke={scoreColor(displayScore)}
                  strokeWidth="4"
                  strokeLinecap="round"
                />
              </svg>
              <div
                className={`db-score-circle ${scoreClass(displayScore)}`}
                style={{ position: 'absolute', inset: 0, background: 'transparent' }}
              >
                <AnimatedNumber value={displayScore} />
              </div>
            </div>
            <div style={{ marginLeft: 16, flex: 1 }}>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 3 }}>Form Quality</div>
              <div
                className="db-score-status"
                style={{ fontSize: 15, fontWeight: 700, color: scoreColor(displayScore), marginBottom: 6 }}
              >
                {displayScore >= 85 ? 'Excellent' : displayScore >= 70 ? 'Good' : 'Keep Improving'}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                {lastSession.reps} reps · {formatDuration(lastSession.duration)} · {lastSession.issueCount} issues
              </div>
            </div>
          </div>

          {/* Feedback box */}
          <div className="db-feedback-box">
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, position: 'relative', zIndex: 1 }}>
              <div className="db-feedback-dot" />
              <span style={{ fontSize: 12, color: 'var(--accent-blue)', fontWeight: 600 }}>Last Coaching Cue</span>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, position: 'relative', zIndex: 1 }}>
              {lastSession.issueCount === 0
                ? '✓ Perfect form detected. Outstanding technique!'
                : lastSession.issueMessages?.[0] || 'Keep working on your form consistency.'}
            </div>
          </div>
        </div>
      )}

      {/* Weekly activity */}
      <div className="db-card" style={{ animationDelay: '0.35s' }}>
        <div className="db-card-title">Weekly Activity</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 6, marginTop: 8 }}>
          {weekly.map((day, i) => (
            <div key={day.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
              <div className="db-activity-bar">
                <div
                  className="db-activity-fill"
                  style={{
                    height: `${(day.reps / maxWeekly) * 100}%`,
                    animationDelay: `${0.4 + i * 0.07}s`,
                  }}
                />
              </div>
              <span style={{ fontSize: 9, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Form score chart */}
      <div className="db-card" style={{ animationDelay: '0.4s' }}>
        <div className="db-card-title">Form Score — Last 7 Days</div>
        <div style={{ height: 220, marginTop: 8 }}>
          <Line data={lineData} options={chartOpts} />
        </div>
      </div>

      {/* Exercise performance chart */}
      <div className="db-card" style={{ animationDelay: '0.45s' }}>
        <div className="db-card-title">Reps Today by Exercise</div>
        <div style={{ height: 160, marginTop: 8 }}>
          <Bar data={barData} options={barOpts} />
        </div>
      </div>

      {/* Most common issues */}
      {issues.length > 0 && (
        <div className="db-card" style={{ animationDelay: '0.5s' }}>
          <div className="db-card-title">Most Common Form Issues</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {issues.map((issue, i) => (
              <div key={issue.label} style={{ display: 'flex', alignItems: 'center', gap: 10, animationDelay: `${0.5 + i * 0.08}s` }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', minWidth: 110 }}>{issue.label}</div>
                <div className="db-issue-bar">
                  <div
                    className={`db-issue-fill ${issue.severity}`}
                    style={{
                      width: `${(issue.count / maxIssue) * 100}%`,
                      animationDelay: `${0.55 + i * 0.08}s`,
                    }}
                  />
                </div>
                <div style={{ fontSize: 11, fontWeight: 600, fontFamily: 'Courier New', minWidth: 24, textAlign: 'right' }}>
                  {issue.count}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent sessions */}
      {recentSessions.length > 0 && (
        <div className="db-card" style={{ animationDelay: '0.55s' }}>
          <div className="db-card-title">Recent Sessions</div>
          {recentSessions.map((s) => (
            <div key={s.id} className="db-session-item">
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
                  {formatDate(s.date)}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 2 }}>
                  {exerciseLabel(s.exercise)} · {s.reps} reps · {formatDuration(s.duration)}
                </div>
              </div>
              <div
                className="db-session-score"
                style={{ fontSize: 20, fontWeight: 700, color: scoreColor(s.formScore) }}
              >
                {s.formScore}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  EXERCISES TAB
// ─────────────────────────────────────────────────────────────────────────────
const EXERCISE_DEFS = [
  {
    id: 'squat', icon: '🦵', label: 'Therapeutic Squat', tag: 'KNEE / HIP REHAB',
    color: '#00FF88',
    rules: ['Knee flexion 85–100°', 'No valgus (caving)', 'Hip symmetry ±10°'],
    desc: 'The gold standard post-knee or hip surgery. Strengthens quads and glutes while protecting the joint.',
  },
  {
    id: 'knee-ext', icon: '🦵', label: 'Seated Knee Extension', tag: 'POST-SURGERY',
    color: '#00d4ff',
    rules: ['Start at 80–95°', 'Full extension 0–15°', 'No hip compensation'],
    desc: 'Most prescribed ACL, meniscus and knee replacement protocol. Seated leg raise from 90° to full extension.',
  },
  {
    id: 'shoulder', icon: '💪', label: 'Shoulder Abduction', tag: 'SHOULDER REHAB',
    color: '#a78bfa',
    rules: ['Target range 0–90°', 'Elevation <15° (no shrug)', 'Elbow bend <15°'],
    desc: 'Core rotator cuff rehabilitation. Lateral arm raise tracking elevation and shrug compensation.',
  },
];

function ExercisesTab({ onStartSession }) {
  return (
    <div className="db-container">
      <div className="db-card" style={{ animationDelay: '0.1s', marginBottom: 8 }}>
        <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Tap any exercise to start a live session. Your phone camera will open and AI will coach your form in real-time.
        </div>
      </div>
      {EXERCISE_DEFS.map((ex, i) => (
        <div
          key={ex.id}
          className="db-card"
          style={{ animationDelay: `${0.15 + i * 0.1}s`, borderColor: `${ex.color}22` }}
          onClick={(e) => { addRipple(e, e.currentTarget); onStartSession(ex.id); }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
            <div>
              <span
                style={{
                  fontSize: 10, padding: '2px 8px', borderRadius: 20, fontFamily: 'Courier New',
                  color: ex.color, background: `${ex.color}18`, letterSpacing: '0.05em',
                }}
              >
                {ex.tag}
              </span>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 6 }}>
                {ex.icon} {ex.label}
              </div>
            </div>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: ex.color, boxShadow: `0 0 8px ${ex.color}`, marginTop: 4 }} />
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: 12 }}>
            {ex.desc}
          </div>
          <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 5 }}>
            {ex.rules.map((r) => (
              <div key={r} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: ex.color, fontSize: 11 }}>—</span>
                <span style={{ fontSize: 11, fontFamily: 'Courier New', color: 'rgba(176,184,212,0.8)' }}>{r}</span>
              </div>
            ))}
          </div>
          <button
            className="db-start-btn"
            style={{ background: ex.color }}
            onClick={(e) => { e.stopPropagation(); onStartSession(ex.id); }}
          >
            Start {ex.label} →
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PROGRESS TAB
// ─────────────────────────────────────────────────────────────────────────────
function ProgressTab() {
  const sessions = getSessions();
  const totalReps = sessions.reduce((s, x) => s + x.reps, 0);
  const totalTime = sessions.reduce((s, x) => s + x.duration, 0);
  const avgScore = sessions.length
    ? Math.round(sessions.reduce((s, x) => s + x.formScore, 0) / sessions.length)
    : 0;

  const squatProgress = getProgressForExercise('squat');
  const kneeProgress = getProgressForExercise('knee-ext');

  const makeChart = (progress) => ({
    labels: progress.map((p) => new Date(p.date).toLocaleDateString('en', { month: 'short', day: 'numeric' })),
    datasets: [{
      data: progress.map((p) => p.formScore),
      borderColor: '#00FF88', backgroundColor: 'rgba(0,255,136,0.1)',
      borderWidth: 2, fill: true, tension: 0.4,
      pointBackgroundColor: '#00FF88', pointRadius: 4,
    }],
  });

  const opts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      y: {
        min: 0, max: 100,
        grid: { color: 'rgba(0,255,136,0.08)' },
        ticks: { color: 'rgba(176,184,212,0.7)', font: { size: 9 } },
      },
      x: {
        grid: { display: false },
        ticks: { color: 'rgba(176,184,212,0.7)', font: { size: 9 }, maxTicksLimit: 5 },
      },
    },
    animation: { duration: 1200, easing: 'easeInOutQuart' },
  };

  return (
    <div className="db-container">
      {/* All-time stats */}
      <div className="db-card" style={{ animationDelay: '0.1s' }}>
        <div className="db-card-title">All-Time Stats</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Total Reps', val: totalReps },
            { label: 'Avg Score', val: avgScore },
            { label: 'Sessions', val: sessions.length },
            { label: 'Minutes', val: Math.round(totalTime / 60) },
          ].map((s, i) => (
            <div className="db-stat-box" key={s.label} style={{ animationDelay: `${0.2 + i * 0.08}s` }}>
              <div className="db-stat-value"><AnimatedNumber value={s.val} /></div>
              <div className="db-stat-label">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {squatProgress.length > 1 && (
        <div className="db-card" style={{ animationDelay: '0.25s' }}>
          <div className="db-card-title">🦵 Squat Form Score</div>
          <div style={{ height: 180 }}>
            <Line data={makeChart(squatProgress)} options={opts} />
          </div>
        </div>
      )}

      {kneeProgress.length > 1 && (
        <div className="db-card" style={{ animationDelay: '0.35s' }}>
          <div className="db-card-title">🦵 Knee Ext. Form Score</div>
          <div style={{ height: 180 }}>
            <Line data={makeChart(kneeProgress)} options={opts} />
          </div>
        </div>
      )}

      {sessions.length === 0 && (
        <div className="db-card" style={{ textAlign: 'center', padding: 32 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📈</div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
            Complete your first session to unlock progress charts.
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  PROFILE TAB
// ─────────────────────────────────────────────────────────────────────────────
function ProfileTab({ onClearData }) {
  const sessions = getSessions();
  const [cleared, setCleared] = useState(false);

  const handleClear = () => {
    clearAllSessions();
    setCleared(true);
    onClearData();
  };

  return (
    <div className="db-container">
      <div className="db-card" style={{ animationDelay: '0.1s' }}>
        <div className="db-card-title">Your Recovery</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { label: 'Sessions completed', val: sessions.length },
            { label: 'Best form score', val: sessions.length ? Math.max(...sessions.map(s => s.formScore)) : '--' },
            { label: 'Total reps completed', val: sessions.reduce((a, s) => a + s.reps, 0) },
          ].map((r) => (
            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(0,255,136,0.07)' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{r.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary-neon)', fontFamily: 'Courier New' }}>{r.val}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="db-card" style={{ animationDelay: '0.2s' }}>
        <div className="db-card-title">Powered By</div>
        {[
          { name: 'Google MediaPipe', badge: 'On-device AI', color: '#4ade80', desc: 'Real-time body tracking. 33 landmarks. No data leaves your device.' },
          { name: 'Groq LLaMA 3.3 70B', badge: 'Free API', color: '#fb923c', desc: 'Sub-500ms AI coaching. World\'s fastest LLM inference.' },
          { name: 'APTA Guidelines', badge: 'Evidence-based', color: '#818cf8', desc: 'Clinical thresholds from American Physical Therapy Association.' },
        ].map((p) => (
          <div key={p.name} style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{p.name}</span>
              <span style={{ fontSize: 9, padding: '1px 6px', borderRadius: 10, color: p.color, background: `${p.color}18`, fontFamily: 'Courier New' }}>{p.badge}</span>
            </div>
            <p style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
          </div>
        ))}
      </div>

      <div className="db-card" style={{ animationDelay: '0.3s', borderColor: 'rgba(255,71,87,0.2)' }}>
        <div className="db-card-title" style={{ color: '#ff4757' }}>Data Management</div>
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 14, lineHeight: 1.5 }}>
          Session data is stored locally in your browser. Clearing will permanently delete all session history and progress.
        </p>
        <button
          onClick={handleClear}
          style={{
            width: '100%', padding: '12px', borderRadius: 10, border: '1px solid rgba(255,71,87,0.4)',
            background: 'rgba(255,71,87,0.1)', color: '#ff4757', fontWeight: 600, fontSize: 13,
            cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            opacity: cleared ? 0.5 : 1,
          }}
          disabled={cleared}
        >
          {cleared ? '✓ Data Cleared' : 'Clear All Session Data'}
        </button>
      </div>

      <div style={{ textAlign: 'center', padding: '12px 0 4px', color: 'rgba(176,184,212,0.3)', fontSize: 11, fontFamily: 'Courier New' }}>
        REHAB.AI v1.0 · MIT LICENSE
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN DASHBOARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'home', label: 'Dashboard', icon: '📊' },
  { id: 'exercises', label: 'Exercises', icon: '🏋️' },
  { id: 'progress', label: 'Progress', icon: '📈' },
  { id: 'profile', label: 'Profile', icon: '👤' },
];

export default function Dashboard({ onStartSession, onBackToSession }) {
  const [activeTab, setActiveTab] = useState('home');
  const [refreshKey, setRefreshKey] = useState(0);

  const header = {
    home: { title: 'Rehab.AI', subtitle: 'Physiotherapy Dashboard' },
    exercises: { title: 'Exercises', subtitle: 'Available Workouts' },
    progress: { title: 'Progress', subtitle: 'Your Journey' },
    profile: { title: 'Profile', subtitle: 'Your Account' },
  }[activeTab];

  const handleClearData = () => setRefreshKey((k) => k + 1);

  return (
    <div className="db-root">
      <ParticleCanvas />
      <div style={{ position: 'relative', zIndex: 10 }}>
        {/* Header */}
        <div style={{ padding: '18px 16px 0', animation: 'slideDown 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s backwards' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <div>
              <div className="db-header-title">{header.title}</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{header.subtitle}</div>
            </div>
            <button
              onClick={onBackToSession}
              style={{
                background: 'rgba(0,255,136,0.1)', border: '1px solid rgba(0,255,136,0.25)',
                borderRadius: 10, padding: '8px 12px', color: 'var(--primary-neon)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent', letterSpacing: '0.04em',
              }}
            >
              📷 Session
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div key={`${activeTab}-${refreshKey}`}>
          {activeTab === 'home' && <HomeTab onStartSession={onStartSession} />}
          {activeTab === 'exercises' && <ExercisesTab onStartSession={onStartSession} />}
          {activeTab === 'progress' && <ProgressTab />}
          {activeTab === 'profile' && <ProfileTab onClearData={handleClearData} />}
        </div>

        {/* Bottom Nav */}
        <nav className="db-bottom-nav">
          {TABS.map((tab) => (
            <div
              key={tab.id}
              className={`db-nav-item${activeTab === tab.id ? ' active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="db-nav-icon">{tab.icon}</span>
              <span className="db-nav-label">{tab.label}</span>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
