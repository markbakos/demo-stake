import { createAudioChannel } from '../../shared/audio'

const audio = createAudioChannel()

export const prepareDiceAudio = audio.prepare
export const setDiceSoundEnabled = audio.setEnabled

export function playDiceRoll(won: boolean) {
  if (won) {
    audio.playTone(620, 0.1, 0.08)
    audio.playTone(920, 0.08, 0.12, 0.06)
  } else {
    audio.playTone(210, 0.1, 0.15)
  }
}
