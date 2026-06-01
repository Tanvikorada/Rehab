import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import IntroScreen from './components/IntroScreen';
import ExerciseSession from './components/ExerciseSession';
import Dashboard from './components/Dashboard';

export default function App() {
  // 'intro' | 'session' | 'dashboard'
  const [screen, setScreen] = useState('intro');
  const [selectedExercise, setSelectedExercise] = useState('squat');

  const goToSession = (exercise = selectedExercise) => {
    setSelectedExercise(exercise);
    setScreen('session');
  };

  const goToDashboard = () => setScreen('dashboard');
  const goToIntro = () => setScreen('intro');

  return (
    <AnimatePresence mode="wait">
      {screen === 'intro' && (
        <motion.div
          key="intro"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.4 }}
        >
          <IntroScreen onEnter={() => goToSession('squat')} />
        </motion.div>
      )}

      {screen === 'session' && (
        <motion.div
          key="session"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.35 }}
        >
          <ExerciseSession
            selectedExercise={selectedExercise}
            onGoToDashboard={goToDashboard}
            onChangeExercise={(ex) => setSelectedExercise(ex)}
          />
        </motion.div>
      )}

      {screen === 'dashboard' && (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          transition={{ duration: 0.4 }}
        >
          <Dashboard
            onStartSession={(ex) => goToSession(ex)}
            onBackToSession={() => goToSession(selectedExercise)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
