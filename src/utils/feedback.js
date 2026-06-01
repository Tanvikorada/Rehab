const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/**
 * Generate coaching feedback from detected issues
 * Uses Groq's free LLaMA 3 API
 */
export async function generateFeedback(issues, exerciseName, repCount) {
  // No issues — positive reinforcement
  if (issues.length === 0) {
    const positives = [
      'Perfect form. Keep that control.',
      'Excellent. That rep was textbook.',
      'Great alignment. Stay with it.',
    ];
    return positives[repCount % positives.length];
  }

  // Use highest severity issue only (don't overwhelm patient)
  // Sort a COPY so we don't mutate the caller's array
  const topIssue = [...issues].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 };
    return order[a.severity] - order[b.severity];
  })[0];

  // For simple issues, return pre-written responses (faster, no API call)
  const quickResponses = {
    'Knees caving inward — push knees outward over your toes':
      'Knees caving. Push them outward.',
    'Squatting too deep for rehab — stop at 90°':
      'Too deep. Control the descent — stop at 90°.',
    'Hip is compensating — keep your back flat against the chair':
      'Back is lifting. Press your back flat into the seat.',
    'Slow down — control the movement throughout':
      'Too fast. Slow and controlled — 2 seconds up, 2 seconds down.',
  };

  if (quickResponses[topIssue.message]) {
    return quickResponses[topIssue.message];
  }

  // Use Groq only for complex feedback
  try {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    if (!apiKey) {
      throw new Error('Missing VITE_GROQ_API_KEY');
    }

    const response = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        max_tokens: 60,
        messages: [
          {
            role: 'system',
            content: `You are a physiotherapist giving real-time coaching feedback.
              Be direct, brief (under 12 words), encouraging but precise.
              Never start with "I" or "You". Start with the correction.`,
          },
          {
            role: 'user',
            content: `Exercise: ${exerciseName}. Issue detected: ${topIssue.message}. 
              Give one short coaching cue.`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq request failed: ${response.status}`);
    }

    const data = await response.json();
    const cue = data?.choices?.[0]?.message?.content?.trim();
    if (!cue) {
      throw new Error('Groq response did not include a coaching cue');
    }
    return cue;
  } catch {
    return topIssue.message; // fallback to raw message
  }
}
