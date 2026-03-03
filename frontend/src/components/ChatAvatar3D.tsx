/**
 * 3D Chat Avatar Component
 * Animated 3D avatar for the chatbot interface
 */

import { useRef, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Sphere, MeshDistortMaterial, Environment, PerspectiveCamera } from '@react-three/drei'

// Animated sphere with distortion effect
function AnimatedSphere({ typing, ...props }) {
  const meshRef = useRef(null)
  const [hovered, setHovered] = useState(false)

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Gentle rotation
      meshRef.current.rotation.x += delta * 0.2
      meshRef.current.rotation.y += delta * 0.3
      
      // Pulsing animation when typing
      if (typing) {
        const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1
        meshRef.current.scale.setScalar(scale)
      } else {
        meshRef.current.scale.setScalar(1)
      }
    }
  })

  return (
    <Sphere
      ref={meshRef}
      args={[1, 64, 64]}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      {...props}
    >
      <MeshDistortMaterial
        color={hovered ? "#4f46e5" : "#6366f1"}
        attach="material"
        distort={0.3}
        speed={2}
        roughness={0.1}
        metalness={0.8}
      />
    </Sphere>
  )
}

// Floating particles effect
function FloatingParticles({ count = 50 }) {
  const particles = useRef([])

  useFrame((state) => {
    particles.current.forEach((particle, i) => {
      if (particle) {
        particle.position.y = Math.sin(state.clock.elapsedTime + i) * 0.5
        particle.rotation.x += 0.01
        particle.rotation.y += 0.01
      }
    })
  })

  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <mesh
          key={i}
          ref={(el) => (particles.current[i] = el)}
          position={[
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
            (Math.random() - 0.5) * 4,
          ]}
          scale={Math.random() * 0.1 + 0.05}
        >
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshStandardMaterial
            color="#818cf8"
            emissive="#6366f1"
            emissiveIntensity={0.5}
            transparent
            opacity={0.6}
          />
        </mesh>
      ))}
    </>
  )
}

// Main 3D Scene
function Scene({ typing, showParticles = true }) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} color="#818cf8" />
      
      <AnimatedSphere typing={typing} position={[0, 0, 0]} />
      
      {showParticles && <FloatingParticles count={30} />}
      
      <OrbitControls
        enableZoom={false}
        enablePan={false}
        autoRotate
        autoRotateSpeed={1}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 3}
      />
      
      <Environment preset="sunset" />
    </>
  )
}

// Main Component
export const ChatAvatar3D = ({ typing = false, showParticles = true, className = "" }) => {
  return (
    <div className={`relative ${className}`} style={{ width: '100%', height: '100%' }}>
      <Canvas
        style={{ background: 'transparent' }}
        gl={{ alpha: true, antialias: true }}
      >
        <Scene typing={typing} showParticles={showParticles} />
      </Canvas>
    </div>
  )
}

