import { useEffect, useRef } from 'react'

export const CyberGrid3D = ({ className = '' }) => {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    let animationFrameId
    let time = 0

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    // 3D perspective grid
    const draw3DGrid = () => {
      const gridSize = 60
      const perspective = 800
      const centerX = canvas.width / 2
      const centerY = canvas.height / 2
      
      // Draw perspective grid lines
      ctx.strokeStyle = 'rgba(0, 255, 255, 0.15)'
      ctx.lineWidth = 0.5
      
      // Horizontal lines (going into depth)
      for (let i = -10; i <= 10; i++) {
        const z = i * gridSize
        const scale = perspective / (perspective + z)
        const x = centerX
        const y = centerY + z * 0.5
        
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.globalAlpha = scale * 0.6
        ctx.stroke()
      }
      
      // Vertical lines
      for (let i = -15; i <= 15; i++) {
        const x = centerX + i * gridSize
        const scale = 1 - Math.abs(i) * 0.03
        ctx.globalAlpha = scale * 0.4
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      
      ctx.globalAlpha = 1
    }

    // 3D floating particles
    const particles = Array.from({ length: 50 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random() * 1000,
      speed: 0.5 + Math.random() * 1.5,
      size: 2 + Math.random() * 3,
      color: Math.random() > 0.5 ? 'rgba(0, 255, 255, 0.6)' : 'rgba(128, 0, 255, 0.6)',
    }))

    const drawParticles = () => {
      particles.forEach(particle => {
        particle.z -= particle.speed
        if (particle.z < 0) {
          particle.z = 1000
          particle.x = Math.random() * canvas.width
          particle.y = Math.random() * canvas.height
        }
        
        const scale = 800 / (800 + particle.z)
        const x = particle.x
        const y = particle.y - particle.z * 0.3
        const size = particle.size * scale
        
        if (x >= 0 && x <= canvas.width && y >= 0 && y <= canvas.height) {
          ctx.fillStyle = particle.color
          ctx.globalAlpha = scale * 0.8
          ctx.beginPath()
          ctx.arc(x, y, size, 0, Math.PI * 2)
          ctx.fill()
          
          // Glow effect
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, size * 3)
          gradient.addColorStop(0, particle.color)
          gradient.addColorStop(1, 'transparent')
          ctx.fillStyle = gradient
          ctx.fillRect(x - size * 3, y - size * 3, size * 6, size * 6)
        }
      })
      ctx.globalAlpha = 1
    }

    // 3D geometric shapes
    const shapes = Array.from({ length: 8 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      z: Math.random() * 500,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 0.02,
      size: 20 + Math.random() * 40,
      type: Math.floor(Math.random() * 3), // 0: cube, 1: pyramid, 2: hexagon
    }))

    const draw3DShapes = () => {
      shapes.forEach(shape => {
        shape.rotation += shape.rotationSpeed
        shape.z -= 1
        if (shape.z < 0) {
          shape.z = 500
          shape.x = Math.random() * canvas.width
          shape.y = Math.random() * canvas.height
        }
        
        const scale = 400 / (400 + shape.z)
        const x = shape.x
        const y = shape.y - shape.z * 0.2
        const size = shape.size * scale
        
        if (x >= -size && x <= canvas.width + size && y >= -size && y <= canvas.height + size) {
          ctx.save()
          ctx.translate(x, y)
          ctx.rotate(shape.rotation)
          ctx.globalAlpha = scale * 0.3
          ctx.strokeStyle = 'rgba(0, 255, 255, 0.4)'
          ctx.lineWidth = 2 * scale
          
          const s = size / 2
          
          if (shape.type === 0) {
            // Cube wireframe
            ctx.beginPath()
            // Front face
            ctx.moveTo(-s, -s)
            ctx.lineTo(s, -s)
            ctx.lineTo(s, s)
            ctx.lineTo(-s, s)
            ctx.closePath()
            // Back face
            ctx.moveTo(-s * 0.7, -s * 0.7)
            ctx.lineTo(s * 0.7, -s * 0.7)
            ctx.lineTo(s * 0.7, s * 0.7)
            ctx.lineTo(-s * 0.7, s * 0.7)
            ctx.closePath()
            // Connecting lines
            ctx.moveTo(-s, -s)
            ctx.lineTo(-s * 0.7, -s * 0.7)
            ctx.moveTo(s, -s)
            ctx.lineTo(s * 0.7, -s * 0.7)
            ctx.moveTo(s, s)
            ctx.lineTo(s * 0.7, s * 0.7)
            ctx.moveTo(-s, s)
            ctx.lineTo(-s * 0.7, s * 0.7)
            ctx.stroke()
          } else if (shape.type === 1) {
            // Pyramid
            ctx.beginPath()
            ctx.moveTo(0, -s)
            ctx.lineTo(-s, s)
            ctx.lineTo(s, s)
            ctx.closePath()
            ctx.moveTo(0, -s)
            ctx.lineTo(0, s * 0.5)
            ctx.stroke()
          } else {
            // Hexagon
            ctx.beginPath()
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI / 3) * i
              const px = Math.cos(angle) * s
              const py = Math.sin(angle) * s
              if (i === 0) ctx.moveTo(px, py)
              else ctx.lineTo(px, py)
            }
            ctx.closePath()
            ctx.stroke()
          }
          
          ctx.restore()
        }
      })
      ctx.globalAlpha = 1
    }

    // Holographic scan lines
    const drawScanLines = () => {
      const scanY = (time * 15) % (canvas.height + 100) - 50
      const gradient = ctx.createLinearGradient(0, scanY - 30, 0, scanY + 30)
      gradient.addColorStop(0, 'rgba(0, 255, 255, 0)')
      gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.15)')
      gradient.addColorStop(1, 'rgba(0, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, scanY - 30, canvas.width, 60)
    }


    // Connection network lines
    const drawNetwork = () => {
      const nodes = [
        { x: canvas.width * 0.1, y: canvas.height * 0.2, pulse: Math.sin(time * 0.003) },
        { x: canvas.width * 0.9, y: canvas.height * 0.3, pulse: Math.sin(time * 0.003 + 1) },
        { x: canvas.width * 0.2, y: canvas.height * 0.8, pulse: Math.sin(time * 0.003 + 2) },
        { x: canvas.width * 0.8, y: canvas.height * 0.7, pulse: Math.sin(time * 0.003 + 3) },
        { x: canvas.width * 0.5, y: canvas.height * 0.5, pulse: Math.sin(time * 0.003 + 4) },
      ]

      // Draw connections
      nodes.forEach((node, i) => {
        nodes.slice(i + 1).forEach(target => {
          const distance = Math.sqrt(
            Math.pow(node.x - target.x, 2) + Math.pow(node.y - target.y, 2)
          )
          if (distance < 400) {
            const alpha = (1 - distance / 400) * 0.2 * (node.pulse * 0.5 + 0.5)
            ctx.strokeStyle = `rgba(0, 255, 255, ${alpha})`
            ctx.lineWidth = 1
            ctx.beginPath()
            ctx.moveTo(node.x, node.y)
            ctx.lineTo(target.x, target.y)
            ctx.stroke()
          }
        })
      })

      // Draw nodes
      nodes.forEach(node => {
        const pulse = node.pulse * 0.5 + 0.5
        const gradient = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, 8)
        gradient.addColorStop(0, `rgba(0, 255, 255, ${0.8 * pulse})`)
        gradient.addColorStop(1, 'transparent')
        ctx.fillStyle = gradient
        ctx.fillRect(node.x - 8, node.y - 8, 16, 16)
      })
    }

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      draw3DGrid()
      drawParticles()
      draw3DShapes()
      drawNetwork()
      drawScanLines()

      time += 16
      animationFrameId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ pointerEvents: 'none' }}
    />
  )
}

