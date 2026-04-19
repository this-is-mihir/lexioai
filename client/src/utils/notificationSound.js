let audioContext

const getAudioContext = () => {
  if (typeof window === 'undefined') return null

  const Ctor = window.AudioContext || window.webkitAudioContext
  if (!Ctor) return null

  if (!audioContext) {
    audioContext = new Ctor()
  }

  return audioContext
}

export const playNotificationSound = async () => {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    if (ctx.state === 'suspended') {
      await ctx.resume()
    }

    const now = ctx.currentTime
    const gain = ctx.createGain()
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(0.18, now + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.38)
    gain.connect(ctx.destination)

    const osc1 = ctx.createOscillator()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(660, now)
    osc1.connect(gain)
    osc1.start(now)
    osc1.stop(now + 0.18)

    const osc2 = ctx.createOscillator()
    osc2.type = 'triangle'
    osc2.frequency.setValueAtTime(880, now + 0.14)
    osc2.connect(gain)
    osc2.start(now + 0.14)
    osc2.stop(now + 0.36)
  } catch {
    // Ignore browser-level audio restrictions silently.
  }
}
