/**
 * SEATED KNEE EXTENSION — Clinical Rules
 *
 * Most prescribed exercise post knee surgery (ACL, meniscus, replacement)
 * Patient sits, extends leg from 90° to full extension
 *
 * Clinical target: 0-5° at full extension (some patients reach -5° hyperextension)
 * Warning: do NOT go past 30° if early ACL recovery
 *
 * Key rules:
 * - Start: knee at 80-95°
 * - End: knee at 0-15° (full extension)
 * - No hip compensation (patient lifting buttock off seat)
 * - Movement should be smooth — no jerking
 */

export function analyzeKneeExtension(angles, prevAngles) {
  const issues = [];
  const { leftKnee, rightKnee, leftHip, rightHip } = angles;

  // Use the side being exercised — detect which side is moving more
  const activeKnee = Math.abs(leftKnee - (prevAngles?.leftKnee || leftKnee)) >
    Math.abs(rightKnee - (prevAngles?.rightKnee || rightKnee))
    ? leftKnee : rightKnee;

  const activeHip = activeKnee === leftKnee ? leftHip : rightHip;
  const prevActiveKnee = activeKnee === leftKnee
    ? prevAngles?.leftKnee : prevAngles?.rightKnee;

  // RULE 1: Full extension check — clinical goal
  const fullyExtended = activeKnee > 165;
  const repComplete = prevActiveKnee && prevActiveKnee < 30 && fullyExtended;

  // RULE 2: Hip compensation — buttock lifting
  // Hip angle will change if patient lifts off seat
  const prevActiveHip = activeKnee === leftKnee
    ? prevAngles?.leftHip : prevAngles?.rightHip;

  if (prevActiveHip && Math.abs(activeHip - prevActiveHip) > 10) {
    issues.push({
      severity: 'high',
      message: 'Hip is compensating — keep your back flat against the chair',
      joint: 'hip',
    });
  }

  // RULE 3: Speed check — jerky movement
  if (prevActiveKnee) {
    const angleChange = Math.abs(activeKnee - prevActiveKnee);
    if (angleChange > 15) { // too fast for single frame
      issues.push({
        severity: 'low',
        message: 'Slow down — control the movement throughout',
        joint: 'knee',
      });
    }
  }

  return { issues, fullyExtended, repComplete, activeKneeAngle: activeKnee };
}
