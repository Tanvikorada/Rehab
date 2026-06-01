import { useState, useCallback, useRef, useEffect } from 'react';
import PoseDetector from './PoseDetector';
import { getKeyAngles } from '../utils/angles';
import { analyzeSquat, SQUAT_PHASES } from '../exercises/squat';
import { analyzeKneeExtension } from '../exercises/kneeExtension';
import { analyzeShoulderAbduction } from '../exercises/shoulder';
import { generateFeedback } from '../utils/feedback';
import { saveSession } from '../utils/sessions';
import './Dashboard.css';

const EXERCISES = ['squat', 'knee-ext', 'shoulder'];
const EXERCISE_LABELS = { squat: 'Squat', 'knee-ext': 'Knee Ext', shoulder: 'Shoulder' };

const ExerciseSession = ({ selectedExercise = 'squat', onGoToDashboard, onChangeExercise }) => {
  const [feedback, setFeedback] = useState('Position yourself in frame');
  const [repCount, setRepCount] = useState(0);
  const [phase, setPhase] = useState(SQUAT_PHASES.STANDING);
  const [feedbackColor, setFeedbackColor] = useState('lime');
  const [activeExercise, setActiveExercise] = useState(selectedExercise);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const [lastSaved, setLastSaved] = useState(false);
  const [cameraFacing, setCameraFacing] = useState(null);

  const sessionTimerRef = useRef(null);
  const sessionIssuesRef = useRef([]);
  const prevAnglesRef = useRef(null);
  const phaseRef = useRef(SQUAT_PHASES.STANDING);
  const lastFeedbackTimeRef = useRef(0);
  const repCountRef = useRef(0);
  const sessionTimeRef = useRef(0);

  useEffect(() => {
    if (selectedExercise !== activeExercise) {
      switchExercise(selectedExercise);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedExercise]);

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
    if (!cameraFacing) return;
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
    setFeedback(`Session saved. ${repCountRef.current} reps - ${sessionTimeRef.current}s`);
    setFeedbackColor('lime');
  };

  function switchExercise(ex) {
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
  }

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
    }

    if (!analysis) return;
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

  const formatTime = (s) =>
    `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  return (
    <div className="db-root session-root">
      <div className="db-container session-container">
        <div className="session-header">
          <div>
            <div className="session-kicker">Rehab.AI</div>
            <div className="session-title">{EXERCISE_LABELS[activeExercise]}</div>
          </div>
          <div className="session-header-actions">
            <div className="session-mini-stat">
              <div className="session-mini-value">{repCount}</div>
              <div className="session-mini-label">Reps</div>
            </div>
            <div className="session-mini-stat">
              <div className="session-mini-value time">{formatTime(sessionTime)}</div>
              <div className="session-mini-label">Time</div>
            </div>
            <button
              id="go-to-dashboard-btn"
              onClick={() => {
                if (sessionStarted) endSession();
                onGoToDashboard?.();
              }}
              className="session-outline-btn compact"
              type="button"
            >
              Stats
            </button>
          </div>
        </div>

        <div className="db-card session-camera-card">
          {cameraFacing ? (
            <>
              <PoseDetector
                key={cameraFacing}
                facingMode={cameraFacing}
                onPoseResults={handlePoseResults}
              />
              <div className="session-camera-badge">
                {activeExercise === 'squat' ? phase : activeExercise}
              </div>
              {!sessionStarted && (
                <button
                  className="session-camera-switch"
                  onClick={() => setCameraFacing((mode) => (mode === 'user' ? 'environment' : 'user'))}
                  type="button"
                >
                  {cameraFacing === 'user' ? 'Front Cam' : 'Back Cam'}
                </button>
              )}
              {!sessionStarted && (
                <div className="session-start-overlay">
                  <button
                    id="start-session-btn"
                    onClick={startSession}
                    className="db-start-btn session-start-btn"
                    type="button"
                  >
                    Start Session
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="session-camera-picker">
              <div>
                <div className="db-card-title">Choose Camera</div>
                <p>Select the camera angle that captures your full movement clearly.</p>
              </div>
              <div className="session-camera-options">
                <button type="button" onClick={() => setCameraFacing('user')}>
                  <span>Front</span>
                  <small>Self view</small>
                </button>
                <button type="button" onClick={() => setCameraFacing('environment')}>
                  <span>Back</span>
                  <small>Tripod or stand</small>
                </button>
              </div>
            </div>
          )}
        </div>

        <div className={`db-feedback-box session-feedback ${feedbackColor}`}>
          <div className="session-feedback-label">
            <span className="db-feedback-dot" />
            {sessionStarted ? 'LIVE COACH' : 'COACH'}
          </div>
          <div className="session-feedback-text">{feedback}</div>
        </div>

        {sessionStarted && (
          <div className="session-controls">
            <button
              id="end-session-btn"
              onClick={endSession}
              className="session-outline-btn danger"
              type="button"
            >
              End & Save
            </button>
            <button
              onClick={() => { endSession(); onGoToDashboard?.(); }}
              className="session-outline-btn"
              type="button"
            >
              Save To Dashboard
            </button>
          </div>
        )}

        {lastSaved && !sessionStarted && (
          <button
            onClick={() => onGoToDashboard?.()}
            className="session-outline-btn full"
            type="button"
          >
            View Progress In Dashboard
          </button>
        )}

        <div className="session-exercise-grid">
          {EXERCISES.map((ex) => (
            <button
              key={ex}
              id={`exercise-btn-${ex}`}
              onClick={() => switchExercise(ex)}
              className={activeExercise === ex ? 'active' : ''}
              type="button"
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
