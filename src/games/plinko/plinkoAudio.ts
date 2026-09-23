import { createAudioChannel } from '../../shared/audio'

const audio = createAudioChannel()

export const preparePlinkoAudio = audio.prepare
export const setPlinkoSoundEnabled = audio.setEnabled

export function playPlinkoPegHit({ depth, speed }: Readonly<{ depth: number; speed: number }>) {
  const frequency = 560 + Math.max(0, Math.min(1, depth)) * 260 + (Math.random() - 0.5) * 24
  const volume = 0.055 + Math.max(0, Math.min(1, speed / 12)) * 0.045
  audio.playTone(frequency, volume, 0.055)
  audio.playTone(frequency * 2.35, volume * 0.28, 0.025)
}

export function playPlinkoLanding(multiplier: number) {
  const lift = Math.min(240, Math.log2(Math.max(1, multiplier) + 1) * 48)
  audio.playTone(190 + lift, 0.16, 0.14)
  audio.playTone(285 + lift, 0.09, 0.18, 0.045)
}
