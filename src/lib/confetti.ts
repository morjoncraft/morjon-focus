import confetti from 'canvas-confetti';

export function fireTaskCompleteConfetti(originElement?: HTMLElement | null): void {
  try {
    let origin = { x: 0.5, y: 0.5 };
    if (originElement && typeof window !== 'undefined') {
      const rect = originElement.getBoundingClientRect();
      origin = {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight,
      };
    }

    void confetti({
      particleCount: 55,
      spread: 68,
      startVelocity: 28,
      gravity: 1.05,
      ticks: 160,
      origin,
      colors: ['#8b5cf6', '#10b981', '#38bdf8', '#f59e0b', '#f43f5e'],
      disableForReducedMotion: true,
    });
  } catch {
    // Ignore confetti errors in headless or restricted environments
  }
}
