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
    'Knees caving inward - push knees outward over your toes':
      'Your knees are falling inward. Push both knees outward so they stay over your toes.',
    'Squatting too deep for rehab - stop at 90 degrees':
      'You are going too deep. Stop when your knees are about 90 degrees, then stand tall.',
    'Weight shifting to one side - distribute weight evenly':
      'Your weight is shifting to one side. Press both feet evenly into the floor.',
    'Hip is compensating - keep your back flat against the chair':
      'Your hip is lifting or twisting. Keep your back flat and move only from the knee.',
    'Slow down - control the movement throughout':
      'The movement is too fast. Use a slow 2 seconds up and 2 seconds down pace.',
    'Arm is raised too high - stop at 90 degrees':
      'Your arm is too high. Stop at shoulder height, then lower with control.',
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
              Explain exactly what is wrong and how to fix it in one clear sentence.
              Keep it under 22 words. Be encouraging, precise, and safe.`,
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
