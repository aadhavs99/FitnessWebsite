const express = require('express')
const app = express()
const cors = require('cors')
const User = require('./models/user.model')
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
    const user = await User.findOne({
        email: req.body.email,
    })
    if (user) {
        return res.json({status: 'error', error: 'Duplicate Email'})
    }
    try {
        await User.create({
            username: req.body.username,
            email: req.body.email,
            password: req.body.password,
            logs: [],
            logged: false,
        })
        return res.json({ status: 'ok'})
    } catch (err) {
        return res.json({ status: 'error', error: 'Could not register'})
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
        await user.updateOne({
            $push: {
                logs: {
                    exercise: req.body.exercise,
                    reps: Number(req.body.reps),
                    date: new Date(),
                }
            }
        })
        res.json({status: 'ok'})
    } catch (err) {
        res.json({ status: 'error', error: err})
    }
})

// Leaderboards are computed on read (not maintained incrementally), so they
// stay correct as history grows instead of drifting from a hand-updated map.
app.post('/api/leaderboard', async (req, res) => {
    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

    const lifetime = await User.aggregate([
        { $unwind: '$logs' },
        { $group: {
            _id: { username: '$username', exercise: '$logs.exercise' },
            reps: { $sum: '$logs.reps' },
        }},
        { $project: { _id: 0, username: '$_id.username', exercise: '$_id.exercise', reps: 1 } },
        { $sort: { reps: -1 } },
    ])

    // Reps logged within the trailing year, averaged over 365 days.
    const dailyAverage = await User.aggregate([
        { $unwind: '$logs' },
        { $match: { 'logs.date': { $gte: oneYearAgo } } },
        { $group: {
            _id: { username: '$username', exercise: '$logs.exercise' },
            reps: { $sum: '$logs.reps' },
        }},
        { $project: { _id: 0, username: '$_id.username', exercise: '$_id.exercise', reps: { $divide: ['$reps', 365] } } },
        { $sort: { reps: -1 } },
    ])

    res.json({ status: 'ok', lifetime, dailyAverage })
})

app.listen(1337, () => {
    console.log('Server started on 1337')
})
