'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// Game types
interface Position {
  x: number
  y: number
}

interface GameStats {
  score: number
  applesEaten: number
  gameOver: boolean
  isPaused: boolean
}

interface TouchControls {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
}

const GRID_SIZE = 20
const CANVAS_WIDTH = 400
const CANVAS_HEIGHT = 400
const INITIAL_SNAKE: Position[] = [{ x: 10, y: 10 }]
const INITIAL_DIRECTION: Position = { x: 1, y: 0 }
const MAX_APPLES = 10
const GAME_SPEED = 150

export default function SnakeAdventure(): JSX.Element {
  // Game state
  const [snake, setSnake] = useState<Position[]>(INITIAL_SNAKE)
  const [direction, setDirection] = useState<Position>(INITIAL_DIRECTION)
  const [apple, setApple] = useState<Position>({ x: 15, y: 15 })
  const [stats, setStats] = useState<GameStats>({
    score: 0,
    applesEaten: 0,
    gameOver: false,
    isPaused: false
  })
  const [gameStarted, setGameStarted] = useState<boolean>(false)
  const [showControls, setShowControls] = useState<boolean>(true)
  const [isMobile, setIsMobile] = useState<boolean>(false)
  const [touchControls, setTouchControls] = useState<TouchControls>({
    up: false,
    down: false,
    left: false,
    right: false
  })

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameLoopRef = useRef<NodeJS.Timeout>()
  const lastTimeRef = useRef<number>(0)
  const fpsRef = useRef<number>(0)

  // Check if mobile device
  useEffect(() => {
    const checkMobile = (): void => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Hide controls after 5 seconds
  useEffect(() => {
    if (gameStarted && showControls) {
      const timer = setTimeout(() => setShowControls(false), 5000)
      return () => clearTimeout(timer)
    }
  }, [gameStarted, showControls])

  // Generate random apple position
  const generateApple = useCallback((currentSnake: Position[]): Position => {
    let newApple: Position
    do {
      newApple = {
        x: Math.floor(Math.random() * (CANVAS_WIDTH / GRID_SIZE)),
        y: Math.floor(Math.random() * (CANVAS_HEIGHT / GRID_SIZE))
      }
    } while (currentSnake.some(segment => segment.x === newApple.x && segment.y === newApple.y))
    return newApple
  }, [])

  // Game logic
  const moveSnake = useCallback(() => {
    if (stats.gameOver || stats.isPaused || !gameStarted) return

    setSnake(currentSnake => {
      const newSnake = [...currentSnake]
      const head = { ...newSnake[0] }
      
      head.x += direction.x
      head.y += direction.y

      // Check wall collision
      if (head.x < 0 || head.x >= CANVAS_WIDTH / GRID_SIZE || 
          head.y < 0 || head.y >= CANVAS_HEIGHT / GRID_SIZE) {
        setStats(prev => ({ ...prev, gameOver: true }))
        return currentSnake
      }

      // Check self collision
      if (newSnake.some(segment => segment.x === head.x && segment.y === head.y)) {
        setStats(prev => ({ ...prev, gameOver: true }))
        return currentSnake
      }

      newSnake.unshift(head)

      // Check apple collision
      if (head.x === apple.x && head.y === apple.y) {
        const newScore = stats.score + 10
        const newApplesEaten = stats.applesEaten + 1
        
        setStats(prev => ({
          ...prev,
          score: newScore,
          applesEaten: newApplesEaten,
          gameOver: newApplesEaten >= MAX_APPLES
        }))

        if (newApplesEaten < MAX_APPLES) {
          setApple(generateApple(newSnake))
        }
      } else {
        newSnake.pop()
      }

      return newSnake
    })
  }, [direction, apple, stats.gameOver, stats.isPaused, gameStarted, stats.score, stats.applesEaten, generateApple])

  // Handle keyboard input
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent): void => {
      if (!gameStarted || stats.gameOver || stats.isPaused) return

      const key = e.key.toLowerCase()
      switch (key) {
        case 'w':
          if (direction.y === 0) setDirection({ x: 0, y: -1 })
          break
        case 's':
          if (direction.y === 0) setDirection({ x: 0, y: 1 })
          break
        case 'a':
          if (direction.x === 0) setDirection({ x: -1, y: 0 })
          break
        case 'd':
          if (direction.x === 0) setDirection({ x: 1, y: 0 })
          break
        case ' ':
          e.preventDefault()
          setStats(prev => ({ ...prev, isPaused: !prev.isPaused }))
          break
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [direction, gameStarted, stats.gameOver, stats.isPaused])

  // Handle touch controls
  const handleTouchDirection = (newDirection: Position): void => {
    if (!gameStarted || stats.gameOver || stats.isPaused) return
    
    if ((newDirection.x !== 0 && direction.x === 0) || 
        (newDirection.y !== 0 && direction.y === 0)) {
      setDirection(newDirection)
    }
  }

  // Game loop
  useEffect(() => {
    if (gameStarted && !stats.gameOver) {
      gameLoopRef.current = setInterval(() => {
        // Calculate FPS
        const now = Date.now()
        if (lastTimeRef.current) {
          fpsRef.current = Math.round(1000 / (now - lastTimeRef.current))
        }
        lastTimeRef.current = now

        moveSnake()
      }, GAME_SPEED)
    }

    return () => {
      if (gameLoopRef.current) {
        clearInterval(gameLoopRef.current)
      }
    }
  }, [gameStarted, stats.gameOver, moveSnake])

  // Render canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.fillStyle = '#1a1a1a'
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT)

    // Draw grid lines
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 1
    for (let i = 0; i <= CANVAS_WIDTH / GRID_SIZE; i++) {
      ctx.beginPath()
      ctx.moveTo(i * GRID_SIZE, 0)
      ctx.lineTo(i * GRID_SIZE, CANVAS_HEIGHT)
      ctx.stroke()
    }
    for (let i = 0; i <= CANVAS_HEIGHT / GRID_SIZE; i++) {
      ctx.beginPath()
      ctx.moveTo(0, i * GRID_SIZE)
      ctx.lineTo(CANVAS_WIDTH, i * GRID_SIZE)
      ctx.stroke()
    }

    // Draw snake
    snake.forEach((segment, index) => {
      ctx.fillStyle = index === 0 ? '#4ade80' : '#22c55e'
      ctx.fillRect(
        segment.x * GRID_SIZE + 1,
        segment.y * GRID_SIZE + 1,
        GRID_SIZE - 2,
        GRID_SIZE - 2
      )
    })

    // Draw apple
    if (stats.applesEaten < MAX_APPLES) {
      ctx.fillStyle = '#ef4444'
      ctx.fillRect(
        apple.x * GRID_SIZE + 1,
        apple.y * GRID_SIZE + 1,
        GRID_SIZE - 2,
        GRID_SIZE - 2
      )
    }
  }, [snake, apple, stats.applesEaten])

  const startGame = (): void => {
    setSnake(INITIAL_SNAKE)
    setDirection(INITIAL_DIRECTION)
    setApple({ x: 15, y: 15 })
    setStats({
      score: 0,
      applesEaten: 0,
      gameOver: false,
      isPaused: false
    })
    setGameStarted(true)
    setShowControls(true)
  }

  const togglePause = (): void => {
    if (gameStarted && !stats.gameOver) {
      setStats(prev => ({ ...prev, isPaused: !prev.isPaused }))
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 to-black text-white flex flex-col items-center justify-center p-4">
      {/* Stats Monitor */}
      {gameStarted && (
        <div className="fixed top-4 right-4 bg-gray-800/80 text-white p-2 rounded text-xs font-mono z-10">
          <div>FPS: {fpsRef.current}</div>
          <div>Mobile: {isMobile.toString()}</div>
          <div>Score: {stats.score}</div>
          <div>Apples: {stats.applesEaten}/{MAX_APPLES}</div>
        </div>
      )}

      {/* Control Guide */}
      {gameStarted && showControls && (
        <div className={`fixed ${isMobile ? 'top-4 left-4' : 'top-4 left-1/2 transform -translate-x-1/2'} bg-gray-800/80 text-white p-2 rounded text-xs font-mono z-10`}>
          <div className="text-center mb-1 font-bold">Controls</div>
          <div>W - Up</div>
          <div>A - Left</div>
          <div>S - Down</div>
          <div>D - Right</div>
          <div>Space - Pause</div>
        </div>
      )}

      <div className="w-full max-w-md mx-auto">
        {!gameStarted ? (
          <Card className="bg-gray-800/50 border-gray-700">
            <CardContent className="p-6 text-center">
              <h1 className="text-3xl font-bold mb-4 text-green-400">🐍 Snake Adventure</h1>
              <p className="text-gray-300 mb-4">
                Navigate your snake to collect apples and grow longer! 
                Use WASD to move and try to collect all {MAX_APPLES} apples without hitting walls or yourself.
              </p>
              <div className="text-sm text-gray-400 mb-6">
                • WASD - Move snake<br/>
                • Space - Pause game<br/>
                • Score 10 points per apple
              </div>
              <Button onClick={startGame} className="bg-green-600 hover:bg-green-700 text-white px-8 py-3">
                Start Game
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="relative">
            {/* Game Canvas */}
            <canvas
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              className="border border-gray-600 bg-gray-900 rounded-lg mx-auto block"
            />

            {/* Game Over Screen */}
            {stats.gameOver && (
              <div className="absolute inset-0 bg-black/80 flex items-center justify-center rounded-lg">
                <Card className="bg-gray-800/90 border-gray-600">
                  <CardContent className="p-6 text-center">
                    <h2 className="text-2xl font-bold mb-4 text-green-400">
                      {stats.applesEaten >= MAX_APPLES ? '🎉 Victory!' : '💀 Game Over!'}
                    </h2>
                    <div className="text-gray-300 mb-4">
                      <div>Final Score: {stats.score}</div>
                      <div>Apples Collected: {stats.applesEaten}/{MAX_APPLES}</div>
                      <div>Snake Length: {snake.length}</div>
                    </div>
                    <Button onClick={startGame} className="bg-green-600 hover:bg-green-700 text-white">
                      Play Again
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Pause Screen */}
            {stats.isPaused && !stats.gameOver && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center rounded-lg">
                <Card className="bg-gray-800/90 border-gray-600">
                  <CardContent className="p-4 text-center">
                    <h2 className="text-xl font-bold mb-4 text-yellow-400">⏸️ Paused</h2>
                    <Button onClick={togglePause} className="bg-yellow-600 hover:bg-yellow-700 text-white">
                      Resume
                    </Button>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Game Info */}
            <div className="flex justify-between items-center mt-4 text-sm">
              <div>Score: {stats.score}</div>
              <div>Apples: {stats.applesEaten}/{MAX_APPLES}</div>
              <Button 
                onClick={togglePause} 
                size="sm" 
                variant="outline"
                disabled={stats.gameOver}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                {stats.isPaused ? '▶️' : '⏸️'}
              </Button>
            </div>
          </div>
        )}

        {/* Mobile Controls */}
        {isMobile && gameStarted && !stats.gameOver && (
          <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-20">
            <div className="relative w-32 h-32">
              {/* Virtual Joystick Base */}
              <div className="w-32 h-32 bg-gray-700/50 rounded-full border border-gray-500 flex items-center justify-center">
                {/* Direction Buttons */}
                <button
                  className="absolute top-2 w-8 h-8 bg-gray-600/80 hover:bg-gray-500/80 rounded-full flex items-center justify-center text-white font-bold"
                  onTouchStart={() => handleTouchDirection({ x: 0, y: -1 })}
                  onMouseDown={() => handleTouchDirection({ x: 0, y: -1 })}
                >
                  ↑
                </button>
                <button
                  className="absolute bottom-2 w-8 h-8 bg-gray-600/80 hover:bg-gray-500/80 rounded-full flex items-center justify-center text-white font-bold"
                  onTouchStart={() => handleTouchDirection({ x: 0, y: 1 })}
                  onMouseDown={() => handleTouchDirection({ x: 0, y: 1 })}
                >
                  ↓
                </button>
                <button
                  className="absolute left-2 w-8 h-8 bg-gray-600/80 hover:bg-gray-500/80 rounded-full flex items-center justify-center text-white font-bold"
                  onTouchStart={() => handleTouchDirection({ x: -1, y: 0 })}
                  onMouseDown={() => handleTouchDirection({ x: -1, y: 0 })}
                >
                  ←
                </button>
                <button
                  className="absolute right-2 w-8 h-8 bg-gray-600/80 hover:bg-gray-500/80 rounded-full flex items-center justify-center text-white font-bold"
                  onTouchStart={() => handleTouchDirection({ x: 1, y: 0 })}
                  onMouseDown={() => handleTouchDirection({ x: 1, y: 0 })}
                >
                  →
                </button>
              </div>
            </div>

            {/* Pause Button */}
            <div className="absolute -right-16 top-1/2 transform -translate-y-1/2">
              <button
                onClick={togglePause}
                className="w-12 h-12 bg-gray-600/80 hover:bg-gray-500/80 rounded-full flex items-center justify-center text-white text-lg"
              >
                {stats.isPaused ? '▶️' : '⏸️'}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}