// Cyber-security themed sound effects
// Using Web Audio API to generate synthetic sounds

class SoundManager {
  constructor() {
    this.audioContext = null
    // Load sound preference from localStorage, default to true
    const savedPreference = localStorage.getItem('soundEnabled')
    this.enabled = savedPreference !== null ? savedPreference === 'true' : true
    this.volume = 0.3
    
    // Initialize audio context on first user interaction
    this.initAudioContext = () => {
      if (!this.audioContext) {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
      }
    }
  }

  // Generate a cyber-themed click sound
  playClick() {
    if (!this.enabled) return
    this.initAudioContext()
    
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    // Short, sharp beep with slight frequency sweep
    oscillator.frequency.setValueAtTime(800, this.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(600, this.audioContext.currentTime + 0.05)
    
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.1)
    
    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.1)
  }

  // Generate a confirmation/accept sound
  playConfirm() {
    if (!this.enabled) return
    this.initAudioContext()
    
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    // Pleasant ascending tone
    oscillator.frequency.setValueAtTime(600, this.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(800, this.audioContext.currentTime + 0.15)
    
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.4, this.audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.2)
    
    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.2)
  }

  // Generate an error/deny sound
  playError() {
    if (!this.enabled) return
    this.initAudioContext()
    
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    // Descending tone for error
    oscillator.frequency.setValueAtTime(500, this.audioContext.currentTime)
    oscillator.frequency.exponentialRampToValueAtTime(300, this.audioContext.currentTime + 0.2)
    
    oscillator.type = 'sawtooth'
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.3, this.audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.25)
    
    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.25)
  }

  // Generate a hover sound
  playHover() {
    if (!this.enabled) return
    this.initAudioContext()
    
    const oscillator = this.audioContext.createOscillator()
    const gainNode = this.audioContext.createGain()
    
    oscillator.connect(gainNode)
    gainNode.connect(this.audioContext.destination)
    
    // Very subtle, quick tone
    oscillator.frequency.setValueAtTime(700, this.audioContext.currentTime)
    oscillator.type = 'sine'
    gainNode.gain.setValueAtTime(0, this.audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(this.volume * 0.15, this.audioContext.currentTime + 0.01)
    gainNode.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05)
    
    oscillator.start(this.audioContext.currentTime)
    oscillator.stop(this.audioContext.currentTime + 0.05)
  }

  setEnabled(enabled) {
    this.enabled = enabled
    // Save preference to localStorage
    localStorage.setItem('soundEnabled', enabled.toString())
  }

  getEnabled() {
    return this.enabled
  }

  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume))
  }
}

export const soundManager = new SoundManager()

// React hook for easy access
export const useSound = () => {
  return {
    playClick: () => soundManager.playClick(),
    playConfirm: () => soundManager.playConfirm(),
    playError: () => soundManager.playError(),
    playHover: () => soundManager.playHover(),
    enabled: soundManager.getEnabled(),
    setEnabled: (enabled) => soundManager.setEnabled(enabled),
  }
}

