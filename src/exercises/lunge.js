/**
 * LUNGE — Clinical Rules
 * 
 * Standard forward lunge for lower body rehab.
 * Key checkpoints:
 * - Front knee around 90 degrees at the bottom.
 * - Rear knee pointing towards the floor.
 */

export const LUNGE_PHASES = {
  STANDING: 'standing',     // Front knee > 160°
  DESCENDING: 'descending', // Knee angle decreasing
  BOTTOM: 'bottom',         // Front knee 75-100°
  ASCENDING: 'ascending',   // Knee angle increasing
};

export function analyzeLunge(angles, prevAngles, phase) {
  const issues = [];
  const { leftKnee, rightKnee } = angles;

  // In a lunge, one knee bends significantly more than the other
  const frontKnee = Math.min(leftKnee, rightKnee);
  const prevFrontKnee = prevAngles ? Math.min(prevAngles.leftKnee, prevAngles.rightKnee) : frontKnee;

  // Detect current phase
  let currentPhase = phase;
  if (frontKnee > 160) currentPhase = LUNGE_PHASES.STANDING;
  else if (frontKnee < prevFrontKnee - 2) currentPhase = LUNGE_PHASES.DESCENDING;
  else if (frontKnee > prevFrontKnee + 2) currentPhase = LUNGE_PHASES.ASCENDING;
  else if (frontKnee < 100) currentPhase = LUNGE_PHASES.BOTTOM;

  // RULE 1: Too deep — high stress on patella
  if (frontKnee < 70) {
    issues.push({
      severity: 'high',
      message: 'Lunging too deep - stop when front knee is around 90 degrees',
      joint: 'knee',
    });
  }

  // RULE 2: Not deep enough (only check at bottom)
  if (currentPhase === LUNGE_PHASES.BOTTOM && frontKnee > 110) {
    issues.push({
      severity: 'medium',
      message: 'Try to go slightly lower if comfortable',
      joint: 'knee',
    });
  }

  // RULE 3: Rep completion
  const repComplete =
    phase === LUNGE_PHASES.BOTTOM && currentPhase === LUNGE_PHASES.ASCENDING;

  return { issues, phase: currentPhase, repComplete };
}
