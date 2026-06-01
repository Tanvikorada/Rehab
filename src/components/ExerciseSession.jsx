import { useState, useCallback, useRef, useEffect } from 'react';
import PoseDetector from './PoseDetector';
import { getKeyAngles } from '../utils/angles';
import { analyzeSquat, SQUAT_PHASES } from '../exercises/squat';
import { analyzeKneeExtension } from '../exercises/kneeExtension';
import { analyzeShoulderAbduction, SHOULDER_PHASES } from '../exercises/shoulder';
import { generateFeedback } from '../utils/feedback';
import { saveSession } from '../utils/sessions';

const EXERCISES = ['squat', 'knee-ext', 'shoulder'];
const EXERCISE_LABELS = { squat: 'Squat', 'knee-ext': 'Knee Ext', shoulder: 'Shoulder' };

// Accepts selectedExercise from App (so the Dashboard "Start" buttons pre-select)
const ExerciseSession = ({ selectedExercise = 'squat', onGoToDashboard, onChangeExercise }) => {
  const [feedback, setFeedback] = useState('Position yourself in frame');
  const [repCount, setRepCount] = useState(0);
  const [phase, setPhase] = useState(SQUAT_PHASES.STANDING);
  const [feedbackColor, setFeedbackColor] = useState('lime');
  const [activeExercise, setActiveExercise] = useState(selectedExercise);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [lastSaved, setLastSaved] = useState(false);

  const sessionTimerRef = useRef(null);
  const sessionIssuesRef = useRef([]);
  const prevAnglesRef = useRef(null);
  const phaseRef = useRef(SQUAT_PHASES.STANDING);
  const lastFeedbackTimeRef = useRef(0);
  const repCountRef = useRef(0);
  const sessionTimeRef = useRef(0);

  // Sync selectedExercise prop → local state when App changes it (e.g. Dashboard start buttons)
  useEffect(() => {
    if (selectedExercise !== activeExercise) {
      switchExercise(selectedExercise);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExercise]);

  // Keep sessionTime accessible in endSession without stale closure
  useEffect(() => {
    sessionTimeRef.current = sessionTime;
  }, [sessionTime]);

  const handleRepCount = (updater) => {
    setRepCount((prev) => {
      const next = updater(prev);
      repCountRef.current = next;
      return next;
    });
  };

  const startSession = () => {
    setSessionStarted(true);
    setRepCount(0);
    repCountRef.current = 0;
    setSessionTime(0);
    sessionTimeRef.current = 0;
    sessionIssuesRef.current = [];
    setLastSaved(false);
    sessionTimerRef.current = setInterval(() => {
      setSessionTime((t) => {
        sessionTimeRef.current = t + 1;
        return t + 1;
      });
    }, 1000);
  };

  const endSession = () => {
    setSessionStarted(false);
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    saveSession(
      activeExercise,
      repCountRef.current,
      sessionTimeRef.current,
      sessionIssuesRef.current,
    );
    setLastSaved(true);
    setFeedback(`Session saved! ${repCountRef.current} reps · ${sessionTimeRef.current}s`);
    setFeedbackColor('lime');
  };

  const switchExercise = (ex) => {
    if (sessionStarted) endSession();
    setActiveExercise(ex);
    if (onChangeExercise) onChangeExercise(ex);
    setRepCount(0);
    repCountRef.current = 0;
    prevAnglesRef.current = null;
    phaseRef.current = SQUAT_PHASES.STANDING;
    setPhase(SQUAT_PHASES.STANDING);
    setFeedback('Position yourself in frame');
    sessionIssuesRef.current = [];
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    setSessionStarted(false);
    setSessionTime(0);
    sessionTimeRef.current = 0;
    setLastSaved(false);
  };

  const handlePoseResults = useCallback(async (results) => {
    if (!results.poseLandmarks || !sessionStarted) return;

    const angles = getKeyAngles(results.poseLandmarks);
    let analysis;

    if (activeExercise === 'squat') {
      analysis = analyzeSquat(angles, prevAnglesRef.current, phaseRef.current);
      if (analysis.phase !== phaseRef.current) {
        setPhase(analysis.phase);
        phaseRef.current = analysis.phase;
      }
    } else if (activeExercise === 'knee-ext') {
      analysis = analyzeKneeExtension(angles, prevAnglesRef.current);
    } else if (activeExercise === 'shoulder') {
      analysis = analyzeShoulderAbduction(angles, prevAnglesRef.current, phaseRef.current);
      if (analysis.phase !== phaseRef.current) {
        setPhase(analysis.phase);
        phaseRef.current = analysis.phase;
      }
    } else {
    }

    prevAnglesRef.current = angles;

    if (analysis.repComplete) {
      handleRepCount((prev) => prev + 1);
    }

    if (analysis.issues.length > 0) {
      sessionIssuesRef.current.push(...analysis.issues);
    }

    const now = Date.now();
    if (now - lastFeedbackTimeRef.current > 500) {
      lastFeedbackTimeRef.current = now;
      const issuesCopy = [...(analysis.issues || [])];
      const msg = await generateFeedback(issuesCopy, activeExercise, repCountRef.current);
      setFeedback(msg);
      setFeedbackColor(
        issuesCopy.length === 0 ? 'lime' :
        issuesCopy[0]?.severity === 'high' ? 'red' : 'amber',
      );
    }
  }, [sessionStarted, activeExercise]);

  const colorMap = {
    lime: 'text-lime-400 border-lime-400',
    red: 'text-red-400 border-red-400',
    amber: 'text-amber-400 border-amber-400',
  };

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="min-h-screen bg-black text-white p-4 font-mono flex flex-col items-center">
      <div className="w-full max-w-lg">

        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <div className="text-xs text-gray-500 tracking-widest uppercase">Rehab.AI</div>
            <div className="text-lg font-bold uppercase tracking-wide">
              {EXERCISE_LABELS[activeExercise]}
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-4xl font-bold text-lime-400">{repCount}</div>
              <div className="text-xs text-gray-500">REPS</div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-400">{formatTime(sessionTime)}</div>
              <div className="text-xs text-gray-500">TIME</div>
            </div>
            {/* Dashboard button */}
            <button
              id="go-to-dashboard-btn"
              onClick={() => {
                if (sessionStarted) endSession();
                onGoToDashboard?.();
              }}
              className="text-xs border border-gray-700 text-gray-400 px-2 py-2 rounded hover:border-lime-400 hover:text-lime-400 transition-colors leading-tight text-center"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              📊<br />Stats
            </button>
          </div>
        </div>

        {/* Camera Feed */}
        <div className="relative mb-4">
          <PoseDetector onPoseResults={handlePoseResults} />
          <div className="absolute top-3 left-3 bg-black/70 px-3 py-1 rounded text-xs tracking-widest uppercase text-gray-300">
            {activeExercise === 'squat' ? phase : activeExercise}
          </div>
          {!sessionStarted && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg">
              <button
                id="start-session-btn"
                onClick={startSession}
                className="bg-lime-400 text-black font-bold py-4 px-10 rounded-xl tracking-widest uppercase text-sm active:scale-95 transition-transform"
                style={{ WebkitTapHighlightColor: 'transparent' }}
              >
                Start Session
              </button>
            </div>
          )}
        </div>

        {/* Feedback Box */}
        <div className={`border rounded p-4 mb-4 ${colorMap[feedbackColor]}`}>
          <div className="text-xs tracking-widest mb-1 opacity-60">
            {sessionStarted ? '● LIVE COACH' : 'COACH'}
          </div>
          <div className="text-base font-semibold">{feedback}</div>
        </div>

        {/* Session Controls */}
        {sessionStarted && (
          <div className="flex gap-2 mb-4">
            <button
              id="end-session-btn"
              onClick={endSession}
              className="flex-1 border border-red-700 text-red-400 py-3 text-xs tracking-widest rounded active:scale-95 transition-transform"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              END & SAVE
            </button>
            <button
              onClick={() => { endSession(); onGoToDashboard?.(); }}
              className="flex-1 border border-lime-700 text-lime-400 py-3 text-xs tracking-widest rounded active:scale-95 transition-transform"
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              SAVE → DASHBOARD
            </button>
          </div>
        )}

        {/* After save: show dashboard CTA */}
        {lastSaved && !sessionStarted && (
          <button
            onClick={() => onGoToDashboard?.()}
            className="w-full mb-4 bg-lime-400/10 border border-lime-400/40 text-lime-400 py-3 text-xs tracking-widest rounded active:scale-95 transition-transform"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            📊 VIEW PROGRESS IN DASHBOARD →
          </button>
        )}

        {/* Exercise Selector */}
        <div className="grid grid-cols-3 gap-2">
          {EXERCISES.map((ex) => (
            <button
              key={ex}
              id={`exercise-btn-${ex}`}
              onClick={() => switchExercise(ex)}
              className={`border py-3 text-xs tracking-widest rounded transition-colors active:scale-95 ${
                activeExercise === ex
                  ? 'border-lime-400 text-lime-400 bg-lime-400/5'
                  : 'border-gray-700 text-gray-400'
              }`}
              style={{ WebkitTapHighlightColor: 'transparent' }}
            >
              {EXERCISE_LABELS[ex].toUpperCase()}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
};

export default ExerciseSession;
