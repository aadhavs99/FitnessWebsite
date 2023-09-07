import React, { render, useState } from "react";



function App() {
    const [exercise, setExercise] = useState([])
    const [reps, setReps] = useState([])
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    var firstpos = ""
    async function logExercise(event) {
        event.preventDefault()
        const response = await fetch('http://localhost:1337/api/exercise', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            exercise,
            reps,
            email,
            password,
          }),
        })
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
        console.log("WAITING")
        const response = await fetch('http://localhost:1337/api/leaderboard', {
            method: 'POST',
        })
        var givenMap = await response.json()
        console.log("RECIEVED")
        console.log("response =", response)
        console.log("type =", (typeof response))
        console.log("givenMap =", givenMap)
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
      //console.log("Entered")
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
             <input value={email}
             onChange={(e) => setEmail(e.target.value)}
             type="email" 
             placeholder="Email"
             />
             <br />
             <input value={password}
             onChange={(e) => setPassword(e.target.value)}
             type="password" 
             placeholder="Password"
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