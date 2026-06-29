import type { NarrationBus, NarrationEvent } from './narration-bus';

export class CommentaryEngine {
  private unsub: (() => void) | null = null;
  private synth: SpeechSynthesis;
  private voice: SpeechSynthesisVoice | null = null;
  private voiceEnabled = true;

  constructor(private bus: NarrationBus) {
    this.synth = window.speechSynthesis;

    // Voices might load asynchronously
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => this.selectVoice();
    }
    this.selectVoice();
  }

  private selectVoice(): void {
    const voices = this.synth.getVoices();
    // Try to find a good energetic or distinct voice, fallback to default
    this.voice =
      voices.find(
        (v) => v.lang.startsWith('en') && (v.name.includes('Google') || v.name.includes('Premium')),
      ) ||
      voices[0] ||
      null;
  }

  start(): void {
    this.unsub = this.bus.subscribe((event) => {
      if (!this.voiceEnabled) return;
      this.handleEvent(event);
    });
  }

  destroy(): void {
    this.unsub?.();
    this.synth.cancel();
  }

  public setEnabled(enabled: boolean): void {
    this.voiceEnabled = enabled;
    if (!enabled) {
      this.synth.cancel();
    }
  }

  private handleEvent(event: NarrationEvent): void {
    switch (event.type) {
      case 'combo':
        if (event.count === 2) this.speak('Double Hit!');
        else if (event.count === 3) this.speak('Triple Combo!');
        else if (event.count > 3) this.speak('Unstoppable!');
        break;

      case 'cinematic':
        if (event.style === 'clash') {
          // Clear queue for high priority cinematic
          this.synth.cancel();
          this.speak('Clash of Aces!');
        } else {
          this.speak(event.message);
        }
        break;

      case 'lp-damage':
        if (event.damage >= 5) {
          this.speak(`Massive damage! ${event.damage} to ${event.player}.`);
        } else if (event.damage >= 3) {
          this.speak('Solid hit.');
        }
        break;

      case 'pass':
        // We could keep track of consecutive passes, or just make a short quip
        this.speak(`${event.player} passes.`);
        break;

      case 'destroyed':
        this.speak('Unit destroyed.');
        break;
    }
  }

  private speak(text: string, rate = 1.1, pitch = 1.0): void {
    // Avoid queueing too many things; if queue is long, skip minor events
    if (this.synth.pending && this.synth.speaking) {
      // Optional: if we want to skip or cancel
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (this.voice) {
      utterance.voice = this.voice;
    }
    utterance.rate = rate;
    utterance.pitch = pitch;

    this.synth.speak(utterance);
  }
}
