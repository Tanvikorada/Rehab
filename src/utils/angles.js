/**
 * Calculate angle at point B formed by points A-B-C
 * Returns angle in degrees (0-180)
 */
export function calculateAngle(A, B, C) {
  // Vectors from B to A and B to C
  const BA = { x: A.x - B.x, y: A.y - B.y };
  const BC = { x: C.x - B.x, y: C.y - B.y };

  // Dot product
  const dot = BA.x * BC.x + BA.y * BC.y;

  // Magnitudes
  const magBA = Math.sqrt(BA.x ** 2 + BA.y ** 2);
  const magBC = Math.sqrt(BC.x ** 2 + BC.y ** 2);

  if (magBA === 0 || magBC === 0) return 0; // degenerate case guard

  // Clamp to [-1, 1] to prevent NaN from floating-point rounding errors
  const cosAngle = Math.max(-1, Math.min(1, dot / (magBA * magBC)));
  const angle = Math.acos(cosAngle);
  return (angle * 180) / Math.PI;
}

/**
 * MediaPipe landmark indices — memorize these
 * 11 = left shoulder,  12 = right shoulder
 * 13 = left elbow,     14 = right elbow
 * 15 = left wrist,     16 = right wrist
 * 23 = left hip,       24 = right hip
 * 25 = left knee,      26 = right knee
 * 27 = left ankle,     28 = right ankle
 */
export const LANDMARKS = {
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
  LEFT_KNEE: 25,
  RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,
  RIGHT_ANKLE: 28,
};

export function getKeyAngles(landmarks) {
  const L = LANDMARKS;
  const lm = landmarks;

  return {
    // Knee angles (how much knee is bent — 180 = straight, 90 = right angle)
    leftKnee: calculateAngle(lm[L.LEFT_HIP], lm[L.LEFT_KNEE], lm[L.LEFT_ANKLE]),
    rightKnee: calculateAngle(lm[L.RIGHT_HIP], lm[L.RIGHT_KNEE], lm[L.RIGHT_ANKLE]),

    // Hip angles (trunk vs thigh)
    leftHip: calculateAngle(lm[L.LEFT_SHOULDER], lm[L.LEFT_HIP], lm[L.LEFT_KNEE]),
    rightHip: calculateAngle(lm[L.RIGHT_SHOULDER], lm[L.RIGHT_HIP], lm[L.RIGHT_KNEE]),

    // Shoulder angles (arm abduction — 180 = arm up, 90 = arm out)
    leftShoulder: calculateAngle(lm[L.LEFT_ELBOW], lm[L.LEFT_SHOULDER], lm[L.LEFT_HIP]),
    rightShoulder: calculateAngle(lm[L.RIGHT_ELBOW], lm[L.RIGHT_SHOULDER], lm[L.RIGHT_HIP]),
  };
}
