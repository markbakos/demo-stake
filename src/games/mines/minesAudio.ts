import { createAudioChannel } from '../../shared/audio'

const audio = createAudioChannel()

export const prepareMinesAudio = audio.prepare
export const setMinesSoundEnabled = audio.setEnabled

export function playMinesGem() {
  audio.playTone(760, 0.12, 0.09)
  audio.playTone(1_040, 0.075, 0.12, 0.04)
}

export function playMinesMine() {
  audio.playTone(150, 0.19, 0.2)
  audio.playTone(82, 0.12, 0.24, 0.035)
}

export function playMinesCashOut() {
  audio.playTone(620, 0.12, 0.12)
  audio.playTone(830, 0.1, 0.15, 0.05)
  audio.playTone(1_100, 0.075, 0.18, 0.1)
}
