// Web Audio API and Vibration utilities for Gatekeeper

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Play a high-clarity melodic chime for Authorized (Green Light)
 */
export function playGrantedSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Chime notes: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz)
    const freqs = [523.25, 659.25, 783.99];

    freqs.forEach((freq, index) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + index * 0.08);

      gain.gain.setValueAtTime(0, now + index * 0.08);
      gain.gain.linearRampToValueAtTime(0.25, now + index * 0.08 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, now + index * 0.08 + 0.45);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + index * 0.08);
      osc.stop(now + index * 0.08 + 0.5);
    });
  } catch (e) {
    console.warn('Audio playback error', e);
  }
}

/**
 * Play a punchy alert buzzer for Denied (Red Light)
 */
export function playDeniedSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Dual buzz bursts
    [0, 0.22].forEach((offset) => {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(140, now + offset);
      osc2.frequency.setValueAtTime(180, now + offset);

      gain.gain.setValueAtTime(0.3, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.16);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now + offset);
      osc2.start(now + offset);
      osc1.stop(now + offset + 0.18);
      osc2.stop(now + offset + 0.18);
    });
  } catch (e) {
    console.warn('Audio playback error', e);
  }
}

/**
 * Subtle camera snap sound
 */
export function playShutterSound() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(900, now);
    osc.frequency.exponentialRampToValueAtTime(200, now + 0.05);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.07);
  } catch {}
}

/**
 * Android Device Haptic feedback
 */
export function triggerHaptic(type: 'granted' | 'denied' | 'click') {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      if (type === 'granted') {
        navigator.vibrate([120, 60, 120]); // Positive double pulse
      } else if (type === 'denied') {
        navigator.vibrate([350, 100, 350, 100, 350]); // Long warning pulses
      } else {
        navigator.vibrate(30); // Subtle tap
      }
    } catch {}
  }
}

/**
 * Optional voice synthesis for hands-free gate operation
 */
export function speakGateAnnouncement(text: string) {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {}
  }
}
