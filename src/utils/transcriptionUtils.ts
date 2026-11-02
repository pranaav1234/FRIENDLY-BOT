export type TranscriptionType = 'no_speech' | 'background_noise' | 'unclear' | 'model_not_ready' | 'valid';

export interface ClassifiedTranscription {
  type: TranscriptionType;
  displayText: string;
}

export const classifyTranscriptionText = (text: string): ClassifiedTranscription => {
  const clean = (text || '').trim();

  if (!clean) {
    return {
      type: 'no_speech',
      displayText: 'No speech detected. Please try again.',
    };
  }

  // Already formatted feedback check
  if (clean === 'No speech detected. Please try again.') {
    return { type: 'no_speech', displayText: clean };
  }
  if (clean === 'Background noise detected. No speech recognised.') {
    return { type: 'background_noise', displayText: clean };
  }
  if (
    clean === "I couldn't understand the speech. Please try again." ||
    clean === 'Unable to transcribe. Please speak more clearly.' ||
    clean === 'Voice not clear. Please try again.'
  ) {
    return { type: 'unclear', displayText: "I couldn't understand the speech. Please try again." };
  }
  if (clean === 'Offline voice model is not ready.') {
    return { type: 'model_not_ready', displayText: clean };
  }

  // Case 1: No Speech (timestamps like 00:00, 0:00, 00:00:00, silence/no speech indicators)
  if (
    /^(?:00?:\d\d(?::\d\d)?|\d{1,2}:\d{2})$/.test(clean) ||
    /^\[?(?:no[ _-]?speech|silence|none|n\/?a|no[ _-]?audio|blank|00:00)\]?$/i.test(clean) ||
    clean === '[NO_SPEECH]' ||
    clean === 'no_speech'
  ) {
    return {
      type: 'no_speech',
      displayText: 'No speech detected. Please try again.',
    };
  }

  // Case 2: Model Not Ready
  if (clean === '[MODEL_NOT_READY]' || clean === 'model_not_ready') {
    return {
      type: 'model_not_ready',
      displayText: 'Offline voice model is not ready.',
    };
  }

  // Case 3: Background Noise
  if (
    /^\[?(?:background[ _-]?noise|noise|fan|typing|keyboard|static|ambient)\]?$/i.test(clean) ||
    clean === '[BACKGROUND_NOISE]' ||
    clean === 'background_noise'
  ) {
    return {
      type: 'background_noise',
      displayText: 'Background noise detected. No speech recognised.',
    };
  }

  // Case 4: Unclear or Humming / Failed Transcription
  if (
    /^\[?(?:unclear|inaudible|unintelligible|humming|mumbling|sigh|groan|murmur)\]?$/i.test(clean) ||
    clean === '[UNCLEAR]' ||
    clean === 'unclear' ||
    clean === '__unrecognized_speech__'
  ) {
    return {
      type: 'unclear',
      displayText: "I couldn't understand the speech. Please try again.",
    };
  }

  // Case 5: Valid Speech
  return {
    type: 'valid',
    displayText: clean,
  };
};
