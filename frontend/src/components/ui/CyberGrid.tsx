import { useEffect, useRef } from 'react'

export const CyberGrid = ({ className = '' }) => {
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

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      
      const gridSize = 50
      const lineColor = 'rgba(0, 255, 255, 0.1)'
      const accentColor = 'rgba(0, 255, 255, 0.3)'
      
      // Draw grid
      ctx.strokeStyle = lineColor
      ctx.lineWidth = 0.5
      
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, canvas.height)
        ctx.stroke()
      }
      
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(canvas.width, y)
        ctx.stroke()
      }

      // Animated scan lines
      const scanY = (time * 20) % (canvas.height + 200) - 100
      const gradient = ctx.createLinearGradient(0, scanY - 50, 0, scanY + 50)
      gradient.addColorStop(0, 'rgba(0, 255, 255, 0)')
      gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.1)')
      gradient.addColorStop(1, 'rgba(0, 255, 255, 0)')
      ctx.fillStyle = gradient
      ctx.fillRect(0, scanY - 50, canvas.width, 100)

      // Pulsing nodes
      const nodes = [
        { x: canvas.width * 0.2, y: canvas.height * 0.3 },
        { x: canvas.width * 0.8, y: canvas.height * 0.7 },
        { x: canvas.width * 0.5, y: canvas.height * 0.5 },
      ]

      nodes.forEach((node, i) => {
        const pulse = Math.sin(time * 0.005 + i) * 0.5 + 0.5
        ctx.fillStyle = `rgba(0, 255, 255, ${0.3 * pulse})`
        ctx.beginPath()
        ctx.arc(node.x, node.y, 3 + pulse * 2, 0, Math.PI * 2)
        ctx.fill()
        
        // Connection lines
        if (i < nodes.length - 1) {
          ctx.strokeStyle = `rgba(0, 255, 255, ${0.2 * pulse})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(node.x, node.y)
          ctx.lineTo(nodes[i + 1].x, nodes[i + 1].y)
          ctx.stroke()
        }
      })

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

