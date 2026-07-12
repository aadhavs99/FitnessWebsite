import React, { useMemo, useState } from "react"

// One metric (reps) split into an observed segment and a modeled segment,
// so identity is carried by a single hue; solid vs. dashed carries
// "actual" vs. "projected" instead of a second color.
const COLOR_LINE = '#2a78d6'
const COLOR_GRID = '#e1e0d9'
const COLOR_AXIS = '#c3c2b7'
const COLOR_MUTED = '#898781'
const COLOR_SECONDARY = '#52514e'
const COLOR_PRIMARY = '#0b0b0b'
const COLOR_SURFACE = '#fcfcfb'

const VIEW_W = 800
const VIEW_H = 360
const PAD = { top: 24, right: 24, bottom: 44, left: 56 }
const PLOT_W = VIEW_W - PAD.left - PAD.right
const PLOT_H = VIEW_H - PAD.top - PAD.bottom

function formatDate(d) {
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

// Rounds a domain max up to a clean step (1/2/5/10 x a power of ten).
function niceMax(value) {
    if (value <= 0) return 5
    const magnitude = Math.pow(10, Math.floor(Math.log10(value)))
    const normalized = value / magnitude
    let step
    if (normalized <= 1) step = 1
    else if (normalized <= 2) step = 2
    else if (normalized <= 5) step = 5
    else step = 10
    return step * magnitude
}

// actual/predicted: [{ x: Date, y: number }], both ascending by x.
// predicted[0] is expected to equal the last actual point (a connector,
// not a second observation) so the dashed segment starts exactly where
// the solid segment ends.
export default function PredictionChart({ actual, predicted }) {
    const [hover, setHover] = useState(null)

    const { scaleX, scaleY, xTicks, yTicks, todayX } = useMemo(() => {
        const allPoints = [...actual, ...predicted]
        const xMinV = Math.min(...allPoints.map(p => p.x.getTime()))
        const xMaxV = Math.max(...allPoints.map(p => p.x.getTime()))
        const yMaxRaw = Math.max(...allPoints.map(p => p.y), 1)
        const yMaxV = niceMax(yMaxRaw * 1.15)

        const sx = (date) => {
            if (xMaxV === xMinV) return PAD.left + PLOT_W / 2
            return PAD.left + ((date.getTime() - xMinV) / (xMaxV - xMinV)) * PLOT_W
        }
        const sy = (value) => PAD.top + PLOT_H - (value / yMaxV) * PLOT_H

        const yTickCount = 4
        const yTicksV = Array.from({ length: yTickCount + 1 }, (_, i) => Math.round((yMaxV / yTickCount) * i))

        const xTickCount = Math.min(5, allPoints.length)
        const xTicksV = Array.from({ length: xTickCount }, (_, i) => {
            const t = xMinV + ((xMaxV - xMinV) * i) / Math.max(1, xTickCount - 1)
            return new Date(t)
        })

        const todayXV = actual.length ? sx(actual[actual.length - 1].x) : null

        return { scaleX: sx, scaleY: sy, xTicks: xTicksV, yTicks: yTicksV, todayX: todayXV }
    }, [actual, predicted])

    const actualPoints = actual.map(p => `${scaleX(p.x)},${scaleY(p.y)}`).join(' ')
    const predictedPoints = predicted.map(p => `${scaleX(p.x)},${scaleY(p.y)}`).join(' ')

    // Combined hover targets, minus the duplicate connector point.
    const hoverTargets = useMemo(() => {
        const a = actual.map(p => ({ ...p, kind: 'Actual' }))
        const p = predicted.slice(1).map(p => ({ ...p, kind: 'Projected' }))
        return [...a, ...p]
    }, [actual, predicted])

    function handleMove(evt) {
        const rect = evt.currentTarget.getBoundingClientRect()
        const relX = ((evt.clientX - rect.left) / rect.width) * VIEW_W
        let nearest = hoverTargets[0]
        let bestDist = Infinity
        for (const pt of hoverTargets) {
            const dist = Math.abs(scaleX(pt.x) - relX)
            if (dist < bestDist) {
                bestDist = dist
                nearest = pt
            }
        }
        setHover(nearest)
    }

    const lastActual = actual[actual.length - 1]
    const lastPredicted = predicted.length > 1 ? predicted[predicted.length - 1] : null
    const hoverLeftPct = hover ? (scaleX(hover.x) / VIEW_W) * 100 : 0

    return (
        <div style={{ position: 'relative', width: '100%' }}>
            <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginBottom: 8, fontSize: '1rem', color: COLOR_SECONDARY }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke={COLOR_LINE} strokeWidth="2" /></svg>
                    Actual
                </span>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                    <svg width="20" height="8"><line x1="0" y1="4" x2="20" y2="4" stroke={COLOR_LINE} strokeWidth="2" strokeDasharray="6 4" /></svg>
                    Predicted
                </span>
            </div>

            <svg
                viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
                preserveAspectRatio="none"
                style={{ width: '100%', height: 360, display: 'block' }}
                onMouseMove={handleMove}
                onMouseLeave={() => setHover(null)}
            >
                {yTicks.map((t, i) => (
                    <g key={i}>
                        <line x1={PAD.left} x2={VIEW_W - PAD.right} y1={scaleY(t)} y2={scaleY(t)} stroke={COLOR_GRID} strokeWidth="1" />
                        <text x={PAD.left - 10} y={scaleY(t)} textAnchor="end" dominantBaseline="middle" fontSize="13" fill={COLOR_MUTED}>{t}</text>
                    </g>
                ))}

                <line x1={PAD.left} x2={VIEW_W - PAD.right} y1={PAD.top + PLOT_H} y2={PAD.top + PLOT_H} stroke={COLOR_AXIS} strokeWidth="1" />
                {xTicks.map((t, i) => (
                    <text key={i} x={scaleX(t)} y={VIEW_H - PAD.bottom + 22} textAnchor="middle" fontSize="13" fill={COLOR_MUTED}>{formatDate(t)}</text>
                ))}

                {todayX !== null && predicted.length > 1 && (
                    <g>
                        <line x1={todayX} x2={todayX} y1={PAD.top} y2={PAD.top + PLOT_H} stroke={COLOR_AXIS} strokeWidth="1" />
                        <text x={todayX} y={PAD.top - 8} textAnchor="middle" fontSize="12" fill={COLOR_MUTED}>Today</text>
                    </g>
                )}

                {actual.length > 1 && (
                    <polyline points={actualPoints} fill="none" stroke={COLOR_LINE} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                )}
                {predicted.length > 1 && (
                    <polyline points={predictedPoints} fill="none" stroke={COLOR_LINE} strokeWidth="2" strokeDasharray="6 4" strokeLinejoin="round" strokeLinecap="round" />
                )}

                {lastActual && (
                    <circle cx={scaleX(lastActual.x)} cy={scaleY(lastActual.y)} r="5" fill={COLOR_LINE} stroke={COLOR_SURFACE} strokeWidth="2" />
                )}
                {lastPredicted && (
                    <circle cx={scaleX(lastPredicted.x)} cy={scaleY(lastPredicted.y)} r="5" fill={COLOR_LINE} stroke={COLOR_SURFACE} strokeWidth="2" />
                )}
                {lastActual && (
                    <text x={scaleX(lastActual.x) + 8} y={scaleY(lastActual.y) - 10} fontSize="13" fill={COLOR_PRIMARY}>{Math.round(lastActual.y)}</text>
                )}
                {lastPredicted && (
                    <text x={scaleX(lastPredicted.x) + 8} y={scaleY(lastPredicted.y) - 10} fontSize="13" fill={COLOR_PRIMARY}>{Math.round(lastPredicted.y)}</text>
                )}

                {hover && (
                    <g>
                        <line x1={scaleX(hover.x)} x2={scaleX(hover.x)} y1={PAD.top} y2={PAD.top + PLOT_H} stroke="rgba(11,11,11,0.25)" strokeWidth="1" />
                        <circle cx={scaleX(hover.x)} cy={scaleY(hover.y)} r="6" fill={COLOR_LINE} stroke={COLOR_SURFACE} strokeWidth="2" />
                    </g>
                )}
            </svg>

            {hover && (
                <div style={{
                    position: 'absolute',
                    left: `${hoverLeftPct}%`,
                    top: `${(scaleY(hover.y) / VIEW_H) * 100}%`,
                    transform: hoverLeftPct > 70 ? 'translate(-110%, -50%)' : 'translate(12px, -50%)',
                    background: COLOR_PRIMARY,
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: 6,
                    fontSize: '0.95rem',
                    pointerEvents: 'none',
                    whiteSpace: 'nowrap',
                }}>
                    <div style={{ fontWeight: 600 }}>{Math.round(hover.y * 10) / 10} reps</div>
                    <div style={{ color: '#c3c2b7', fontSize: '0.8rem' }}>{formatDate(hover.x)} &middot; {hover.kind}</div>
                </div>
            )}
        </div>
    )
}
