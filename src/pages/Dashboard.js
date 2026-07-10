import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

const tableStyle = { width: '100%', tableLayout: 'fixed', borderCollapse: 'collapse', fontSize: '1.5rem' }
const headerCellStyle = { textAlign: 'left', padding: '16px 32px', borderBottom: '2px solid #333' }
const cellStyle = { padding: '16px 32px', borderBottom: '1px solid #ccc' }

function App() {
    const navigate = useNavigate()
    const [exercise, setExercise] = useState('')
    const [reps, setReps] = useState('')
    const [lifetime, setLifetime] = useState([])
    const [dailyAverage, setDailyAverage] = useState([])

    // No session token means the user was never logged in on this device;
    // send them to /login instead of showing a dashboard that can't work.
    useEffect(() => {
        if (!localStorage.getItem('token')) {
            navigate('/login', { replace: true })
        }
    }, [navigate])

    useEffect(() => {
        fetchLeaderboards()
    }, [])

    async function fetchLeaderboards() {
        const response = await fetch('http://localhost:1337/api/leaderboard', {
            method: 'POST',
        })
        const data = await response.json()
        setLifetime(data.lifetime || [])
        setDailyAverage(data.dailyAverage || [])
    }

    async function logExercise(event) {
        event.preventDefault()
        const token = localStorage.getItem('token')
        const response = await fetch('http://localhost:1337/api/exercise', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Session token replaces email/password on this request.
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            exercise,
            reps,
          }),
        })
        if (response.status === 401 || response.status === 403) {
            // Token missing or expired (>24h old) - clear it and re-prompt login.
            localStorage.removeItem('token')
            alert('Your session has expired, please log in again')
            navigate('/login', { replace: true })
            return
        }
        const data = await response.json()
        if (data.status === 'ok') {
            alert('Reps successfully logged')
            setExercise('')
            setReps('')
            fetchLeaderboards()
        } else {
          alert(data.error)
        }
    }

    return (
        <div>
           <h1>Log</h1>
           <form onSubmit={logExercise}>
             <input value={exercise}
             onChange={(e) => setExercise(e.target.value)}
             type="text"
             placeholder="Exercise"
             />
             <br />
             <input value={reps}
             onChange={(e) => setReps(e.target.value)}
             type="number"
             placeholder="Reps"
             />
             <br />
             <input type="submit" value="Log" />
           </form>

           <h1>LEADERBOARD - LIFETIME TOTAL</h1>
           <table style={tableStyle}>
             <thead>
               <tr>
                 <th style={headerCellStyle}>Name</th>
                 <th style={headerCellStyle}>Exercise</th>
                 <th style={headerCellStyle}>Reps</th>
               </tr>
             </thead>
             <tbody>
               {lifetime.map((row, i) => (
                 <tr key={i}>
                   <td style={cellStyle}>{row.username}</td>
                   <td style={cellStyle}>{row.exercise}</td>
                   <td style={cellStyle}>{row.reps}</td>
                 </tr>
               ))}
             </tbody>
           </table>

           <h1>LEADERBOARD - DAILY AVERAGE (PAST YEAR)</h1>
           <table style={tableStyle}>
             <thead>
               <tr>
                 <th style={headerCellStyle}>Name</th>
                 <th style={headerCellStyle}>Exercise</th>
                 <th style={headerCellStyle}>Reps/Day</th>
               </tr>
             </thead>
             <tbody>
               {dailyAverage.map((row, i) => (
                 <tr key={i}>
                   <td style={cellStyle}>{row.username}</td>
                   <td style={cellStyle}>{row.exercise}</td>
                   <td style={cellStyle}>{row.reps.toFixed(2)}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
       )
}
export default App;
