import { Bodies, Body, Composite, Engine, Events, type IEventCollision, type Body as MatterBody } from 'matter-js'
import type { RowCount } from './plinkoConfig'
import { BOARD_HEIGHT, BOARD_WIDTH, createPlinkoGeometry } from './plinkoGeometry'
import { getTargetBin, type PlinkoDirection } from './plinkoPath'

const BALL_CATEGORY = 0x0002
const BOARD_CATEGORY = 0x0004
const SENSOR_CATEGORY = 0x0008
const BALL_LABEL_PREFIX = 'plinko-ball:'
const SENSOR_LABEL_PREFIX = 'plinko-sensor:'
const MAX_DROP_MILLISECONDS = 12_000

type ActiveBall = {
  body: MatterBody
  path: readonly PlinkoDirection[]
  targetBin: number
  startedAt: number
  maxY: number
  nextRow: number
  stalledMilliseconds: number
}

export type DropBallInput = {
  roundId: string
  targetBin: number
  path: readonly PlinkoDirection[]
}

export type Landing = {
  isConfirmed: boolean
  roundId: string
  requestedBin: number
  observedBin: number
  position: Readonly<{ x: number; y: number }>
}

export function createPlinkoPhysics(rows: RowCount, onLanding: (landing: Landing) => void) {
  const geometry = createPlinkoGeometry(rows)
  const engine = Engine.create({ gravity: { x: 0, y: 1.15 } })
  const activeBalls = new Map<number, ActiveBall>()

  const boardBodies = geometry.pegs.map((peg) => Bodies.circle(peg.x, peg.y, geometry.pegRadius, {
    isStatic: true,
    render: { fillStyle: '#f8fafc' },
    collisionFilter: { category: BOARD_CATEGORY, mask: BALL_CATEGORY },
  }))
  const wallTopY = geometry.topY - 24
  const wallBottomY = BOARD_HEIGHT - 18
  const wallTopInset = geometry.rows[0][0].x - 24
  const wallBottomInset = 20
  const wallHeight = wallBottomY - wallTopY
  const wallWidth = wallTopInset - wallBottomInset
  const wallLength = Math.hypot(wallWidth, wallHeight)
  const wallAngle = Math.atan2(wallHeight, wallWidth)
  boardBodies.push(
    Bodies.rectangle((wallTopInset + wallBottomInset) / 2, (wallTopY + wallBottomY) / 2, wallLength, 18, {
      isStatic: true,
      angle: -wallAngle,
      render: { visible: false },
      collisionFilter: { category: BOARD_CATEGORY, mask: BALL_CATEGORY },
    }),
    Bodies.rectangle(BOARD_WIDTH - (wallTopInset + wallBottomInset) / 2, (wallTopY + wallBottomY) / 2, wallLength, 18, {
      isStatic: true,
      angle: wallAngle,
      render: { visible: false },
      collisionFilter: { category: BOARD_CATEGORY, mask: BALL_CATEGORY },
    }),
  )

  const sensorTop = BOARD_HEIGHT - 15
  const sensorBottom = BOARD_HEIGHT + 80
  const sensors = geometry.binCenters.map((center, bin) => Bodies.rectangle(
    center,
    (sensorTop + sensorBottom) / 2,
    geometry.horizontalGap * 0.5,
    sensorBottom - sensorTop,
    {
      isStatic: true,
      isSensor: true,
      label: `${SENSOR_LABEL_PREFIX}${bin}`,
      render: { visible: false },
      collisionFilter: { category: SENSOR_CATEGORY, mask: BALL_CATEGORY },
    },
  ))
  Composite.add(engine.world, [...boardBodies, ...sensors])

  function removeBall(activeBall: ActiveBall) {
    activeBalls.delete(activeBall.body.id)
    Composite.remove(engine.world, activeBall.body)
  }

  function getObservedBin(body: MatterBody) {
    return Math.max(0, Math.min(rows, Math.round((body.position.x - geometry.binCenters[0]) / geometry.horizontalGap)))
  }

  function finishBall(activeBall: ActiveBall, observedBin: number, isConfirmed: boolean) {
    removeBall(activeBall)
    onLanding({
      isConfirmed,
      roundId: activeBall.body.label.slice(BALL_LABEL_PREFIX.length),
      requestedBin: activeBall.targetBin,
      observedBin,
      position: { x: activeBall.body.position.x, y: activeBall.body.position.y },
    })
  }

  function handleCollision(event: IEventCollision<Engine>) {
    for (const pair of event.pairs) {
      const ballBody = pair.bodyA.label.startsWith(BALL_LABEL_PREFIX) ? pair.bodyA : pair.bodyB
      const sensorBody = pair.bodyA.label.startsWith(SENSOR_LABEL_PREFIX) ? pair.bodyA : pair.bodyB
      const activeBall = activeBalls.get(ballBody.id)
      if (!activeBall || !sensorBody.label.startsWith(SENSOR_LABEL_PREFIX)) continue

      const observedBin = Number(sensorBody.label.slice(SENSOR_LABEL_PREFIX.length))
      if (observedBin !== activeBall.targetBin) continue
      finishBall(activeBall, observedBin, true)
    }
  }

  function guideBalls() {
    const delta = engine.timing.lastDelta
    const verticalGap = geometry.rows[1][0].y - geometry.rows[0][0].y

    for (const activeBall of [...activeBalls.values()]) {
      const { body, path, targetBin } = activeBall

      while (
        activeBall.nextRow < rows &&
        body.position.y >= geometry.rows[activeBall.nextRow][0].y - geometry.pegRadius * 3.2
      ) {
        const direction = path[activeBall.nextRow] === 'right' ? 1 : -1
        const speed = Math.max(0.65, Math.min(Math.abs(body.velocity.x), 2.4))
        Body.setVelocity(body, { x: direction * speed, y: body.velocity.y })
        activeBall.nextRow += 1
      }

      const rowProgress = Math.max(0, Math.min(rows, (body.position.y - geometry.topY) / verticalGap + 0.75))
      const completedRows = Math.floor(rowProgress)
      const partialRow = rowProgress - completedRows
      let rightSteps = 0
      for (let index = 0; index < completedRows; index += 1) rightSteps += Number(path[index] === 'right')
      const direction = path[Math.min(completedRows, rows - 1)] === 'right' ? 1 : -1
      const routeX = BOARD_WIDTH / 2 + (rightSteps - completedRows / 2 + direction * partialRow / 2) * geometry.horizontalGap
      const targetX = geometry.binCenters[targetBin]
      const isBelowPegs = body.position.y > geometry.bottomY + 1
      const nearestRowDistance = Math.min(...geometry.rows.map((row) => Math.abs(body.position.y - row[0].y)))
      const routeError = routeX - body.position.x

      if (isBelowPegs) {
        const velocityX = Math.max(-10, Math.min(10, (targetX - body.position.x) * 0.35))
        Body.setVelocity(body, { x: velocityX, y: body.velocity.y })
      } else if (nearestRowDistance > geometry.pegRadius * 2.8 && Math.abs(routeError) > geometry.horizontalGap * 0.04) {
        const velocityX = Math.max(-4, Math.min(4, routeError * 0.12))
        Body.setVelocity(body, { x: velocityX, y: body.velocity.y })
      }

      if (body.position.y > activeBall.maxY + geometry.pegRadius) {
        activeBall.maxY = body.position.y
        activeBall.stalledMilliseconds = 0
      } else {
        activeBall.stalledMilliseconds += delta
      }
      if (activeBall.stalledMilliseconds > 350) {
        const escapeDirection = isBelowPegs ? Math.sign(targetX - body.position.x) || direction : direction
        Body.setVelocity(body, { x: escapeDirection * 1.8, y: Math.max(body.velocity.y, 1.2) })
        activeBall.stalledMilliseconds = 0
      }

      if (body.position.y >= sensorTop) {
        const observedBin = getObservedBin(body)
        if (observedBin === targetBin) {
          finishBall(activeBall, observedBin, true)
          continue
        }
      }
      if (engine.timing.timestamp - activeBall.startedAt > MAX_DROP_MILLISECONDS || body.position.y > BOARD_HEIGHT + 20) {
        finishBall(activeBall, getObservedBin(body), false)
      }
    }
  }

  Events.on(engine, 'beforeUpdate', guideBalls)
  Events.on(engine, 'collisionStart', handleCollision)

  return {
    engine,
    geometry,
    dropBall({ roundId, targetBin, path }: DropBallInput) {
      if (!roundId || !Number.isInteger(targetBin) || targetBin < 0 || targetBin > rows || path.length !== rows || getTargetBin(path) !== targetBin) {
        return false
      }

      const firstDirection = path[0] === 'right' ? 1 : -1
      const body = Bodies.circle(BOARD_WIDTH / 2 + firstDirection * 0.75, 28, geometry.pegRadius * 2.05, {
        label: `${BALL_LABEL_PREFIX}${roundId}`,
        restitution: 0.58,
        friction: 0.02,
        frictionStatic: 0,
        frictionAir: 0.008,
        render: { fillStyle: '#ff163f' },
        collisionFilter: { category: BALL_CATEGORY, mask: BOARD_CATEGORY | SENSOR_CATEGORY },
      })
      Body.setVelocity(body, { x: firstDirection * 0.35, y: 0 })
      activeBalls.set(body.id, {
        body,
        path: [...path],
        targetBin,
        startedAt: engine.timing.timestamp,
        maxY: body.position.y,
        nextRow: 0,
        stalledMilliseconds: 0,
      })
      Composite.add(engine.world, body)
      return true
    },
    destroy() {
      Events.off(engine, 'beforeUpdate', guideBalls)
      Events.off(engine, 'collisionStart', handleCollision)
      for (const activeBall of [...activeBalls.values()]) {
        finishBall(activeBall, getObservedBin(activeBall.body), false)
      }
      Composite.clear(engine.world, false)
      Engine.clear(engine)
    },
  }
}
