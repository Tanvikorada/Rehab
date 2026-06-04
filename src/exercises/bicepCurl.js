/**
 * BICEP CURL — Clinical Rules
 * 
 * Standard dumbbell/resistance band bicep curl.
 * Key checkpoints:
 * - Upper arm should remain fixed by the side.
 * - Full extension at the bottom, flexion at the top.
 */

export const BICEP_CURL_PHASES = {
  DOWN: 'down',
  UP: 'up',
};

export function analyzeBicepCurl(angles, prevAngles, phase) {
  const issues = [];
  const { leftElbow, rightElbow, leftShoulder, rightShoulder } = angles;

  // Determine which arm is moving more to track the active side
  const leftDiff = prevAngles ? Math.abs(leftElbow - prevAngles.leftElbow) : 0;
  const rightDiff = prevAngles ? Math.abs(rightElbow - prevAngles.rightElbow) : 0;
  
  const movingArm = leftDiff > rightDiff ? 'left' : 'right';
  const elbow = movingArm === 'left' ? leftElbow : rightElbow;
  const shoulder = movingArm === 'left' ? leftShoulder : rightShoulder;

  // Detect current phase
  let currentPhase = phase;
  if (elbow > 150) currentPhase = BICEP_CURL_PHASES.DOWN;
  else if (elbow < 60) currentPhase = BICEP_CURL_PHASES.UP;

  // RULE 1: Shoulder swinging (compensating by using anterior deltoid)
  // Normal shoulder angle at rest is low. If it increases, they are raising the elbow.
  if (shoulder > 25) {
    issues.push({
      severity: 'high',
      message: 'Keep your upper arm still - avoid swinging the elbow forward',
      joint: 'shoulder',
    });
  }

  // RULE 2: Incomplete extension
  if (currentPhase === BICEP_CURL_PHASES.DOWN && elbow < 140) {
    issues.push({
      severity: 'medium',
      message: 'Straighten your arm fully at the bottom of the movement',
      joint: 'elbow',
    });
  }

  // RULE 3: Rep completion
  const repComplete =
    phase === BICEP_CURL_PHASES.UP && currentPhase === BICEP_CURL_PHASES.DOWN;

  return { issues, phase: currentPhase, repComplete };
}
