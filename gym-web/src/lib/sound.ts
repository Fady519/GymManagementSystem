/**
 * Short sounds for the check-in desk, made with the Web Audio API (no audio files to download).
 * "ok" = two rising tones, "error" = a low double buzz. Staff can hear the result without
 * looking at the screen.
 */
let audio: AudioContext | null = null;

export function playCue(kind: "ok" | "error") {
  try {
    audio ??= new AudioContext();
    const tones: [frequency: number, startsAt: number][] =
      kind === "ok"
        ? [
            [880, 0],
            [1320, 0.11],
          ]
        : [
            [196, 0],
            [196, 0.2],
          ];
    const now = audio.currentTime;
    for (const [frequency, startsAt] of tones) {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = kind === "ok" ? "sine" : "square";
      oscillator.frequency.value = frequency;
      // Fade in and out quickly, otherwise the speaker "clicks".
      gain.gain.setValueAtTime(0.0001, now + startsAt);
      gain.gain.exponentialRampToValueAtTime(kind === "ok" ? 0.25 : 0.12, now + startsAt + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + startsAt + 0.16);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(now + startsAt);
      oscillator.stop(now + startsAt + 0.18);
    }
  } catch {
    // No sound support: the screen still shows the result.
  }
}
