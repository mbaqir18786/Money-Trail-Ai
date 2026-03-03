// useSoundEngine.js
import { useRef, useCallback } from 'react'

// MODULE-LEVEL flag — never stale, survives every re-render
// This is the fix for mute not working
let _muted = false

export function useSoundEngine() {
  const ctxRef = useRef(null)

  const getCtx = () => {
    if (!ctxRef.current)
      ctxRef.current = new (window.AudioContext || window.webkitAudioContext)()
    if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    return ctxRef.current
  }

  // This now works because _muted is module-level, not inside a stale closure
  const setMuted = useCallback((val) => { _muted = Boolean(val) }, [])

  const tone = (freq, type, dur, gain, delay, ctx) => {
    try {
      const o = ctx.createOscillator(), g = ctx.createGain()
      o.connect(g); g.connect(ctx.destination)
      o.type = type
      o.frequency.setValueAtTime(freq, ctx.currentTime + delay)
      g.gain.setValueAtTime(0, ctx.currentTime + delay)
      g.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur)
      o.start(ctx.currentTime + delay)
      o.stop(ctx.currentTime + delay + dur + 0.05)
    } catch {}
  }

  const noise = (dur, gain, delay, ctx) => {
    try {
      const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate)
      const d = buf.getChannelData(0)
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
      const src = ctx.createBufferSource(), flt = ctx.createBiquadFilter(), g = ctx.createGain()
      src.buffer = buf; flt.type = 'bandpass'; flt.frequency.value = 800
      src.connect(flt); flt.connect(g); g.connect(ctx.destination)
      g.gain.setValueAtTime(0, ctx.currentTime + delay)
      g.gain.linearRampToValueAtTime(gain, ctx.currentTime + delay + 0.01)
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur)
      src.start(ctx.currentTime + delay)
      src.stop(ctx.currentTime + delay + dur + 0.1)
    } catch {}
  }

  // 🚨 Alarm — plays ONCE, short (3 pulses ~0.5s). NOT looping.
  const playFraudAlarm = useCallback(() => {
    if (_muted) return
    const ctx = getCtx()
    for (let i = 0; i < 3; i++) {
      tone(880, 'sawtooth', 0.12, 0.28, i * 0.17,        ctx)
      tone(660, 'sawtooth', 0.12, 0.18, i * 0.17 + 0.08, ctx)
      noise(0.05, 0.09, i * 0.17, ctx)
    }
    tone(80, 'sine', 0.2, 0.28, 0,    ctx)
    tone(80, 'sine', 0.2, 0.28, 0.25, ctx)
  }, [])

  // 💰 Cash — single coin per transfer
  const playCash = useCallback(() => {
    if (_muted) return
    const ctx = getCtx()
    tone(1200, 'sine', 0.06, 0.16, 0,    ctx)
    tone(1600, 'sine', 0.05, 0.12, 0.04, ctx)
    tone(2000, 'sine', 0.04, 0.08, 0.07, ctx)
    noise(0.03, 0.05, 0, ctx)
  }, [])

  // ⚠️ Warning — rising 3-tone
  const playWarning = useCallback(() => {
    if (_muted) return
    const ctx = getCtx()
    tone(440, 'triangle', 0.09, 0.16, 0,    ctx)
    tone(550, 'triangle', 0.09, 0.16, 0.11, ctx)
    tone(660, 'triangle', 0.09, 0.16, 0.22, ctx)
  }, [])

  // 📄 STR success chime
  const playSuccess = useCallback(() => {
    if (_muted) return
    const ctx = getCtx()
    ;[523, 659, 784, 1047].forEach((f, i) => tone(f, 'sine', 0.2, 0.15, i * 0.08, ctx))
  }, [])

  // 🔒 Freeze thud
  const playFreeze = useCallback(() => {
    if (_muted) return
    const ctx = getCtx()
    noise(0.05, 0.32, 0, ctx); noise(0.04, 0.22, 0.07, ctx)
    tone(200, 'square', 0.07, 0.25, 0,    ctx)
    tone(140, 'square', 0.07, 0.25, 0.06, ctx)
  }, [])

  // 🔑 PIN tap
  const playPin = useCallback(() => {
    if (_muted) return
    const ctx = getCtx()
    tone(900, 'sine', 0.03, 0.1, 0, ctx)
    noise(0.02, 0.05, 0, ctx)
  }, [])

  // ✅ Login
  const playLogin = useCallback(() => {
    if (_muted) return
    const ctx = getCtx()
    tone(523, 'sine', 0.1, 0.14, 0,    ctx)
    tone(784, 'sine', 0.1, 0.14, 0.12, ctx)
  }, [])

  return { setMuted, playFraudAlarm, playCash, playWarning, playSuccess, playFreeze, playPin, playLogin }
}