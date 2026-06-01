/**
 * SQUAT — Clinical Rules
 *
 * Source: American Physical Therapy Association guidelines
 * Standard therapeutic squat for knee/hip rehabilitation
 *
 * Key checkpoints:
 * - Knee flexion at bottom: 85-100° (not more — increases patellofemoral stress)
 * - Knee valgus (inward caving): knees should track over 2nd toe
 * - Hip flexion at bottom: 85-95°
 * - Descent should be controlled (detect speed via angle change rate)
 */

export const SQUAT_PHASES = {
  STANDING: 'standing',     // Knee angle > 160°
  DESCENDING: 'descending', // Knee angle decreasing
  BOTTOM: 'bottom',         // Knee angle 80-100°
  ASCENDING: 'ascending',   // Knee angle increasing
};

export function analyzeSquat(angles, prevAngles, phase) {
  const issues = [];
  const { leftKnee, rightKnee, leftHip, rightHip } = angles;

  // Detect current phase
  let currentPhase = phase;
  const avgKnee = (leftKnee + rightKnee) / 2;
  const prevAvgKnee = prevAngles
    ? (prevAngles.leftKnee + prevAngles.rightKnee) / 2
    : avgKnee;

  if (avgKnee > 160) currentPhase = SQUAT_PHASES.STANDING;
  else if (avgKnee < prevAvgKnee - 2) currentPhase = SQUAT_PHASES.DESCENDING;
  else if (avgKnee > prevAvgKnee + 2) currentPhase = SQUAT_PHASES.ASCENDING;
  else if (avgKnee < 110) currentPhase = SQUAT_PHASES.BOTTOM;

  // RULE 1: Knee valgus (caving inward)
  // Detected when left knee angle differs from right knee angle
  // AND hip is internally rotating — approximate via asymmetry
  const kneeDifference = Math.abs(leftKnee - rightKnee);
  if (kneeDifference > 15 && currentPhase !== SQUAT_PHASES.STANDING) {
    issues.push({
      severity: 'high',
      message: 'Knees caving inward — push knees outward over your toes',
      joint: 'knee',
    });
  }

  // RULE 2: Too deep — increases patellofemoral compression
  if (leftKnee < 75 || rightKnee < 75) {
    issues.push({
      severity: 'medium',
      message: 'Squatting too deep for rehab — stop at 90°',
      joint: 'knee',
    });
  }

  // RULE 3: Hip asymmetry — compensating with one side
  const hipDifference = Math.abs(leftHip - rightHip);
  if (hipDifference > 20 && currentPhase === SQUAT_PHASES.BOTTOM) {
    issues.push({
      severity: 'medium',
      message: 'Weight shifting to one side — distribute evenly',
      joint: 'hip',
    });
  }

  // RULE 4: Rep completion — squat counts when reaches bottom then returns
  const repComplete =
    phase === SQUAT_PHASES.BOTTOM && currentPhase === SQUAT_PHASES.ASCENDING;

  return { issues, phase: currentPhase, repComplete };
}
