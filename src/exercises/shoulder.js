export const SHOULDER_PHASES = {
  DOWN: 'DOWN',
  UP: 'UP',
};

export function analyzeShoulderAbduction(angles, prevAngles, currentPhase) {
  let phase = currentPhase || SHOULDER_PHASES.DOWN;
  let repComplete = false;
  const issues = [];

  // Use the arm that is raised higher for analysis (allows for either arm to be tracked)
  const maxShoulderAngle = Math.max(angles.leftShoulder, angles.rightShoulder);
  
  if (phase === SHOULDER_PHASES.DOWN) {
    if (maxShoulderAngle > 75) {
      phase = SHOULDER_PHASES.UP;
    }
  } else if (phase === SHOULDER_PHASES.UP) {
    if (maxShoulderAngle > 105) {
      issues.push({
        severity: 'medium',
        joint: 'shoulder',
        message: 'Arm is raised too high — stop at 90°',
      });
    }

    if (maxShoulderAngle < 30) {
      phase = SHOULDER_PHASES.DOWN;
      repComplete = true; // Complete rep when returned to resting
    }
  }

  // Common form checks regardless of phase
  
  // Note: True "shrugging" requires checking shoulder vs nose/ear vertical height,
  // but we can check if both arms are rising asymmetrically.
  if (Math.abs(angles.leftShoulder - angles.rightShoulder) > 25 && phase === SHOULDER_PHASES.UP) {
    // One arm is up, one is down. This is fine for unilateral exercises,
    // but if doing bilateral, we'd flag it. For now, assume unilateral is okay.
  }

  return {
    phase,
    repComplete,
    issues,
  };
}
