import type { NarrationBus, NarrationEvent } from './narration-bus';

declare global {
  interface Window {
    __commentary?: CommentaryEngine;
  }
}

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
    window.__commentary = this;
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

  // Public method for Voice Test Reel
  public testVoice(profile: 'male' | 'female', text: string): void {
    this.synth.cancel();

    // Attempt to match profile based on simple heuristics
    const voices = this.synth.getVoices();
    let selectedVoice: SpeechSynthesisVoice | undefined;
    let pitch: number;
    let rate: number;

    if (profile === 'male') {
      // "Between Mortal Kombat and Movie Guy" -> Deep, slightly slower
      selectedVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Male') || v.name.includes('David') || v.name.includes('Guy')),
        ) || voices[0];
      pitch = 0.5;
      rate = 0.85;
    } else {
      // "Ripley / Sarah Connor" -> Intense, direct, medium-low pitch
      selectedVoice =
        voices.find(
          (v) =>
            v.lang.startsWith('en') &&
            (v.name.includes('Female') || v.name.includes('Zira') || v.name.includes('Samantha')),
        ) || voices[0];
      pitch = 0.8;
      rate = 1.15;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }
    utterance.pitch = pitch;
    utterance.rate = rate;
    this.synth.speak(utterance);
  }
}
