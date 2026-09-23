type AudioGraph = {
  context: AudioContext
  compressor: DynamicsCompressorNode
}

let audioGraph: AudioGraph | undefined

function getAudioGraph(): AudioGraph | undefined {
  if (audioGraph) return audioGraph
  if (typeof AudioContext === 'undefined') return

  try {
    const context = new AudioContext()
    const compressor = context.createDynamicsCompressor()
    compressor.threshold.value = -18
    compressor.ratio.value = 8
    compressor.attack.value = 0.003
    compressor.release.value = 0.08
    compressor.connect(context.destination)
    audioGraph = { context, compressor }
    return audioGraph
  } catch {
    return undefined
  }
}

export function createAudioChannel() {
  let output: GainNode | undefined
  let isEnabled = true

  function getAudio() {
    if (!isEnabled) return
    const graph = getAudioGraph()
    if (!graph) return

    try {
      if (!output) {
        output = graph.context.createGain()
        output.gain.value = 0.22
        output.connect(graph.compressor)
      }
      return { context: graph.context, output }
    } catch {
      output = undefined
    }
  }

  function prepare() {
    const audio = getAudio()
    if (audio?.context.state === 'suspended') void audio.context.resume().catch(() => {})
  }

  function setEnabled(enabled: boolean) {
    isEnabled = enabled
    if (!output || !audioGraph) return
    try {
      output.gain.setValueAtTime(enabled ? 0.22 : 0, audioGraph.context.currentTime)
      if (enabled && audioGraph.context.state === 'suspended') void audioGraph.context.resume().catch(() => {})
    } catch {
      // Audio is optional; a failed device must not interrupt the game.
    }
  }

  function playTone(frequency: number, volume: number, duration: number, delay = 0) {
    const audio = getAudio()
    if (!audio) return
    const { context, output } = audio

    function schedule() {
      if (!isEnabled || context.state !== 'running') return
      try {
        const start = context.currentTime + delay
        const oscillator = context.createOscillator()
        const gain = context.createGain()
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(frequency, start)
        oscillator.frequency.exponentialRampToValueAtTime(frequency * 0.88, start + duration)
        gain.gain.setValueAtTime(0.0001, start)
        gain.gain.exponentialRampToValueAtTime(volume, start + 0.003)
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration)
        oscillator.connect(gain)
        gain.connect(output)
        oscillator.start(start)
        oscillator.stop(start + duration)
      } catch {
        // Audio is optional; a failed device must not interrupt the game.
      }
    }

    if (context.state === 'running') schedule()
    else if (context.state === 'suspended') void context.resume().then(schedule).catch(() => {})
  }

  return { playTone, prepare, setEnabled }
}
