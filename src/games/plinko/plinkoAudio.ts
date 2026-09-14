let audioContext: AudioContext | undefined
let audioOutput: GainNode | undefined
let isEnabled = true

function getAudio() {
  if (!isEnabled) return
  if (audioContext && audioOutput) return { context: audioContext, output: audioOutput }

  const context = new AudioContext()
  const output = context.createGain()
  const compressor = context.createDynamicsCompressor()
  output.gain.value = 0.22
  compressor.threshold.value = -18
  compressor.ratio.value = 8
  compressor.attack.value = 0.003
  compressor.release.value = 0.08
  output.connect(compressor)
  compressor.connect(context.destination)
  audioContext = context
  audioOutput = output
  return { context, output }
}

function playTone(frequency: number, volume: number, duration: number, delay = 0) {
  const audio = getAudio()
  if (!audio || audio.context.state !== 'running') return

  const start = audio.context.currentTime + delay
  const oscillator = audio.context.createOscillator()
  const gain = audio.context.createGain()
  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, start)
  oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.88, start + duration)
  gain.gain.setValueAtTime(0.0001, start)
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.003)
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
  oscillator.connect(gain)
  gain.connect(audio.output)
  oscillator.start(start)
  oscillator.stop(start + duration)
}

export function preparePlinkoAudio() {
  const audio = getAudio()
  if (audio?.context.state === 'suspended') void audio.context.resume()
}

export function setPlinkoSoundEnabled(enabled: boolean) {
  isEnabled = enabled
  if (enabled) {
    preparePlinkoAudio()
  } else if (audioContext && audioOutput) {
    audioOutput.gain.setValueAtTime(0, audioContext.currentTime)
  }

  if (enabled && audioContext && audioOutput) {
    audioOutput.gain.setValueAtTime(0.22, audioContext.currentTime)
  }
}

export function playPlinkoPegHit({ depth, speed }: Readonly<{ depth: number; speed: number }>) {
  const frequency = 560 + Math.max(0, Math.min(1, depth)) * 260 + (Math.random() - 0.5) * 24
  const volume = 0.055 + Math.max(0, Math.min(1, speed / 12)) * 0.045
  playTone(frequency, volume, 0.055)
  playTone(frequency * 2.35, volume * 0.28, 0.025)
}

export function playPlinkoLanding(multiplier: number) {
  const lift = Math.min(240, Math.log2(Math.max(1, multiplier) + 1) * 48)
  playTone(190 + lift, 0.16, 0.14)
  playTone(285 + lift, 0.09, 0.18, 0.045)
}
