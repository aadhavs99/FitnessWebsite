import React, { useState, useEffect, useMemo } from "react"
import { Link, useNavigate } from "react-router-dom"
import PredictionChart from "../components/PredictionChart"
import { tableStyle, headerCellStyle, cellStyle } from "../styles"

const FUTURE_WEEKS = 12 // project ~3 months ahead, one point per week
const DAY_MS = 24 * 60 * 60 * 1000

// Rough single-session ceilings for a dedicated, non-elite trainee - loose
// enough to allow real progression, tight enough to keep the projection
// physically plausible instead of climbing forever.
const REALISTIC_MAX_REPS = {
    'Push-ups': 100,
    'Pull-ups': 40,
    'Chin-ups': 40,
    'Dips': 60,
    'Squats': 150,
    'Lunges': 150,
    'Sit-ups': 150,
    'Crunches': 150,
    'Plank': 100,
    'Burpees': 80,
    'Mountain Climbers': 200,
    'Jumping Jacks': 300,
}
const DEFAULT_MAX_REPS = 150

// Lets the near-term projection follow the fitted trend almost linearly,
// then bends it to approach the realistic ceiling asymptotically instead of
// crossing it - diminishing returns rather than an abrupt flat line.
function applyRealisticCap(lastReps, rawIncrease, cap) {
    if (rawIncrease <= 0) {
        return Math.max(0, lastReps + rawIncrease)
    }
    const headroom = cap - lastReps
    if (headroom <= 0) {
        // Already at/above the realistic ceiling - hold flat.
        return lastReps
    }
    const cappedIncrease = headroom * (1 - Math.exp(-rawIncrease / headroom))
    return lastReps + cappedIncrease
}

// Ordinary least squares on {x, y} points.
function linearRegression(points) {
    const n = points.length
    const sumX = points.reduce((s, p) => s + p.x, 0)
    const sumY = points.reduce((s, p) => s + p.y, 0)
    const sumXY = points.reduce((s, p) => s + p.x * p.y, 0)
    const sumXX = points.reduce((s, p) => s + p.x * p.x, 0)
    const denom = n * sumXX - sumX * sumX
    if (denom === 0) {
        // Every session logged on the same day - no trend to fit.
        return { slope: 0, intercept: sumY / n }
    }
    const slope = (n * sumXY - sumX * sumY) / denom
    const intercept = (sumY - slope * sumX) / n
    return { slope, intercept }
}

// Collapses same-calendar-day entries into one point (their mean reps) so a
// burst of logs minutes apart counts as one session's worth of signal, not
// several — the trend reflects real day-to-day spacing between workouts.
function dailyAverages(entries) {
    const byDay = new Map()
    for (const e of entries) {
        const dayKey = e.date.toISOString().slice(0, 10)
        if (!byDay.has(dayKey)) {
            byDay.set(dayKey, { date: new Date(dayKey + 'T00:00:00.000Z'), sum: 0, count: 0 })
        }
        const bucket = byDay.get(dayKey)
        bucket.sum += e.reps
        bucket.count += 1
    }
    return [...byDay.values()]
        .map(b => ({ date: b.date, reps: b.sum / b.count }))
        .sort((a, b) => a.date - b.date)
}

function App() {
    const navigate = useNavigate()
    const [logs, setLogs] = useState([])
    const [selectedExercise, setSelectedExercise] = useState('')
    const [forecast, setForecast] = useState(null)
    const [error, setError] = useState('')

    useEffect(() => {
        if (!localStorage.getItem('token')) {
            navigate('/login', { replace: true })
        }
    }, [navigate])

    useEffect(() => {
        fetchMyData()
    }, [])

    async function fetchMyData() {
        const token = localStorage.getItem('token')
        const response = await fetch('http://localhost:1337/api/mydata', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        })
        if (response.status === 401 || response.status === 403) {
            localStorage.removeItem('token')
            navigate('/login', { replace: true })
            return
        }
        const data = await response.json()
        const fetchedLogs = data.logs || []
        setLogs(fetchedLogs)
        const exercises = [...new Set(fetchedLogs.map(l => l.exercise))]
        if (exercises.length) {
            setSelectedExercise(exercises[0])
        }
    }

    const summary = useMemo(() => {
        const byExercise = {}
        for (const log of logs) {
            if (!byExercise[log.exercise]) {
                byExercise[log.exercise] = { exercise: log.exercise, sessions: 0, totalReps: 0, lastDate: log.date, lastReps: log.reps }
            }
            const entry = byExercise[log.exercise]
            entry.sessions += 1
            entry.totalReps += log.reps
            if (new Date(log.date) >= new Date(entry.lastDate)) {
                entry.lastDate = log.date
                entry.lastReps = log.reps
            }
        }
        return Object.values(byExercise).sort((a, b) => b.totalReps - a.totalReps)
    }, [logs])

    const exercises = useMemo(() => [...new Set(logs.map(l => l.exercise))], [logs])

    function runPrediction() {
        setError('')
        setForecast(null)

        const entries = logs
            .filter(l => l.exercise === selectedExercise)
            .map(l => ({ date: new Date(l.date), reps: l.reps }))
            .sort((a, b) => a.date - b.date)

        const daily = dailyAverages(entries)

        if (daily.length < 3) {
            setError('Log this exercise on at least 3 different days to generate a prediction — with only 1-2 days there’s no way to tell a real trend from noise.')
            return
        }

        const originDate = daily[0].date
        const regressionPoints = daily.map(d => ({ x: (d.date - originDate) / DAY_MS, y: d.reps }))
        const model = linearRegression(regressionPoints)

        // Plot every raw log (not the daily averages) so session-level detail
        // stays visible; the trend itself is fit on the daily-aggregated points.
        const actual = entries.map(e => ({ x: e.date, y: e.reps }))
        const lastEntry = entries[entries.length - 1]
        const lastDayX = (lastEntry.date - originDate) / DAY_MS

        const cap = REALISTIC_MAX_REPS[selectedExercise] || DEFAULT_MAX_REPS

        // Anchor the projection to the actual last logged value (not the
        // regression intercept) so the dashed line starts exactly where the
        // solid one ends, then continues forward at the fitted daily rate,
        // bending toward the realistic ceiling as it gets close.
        const predicted = [{ x: lastEntry.date, y: lastEntry.reps }]
        for (let i = 1; i <= FUTURE_WEEKS; i++) {
            const futureDayX = lastDayX + i * 7
            const futureDate = new Date(originDate.getTime() + futureDayX * DAY_MS)
            const rawIncrease = model.slope * (futureDayX - lastDayX)
            const predictedY = applyRealisticCap(lastEntry.reps, rawIncrease, cap)
            predicted.push({ x: futureDate, y: predictedY })
        }

        setForecast({ actual, predicted, sessions: entries.length, days: daily.length, slopePerWeek: model.slope * 7, cap })
    }

    return (
        <div>
            <nav style={{ marginBottom: 24, fontSize: '1.1rem' }}>
                <Link to="/dashboard">Dashboard</Link>
                {' · '}
                <Link to="/predict">Predict</Link>
            </nav>

            <h1>Your Exercise History</h1>
            {summary.length === 0 ? (
                <p>You haven't logged any exercises yet. Log some on the Dashboard first.</p>
            ) : (
                <table style={tableStyle}>
                    <thead>
                        <tr>
                            <th style={headerCellStyle}>Exercise</th>
                            <th style={headerCellStyle}>Sessions</th>
                            <th style={headerCellStyle}>Total Reps</th>
                            <th style={headerCellStyle}>Last Logged</th>
                            <th style={headerCellStyle}>Last Reps</th>
                        </tr>
                    </thead>
                    <tbody>
                        {summary.map((row) => (
                            <tr key={row.exercise}>
                                <td style={cellStyle}>{row.exercise}</td>
                                <td style={cellStyle}>{row.sessions}</td>
                                <td style={cellStyle}>{row.totalReps}</td>
                                <td style={cellStyle}>{new Date(row.lastDate).toLocaleDateString()}</td>
                                <td style={cellStyle}>{row.lastReps}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {exercises.length > 0 && (
                <div style={{ marginTop: 32 }}>
                    <h1>Predict Future Performance</h1>
                    <select
                        value={selectedExercise}
                        onChange={(e) => { setSelectedExercise(e.target.value); setForecast(null); setError('') }}
                        style={{ fontSize: '1.2rem', padding: 8 }}
                    >
                        {exercises.map((name) => <option key={name} value={name}>{name}</option>)}
                    </select>
                    <button onClick={runPrediction} style={{ fontSize: '1.2rem', padding: '8px 20px', marginLeft: 16 }}>
                        Predict
                    </button>

                    {error && <p style={{ color: '#d03b3b' }}>{error}</p>}

                    {forecast && (
                        <div style={{ marginTop: 24 }}>
                            <p style={{ color: '#52514e', fontSize: '1.1rem' }}>
                                Based on {forecast.sessions} logged {forecast.sessions === 1 ? 'session' : 'sessions'} of {selectedExercise}{' '}
                                across {forecast.days} different {forecast.days === 1 ? 'day' : 'days'}, trending{' '}
                                {forecast.slopePerWeek >= 0 ? '+' : ''}{forecast.slopePerWeek.toFixed(1)} reps/week.
                                This is a simple linear trend from a small amount of data, not a guarantee
                                {forecast.days < 4 ? ' — log a few more days for a steadier estimate.' : '.'}{' '}
                                The projection is capped to approach a realistic ceiling of {forecast.cap} reps in a single session rather than climbing forever.
                            </p>

                            <PredictionChart actual={forecast.actual} predicted={forecast.predicted} />

                            <table style={{ ...tableStyle, marginTop: 24 }}>
                                <thead>
                                    <tr>
                                        <th style={headerCellStyle}>Date</th>
                                        <th style={headerCellStyle}>Reps</th>
                                        <th style={headerCellStyle}>Type</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[
                                        ...forecast.actual.map(p => ({ ...p, kind: 'Actual' })),
                                        ...forecast.predicted.slice(1).map(p => ({ ...p, kind: 'Predicted' })),
                                    ].map((p, i) => (
                                        <tr key={i}>
                                            <td style={cellStyle}>{p.x.toLocaleDateString()}</td>
                                            <td style={cellStyle}>{Math.round(p.y * 10) / 10}</td>
                                            <td style={cellStyle}>{p.kind}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
export default App
