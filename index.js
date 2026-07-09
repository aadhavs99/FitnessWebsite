const express = require('express')
const app = express()
const cors = require('cors')
const User = require('./models/user.model')
const Serv = require('./models/server.data')
app.use(cors())
app.use(express.json())
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')

mongoose.connect('mongodb+srv://aadhavs99:Subpoofiyaaxd!1@fitnesswebsite.mxmeiyp.mongodb.net/?retryWrites=true&w=majority')

// Secret used to sign/verify session tokens (JWT).
const JWT_SECRET = 'secret123'

// Verifies the "Authorization: Bearer <token>" header on protected routes.
// This lets the client stay logged in for the token's lifetime (24h) without
// resending the email/password on every request.
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization']
    const token = authHeader && authHeader.split(' ')[1]
    if (!token) {
        return res.status(401).json({ status: 'error', error: 'Missing session token' })
    }
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            // Covers both an invalid token and an expired one (>24h old).
            return res.status(403).json({ status: 'error', error: 'Session expired, please log in again' })
        }
        req.user = decoded
        next()
    })
}

app.post('/api/register', async (req, res) => {
    count = await User.collection.countDocuments()
    if (count === 0) {
        await Serv.create({
            serv: true,
            leaderboard: {"Nobody": {"Nothing": 0}},
        })
    }
    const user = await User.findOne({
        email: req.body.email,
    })
    try{
        if(user.email === req.body.email) {
            return res.json({status: 'error', error: 'Duplicate Email'})
        }
    } catch (error) {
        try {
            await User.create({
                username: req.body.username,
                email: req.body.email,
                password: req.body.password,
                exercise: req.body.exercise,
                reps: req.body.reps,
                logged: req.body.logged,
            })
            return res.json({ status: 'ok'})
        } catch (err) {
            return res.json({ status: 'error', error: 'Could not register'})
        }
    }
})

app.post('/api/login', async (req, res) => {
        const user = await User.findOne({
            email: req.body.email,
            password: req.body.password,
        })
        if (!user) {
            return res.json({ status: 'error', user: false})
        }
        const filter = {email: req.body.email, password: req.body.password}
        const update = {logged: true}
        await User.findOneAndUpdate(filter, update, {
            new: true
        })
        // Sign a session token that expires in 24 hours, so the device stays
        // logged in and doesn't need to resend credentials until then.
        const token = jwt.sign({
            username: user.username,
            email: user.email,
        }, JWT_SECRET, { expiresIn: '24h' })
        // Return the token under its own `token` field. Previously this was
        // returned as `user: token, user` which put the token then
        // immediately overwrote it with the Mongo user document.
        return res.json({ status: 'ok', token, user})
})

// Authenticated by session token (see authenticateToken above) instead of
// email/password, so logging a rep no longer requires re-entering credentials.
app.post('/api/exercise', authenticateToken, async (req, res) => {
    // req.user comes from the verified token, not the request body.
    const user = await User.findOne({
        email: req.user.email,
    })
    try {
        count = await User.collection.countDocuments()
        if (count < 3){
            admin = await Serv.findOne({
                serv: true,
            })
            // Moved below the `user` lookup above: this referenced `user`
            // before it was defined in the original code.
            await admin.updateOne({
                $set: {
                    [`leaderboard.${user.username}.${req.body.exercise}`]: req.body.reps,
                }
            })
        }
        await user.updateOne({
            $push: {
                ['exercise']: req.body.exercise,
                ['reps']: Number(req.body.reps)
            }
        })
        res.json({status: 'ok'})
    } catch (err) {
        res.json({ status: 'error', error: err})
    }
})

app.post('/api/leaderboard', async (req, res) => {
    const admin = await Serv.findOne({
        serv: true
    })
    tempMap = admin.leaderboard.entries()
    res.json(tempMap)
})

app.listen(1337, () => {
    console.log('Server started on 1337')
})
