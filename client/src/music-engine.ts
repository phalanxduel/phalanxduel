import type { GamePhase } from '@phalanxduel/shared';

declare global {
  interface Window {
    __musicEngine?: MusicEngine;
    webkitAudioContext?: typeof AudioContext;
  }
}

export class MusicEngine {
  private ctx: AudioContext | null = null;
  private isEnabled = true;
  private currentPhase: GamePhase | null = null;

  // Audio Nodes
  private masterGain: GainNode | null = null;

  // Drone components
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneGain: GainNode | null = null;

  // Pulse (Attack phase) components
  private pulseLfo: OscillatorNode | null = null;
  private pulseGain: GainNode | null = null;

  constructor() {
    window.__musicEngine = this;
  }

  public init() {
    if (this.ctx) return; // Already initialized

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    this.ctx = new AudioContextClass();

    // Master gain
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.isEnabled ? 0.3 : 0;
    this.masterGain.connect(this.ctx.destination);

    this.setupDrone();
    this.applyPhaseSettings('DeploymentPhase', 0); // initial setup without fade time

    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  private setupDrone() {
    if (!this.ctx || !this.masterGain) return;

    // A deep, evolving drone using two detuned oscillators
    this.droneOsc1 = this.ctx.createOscillator();
    this.droneOsc2 = this.ctx.createOscillator();
    this.droneOsc1.type = 'triangle';
    this.droneOsc2.type = 'sine';

    // Low frequencies for a heavy, ambient feel (A1 ~55Hz)
    this.droneOsc1.frequency.value = 55;
    this.droneOsc2.frequency.value = 56; // Slight detune for beating effect

    // Filter to muffle the sound and make it ambient
    this.droneFilter = this.ctx.createBiquadFilter();
    this.droneFilter.type = 'lowpass';
    this.droneFilter.frequency.value = 150;
    this.droneFilter.Q.value = 2;

    this.droneGain = this.ctx.createGain();
    this.droneGain.gain.value = 0.8;

    // Pulse LFO for attack phase (modulates gain)
    this.pulseLfo = this.ctx.createOscillator();
    this.pulseLfo.type = 'sine';
    this.pulseLfo.frequency.value = 0; // Starts at 0, increases in attack

    this.pulseGain = this.ctx.createGain();
    this.pulseGain.gain.value = 1; // Base gain, gets modulated

    // Routing
    this.droneOsc1.connect(this.droneFilter);
    this.droneOsc2.connect(this.droneFilter);
    this.droneFilter.connect(this.pulseGain);

    // Modulate pulse gain with LFO
    // LFO goes -1 to 1, we want gain to pulse, so we add a constant?
    // Actually, simple routing: LFO -> gain.gain modulates around base value.
    // To make it pulse from 0 to 1, we need an offset.
    // We'll just modulate it directly and keep the base gain at 0.5, LFO amplitude 0.5.
    this.pulseGain.gain.value = 0.5;
    const lfoAmp = this.ctx.createGain();
    lfoAmp.gain.value = 0; // Starts with no pulse
    this.pulseLfo.connect(lfoAmp);
    lfoAmp.connect(this.pulseGain.gain);

    this.pulseGain.connect(this.droneGain);
    this.droneGain.connect(this.masterGain);

    this.droneOsc1.start();
    this.droneOsc2.start();
    this.pulseLfo.start();
  }

  public setPhase(phase: GamePhase) {
    if (this.currentPhase === phase) return;
    this.currentPhase = phase;

    if (this.ctx) {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      this.applyPhaseSettings(phase, 2); // 2 second crossfade
    }
  }

  private applyPhaseSettings(phase: GamePhase, fadeTime: number) {
    if (
      !this.ctx ||
      !this.droneFilter ||
      !this.droneOsc1 ||
      !this.droneOsc2 ||
      !this.pulseLfo ||
      !this.droneGain
    )
      return;

    const time = this.ctx.currentTime + fadeTime;

    switch (phase) {
      case 'StartTurn':
      case 'DeploymentPhase':
        // Deep, muffled, calm
        this.droneFilter.frequency.linearRampToValueAtTime(150, time);
        this.droneOsc1.frequency.linearRampToValueAtTime(55, time);
        this.droneOsc2.frequency.linearRampToValueAtTime(56, time);
        this.pulseLfo.frequency.linearRampToValueAtTime(0, time); // No pulse
        this.droneGain.gain.linearRampToValueAtTime(0.8, time);
        break;

      case 'AttackPhase':
      case 'AttackResolution':
        // Brighter, higher pitch, rhythmic pulsing
        this.droneFilter.frequency.linearRampToValueAtTime(600, time);
        this.droneOsc1.frequency.linearRampToValueAtTime(110, time); // Octave up
        this.droneOsc2.frequency.linearRampToValueAtTime(112, time);
        this.pulseLfo.frequency.linearRampToValueAtTime(4, time); // 4Hz pulse (120 BPM 8th notes)
        this.droneGain.gain.linearRampToValueAtTime(1.0, time);
        break;

      case 'CleanupPhase':
      case 'ReinforcementPhase':
      case 'DrawPhase':
      case 'EndTurn':
        // Receding energy, mid-level filter
        this.droneFilter.frequency.linearRampToValueAtTime(250, time);
        this.droneOsc1.frequency.linearRampToValueAtTime(55, time);
        this.droneOsc2.frequency.linearRampToValueAtTime(56.5, time);
        this.pulseLfo.frequency.linearRampToValueAtTime(1, time); // Slow, heart-beat pulse
        this.droneGain.gain.linearRampToValueAtTime(0.7, time);
        break;

      case 'gameOver':
        // Sinking down, fading away
        this.droneFilter.frequency.linearRampToValueAtTime(50, time);
        this.droneOsc1.frequency.linearRampToValueAtTime(27.5, time); // Sub-bass
        this.droneOsc2.frequency.linearRampToValueAtTime(27.5, time);
        this.pulseLfo.frequency.linearRampToValueAtTime(0, time);
        this.droneGain.gain.linearRampToValueAtTime(0.2, time);
        break;
    }
  }

  public toggleMute(): boolean {
    this.isEnabled = !this.isEnabled;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.isEnabled ? 0.3 : 0, this.ctx.currentTime, 0.1);
    }
    return this.isEnabled;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }
}
