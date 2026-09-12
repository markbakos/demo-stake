import { Bodies, Body, Composite, Engine, Events, Render, Runner } from 'matter-js'
import { useCallback, useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type { RowCount } from './plinkoConfig'
import { BOARD_HEIGHT, BOARD_WIDTH, createPlinkoGeometry } from './plinkoGeometry'

const BALL_CATEGORY = 0x0002
const BOARD_CATEGORY = 0x0004
const BALL_LABEL_PREFIX = 'plinko-ball:'

type RunningBoard = {
  engine: Engine
  geometry: ReturnType<typeof createPlinkoGeometry>
}

export function useNaturalPlinko(
  canvasRef: RefObject<HTMLCanvasElement | null>,
  rows: RowCount,
  onLanding: (roundId: string, bin: number) => void,
) {
  const boardRef = useRef<RunningBoard>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const geometry = createPlinkoGeometry(rows)
    const engine = Engine.create({ gravity: { x: 0, y: 1.15 } })
    const render = Render.create({
      canvas,
      engine,
      options: {
        width: BOARD_WIDTH,
        height: BOARD_HEIGHT,
        background: '#0f192a',
        wireframes: false,
        pixelRatio: Math.min(window.devicePixelRatio, 2),
      },
    })
    const runner = Runner.create()
    const boardBodies = geometry.pegs.map((peg) =>
      Bodies.circle(peg.x, peg.y, geometry.pegRadius, {
        isStatic: true,
        render: { fillStyle: '#f8fafc' },
        collisionFilter: { category: BOARD_CATEGORY, mask: BALL_CATEGORY },
      }),
    )

    const wallLength = Math.hypot(330, geometry.bottomY - geometry.topY + 90)
    const wallAngle = Math.atan2(geometry.bottomY - geometry.topY + 90, 330)
    boardBodies.push(
      Bodies.rectangle(205, 285, wallLength, 18, {
        isStatic: true,
        angle: wallAngle,
        render: { visible: false },
        collisionFilter: { category: BOARD_CATEGORY, mask: BALL_CATEGORY },
      }),
      Bodies.rectangle(555, 285, wallLength, 18, {
        isStatic: true,
        angle: -wallAngle,
        render: { visible: false },
        collisionFilter: { category: BOARD_CATEGORY, mask: BALL_CATEGORY },
      }),
    )

    Composite.add(engine.world, boardBodies)

    const handleAfterUpdate = () => {
      for (const body of Composite.allBodies(engine.world)) {
        if (!body.label.startsWith(BALL_LABEL_PREFIX) || body.position.y < geometry.bottomY + 22) continue

        const firstCenter = geometry.binCenters[0]
        const observedBin = Math.max(
          0,
          Math.min(rows, Math.round((body.position.x - firstCenter) / geometry.horizontalGap)),
        )
        onLanding(body.label.slice(BALL_LABEL_PREFIX.length), observedBin)
        Composite.remove(engine.world, body)
      }
    }

    Events.on(engine, 'afterUpdate', handleAfterUpdate)
    Render.run(render)
    Runner.run(runner, engine)
    boardRef.current = { engine, geometry }

    return () => {
      boardRef.current = null
      Events.off(engine, 'afterUpdate', handleAfterUpdate)
      Runner.stop(runner)
      Render.stop(render)
      Composite.clear(engine.world, false)
      Engine.clear(engine)
      canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    }
  }, [canvasRef, onLanding, rows])

  return useCallback((roundId: string) => {
    const board = boardRef.current
    if (!board || !roundId) return false

    const ball = Bodies.circle(
      BOARD_WIDTH / 2 + (Math.random() - 0.5) * 8,
      28,
      board.geometry.pegRadius * 2.05,
      {
        label: `${BALL_LABEL_PREFIX}${roundId}`,
        restitution: 0.58,
        friction: 0.02,
        frictionAir: 0.008,
        render: { fillStyle: '#ff163f' },
        collisionFilter: { category: BALL_CATEGORY, mask: BOARD_CATEGORY },
      },
    )
    Body.setVelocity(ball, { x: (Math.random() - 0.5) * 0.8, y: 0 })
    Composite.add(board.engine.world, ball)
    return true
  }, [])
}
