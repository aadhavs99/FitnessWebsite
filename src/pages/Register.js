import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function App() {
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const exercise = ['Shoulders']
  const reps = [4]
  const logged = false

  async function registerUser(event) {
    event.preventDefault()
    const response = await fetch('http://localhost:1337/api/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        username,
        email,
        password,
        exercise,
        reps,
        logged,
      }),
    })
    const data = await response.json()
    if (data.status === 'ok') {
      alert('Registration successfull!')
      navigate("/login", { replace: true })
    } else if (data.status === 'error') {
      if (data.error === 'Duplicate Email'){
        alert('This email is already registered, please use a different email!')
      }
    }
  }

  return (
   <div>
      <h1>Register</h1>
      <form onSubmit={registerUser}>
        <input value={username}
        onChange={(e) => setUsername(e.target.value)}
        type="text" 
        placeholder="Username"
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
        type="Password" 
        placeholder="Password"
        />
        <br />
        <input type="submit" value="Register" />
      </form>
   </div>
  )
}

export default App;
