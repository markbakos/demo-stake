import { Render, Runner } from 'matter-js'
import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { RowCount } from './plinkoConfig'
import { BOARD_HEIGHT, BOARD_WIDTH } from './plinkoGeometry'
import { createPlinkoPhysics, type DropBallInput, type Landing } from './plinkoPhysics'

type RunningBoard = ReturnType<typeof createPlinkoPhysics>

export function useTargetedPlinko(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  rows: RowCount,
  onLanding: (landing: Landing) => void,
) {
  const boardRef = useRef<RunningBoard>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const board = createPlinkoPhysics(rows, onLanding)
    const render = Render.create({
      canvas,
      engine: board.engine,
      options: {
        width: BOARD_WIDTH,
        height: BOARD_HEIGHT,
        background: '#0f192a',
        wireframes: false,
        pixelRatio: Math.min(window.devicePixelRatio, 2),
      },
    })
    const runner = Runner.create({ delta: 1000 / 60 })
    Render.run(render)
    Runner.run(runner, board.engine)
    boardRef.current = board

    return () => {
      boardRef.current = null
      Runner.stop(runner)
      Render.stop(render)
      board.destroy()
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [canvasRef, onLanding, rows])

  return useCallback((input: DropBallInput) => boardRef.current?.dropBall(input) ?? false, [])
}
