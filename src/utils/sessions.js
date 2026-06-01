// src/utils/sessions.js

export function saveSession(exercise, reps, duration, issues = []) {
  const sessions = getSessions();

  // Aggregate issue types for analytics
  const issueTypes = {};
  issues.forEach((issue) => {
    const key = issue.joint ? `${issue.joint}:${issue.severity}` : issue.message;
    issueTypes[key] = (issueTypes[key] || 0) + 1;
  });

  const session = {
    id: Date.now(),
    date: new Date().toISOString(),
    exercise,
    reps,
    duration, // seconds
    issueCount: issues.length,
    issueTypes,             // { 'knee:high': 3, 'hip:medium': 1, ... }
    issueMessages: issues.slice(0, 20).map((i) => i.message), // last 20 raw messages
    formScore: Math.max(0, Math.min(100, 100 - issues.length * 5)),
  };
  sessions.push(session);
  localStorage.setItem('rehab_sessions', JSON.stringify(sessions));
  return session;
}

export function getSessions() {
  try {
    return JSON.parse(localStorage.getItem('rehab_sessions') || '[]');
  } catch {
    return [];
  }
}

export function getProgressForExercise(exercise) {
  const sessions = getSessions().filter((s) => s.exercise === exercise);
  return sessions.map((s) => ({
    date: s.date,
    reps: s.reps,
    formScore: s.formScore,
  }));
}

export function getTodaySessions() {
  const today = new Date().toDateString();
  return getSessions().filter((s) => new Date(s.date).toDateString() === today);
}

export function getWeeklyActivity() {
  const now = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = days.map((label, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - ((now.getDay() - i + 7) % 7));
    const dateStr = d.toDateString();
    const daySessions = getSessions().filter(
      (s) => new Date(s.date).toDateString() === dateStr
    );
    return {
      label,
      reps: daySessions.reduce((sum, s) => sum + s.reps, 0),
    };
  });
  // Rotate to start from Monday
  const mon = result.splice(1);
  return [...mon, result[0]];
}

export function getAggregatedIssues() {
  const sessions = getSessions();
  const all = {};
  sessions.forEach((s) => {
    if (s.issueTypes) {
      Object.entries(s.issueTypes).forEach(([key, count]) => {
        all[key] = (all[key] || 0) + count;
      });
    }
  });
  return Object.entries(all)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([key, count]) => {
      const [joint, severity] = key.split(':');
      return { label: formatIssueLabel(joint), count, severity: severity || 'medium' };
    });
}

function formatIssueLabel(key) {
  const map = {
    'knee': 'Knee Valgus',
    'hip': 'Hip Asymmetry',
    'shoulder': 'Shoulder Shrug',
    'Knees caving inward — push knees outward over your toes': 'Knee Valgus',
    'Weight shifting to one side — distribute evenly': 'Hip Asymmetry',
    'Squatting too deep for rehab — stop at 90°': 'Too Deep',
    'Hip is compensating — keep your back flat against the chair': 'Hip Compensation',
    'Slow down — control the movement throughout': 'Jerky Movement',
  };
  return map[key] || key.replace(/[:_]/g, ' ').slice(0, 20);
}

export function getExerciseBreakdownToday() {
  const today = getTodaySessions();
  const breakdown = { squat: 0, 'knee-ext': 0, shoulder: 0 };
  today.forEach((s) => {
    if (breakdown[s.exercise] !== undefined) breakdown[s.exercise] += s.reps;
  });
  return breakdown;
}

export function getLast7DaysFormScores() {
  const labels = [];
  const scores = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    const day = d.toLocaleDateString('en', { weekday: 'short' });
    labels.push(day);
    const daySessions = getSessions().filter(
      (s) => new Date(s.date).toDateString() === dateStr
    );
    const avg =
      daySessions.length > 0
        ? Math.round(
            daySessions.reduce((sum, s) => sum + s.formScore, 0) / daySessions.length
          )
        : null;
    scores.push(avg);
  }
  return { labels, scores };
}

export function clearAllSessions() {
  localStorage.removeItem('rehab_sessions');
}
