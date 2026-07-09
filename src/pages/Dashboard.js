import React, { render, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

function App() {
    const navigate = useNavigate()
    const [exercise, setExercise] = useState([])
    const [reps, setReps] = useState([])
    var firstpos = ""

    // No session token means the user was never logged in on this device;
    // send them to /login instead of showing a dashboard that can't work.
    useEffect(() => {
        if (!localStorage.getItem('token')) {
            navigate('/login', { replace: true })
        }
    }, [navigate])

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
            window.location.href = '/dashboard'
        } else {
          alert(data.error)
        }
        console.log(data)
    }
    async function getFirstData() {
        const response = await fetch('http://localhost:1337/api/leaderboard', {
            method: 'POST',
        })
        var givenMap = await response.json()
        for (let x in response) {
          console.log("x =", x)
          firstpos += x
          console.log("new1 firstpos =", firstpos)
          for (let y in x){
            firstpos += y
            console.log("new2 firstpos =", firstpos)
          }
        }
        console.log("firstpos =", firstpos)
        return 0
    }
    function getSecondData(){
      return 0
    }
    getFirstData()
    return (
        <div>
           <h1>Log</h1>
           <form onSubmit={logExercise}>
             <input value={exercise}
             onChange={(e) => setExercise(e.target.value)}
             type="exercise" 
             placeholder="Exercise"
             />
             <br />
             <input value={reps}
             onChange={(e) => setReps(e.target.value)}
             type="reps"
             placeholder="Reps"
             />
             <br />
             <input type="submit" value="Log" />
           </form>
           <h1>LEADERBOARD:</h1>
           <h1>1. {firstpos}</h1>
        </div>
       )
}
export default App;
