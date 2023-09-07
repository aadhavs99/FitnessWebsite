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
            console.log("USER FOUND!")
            console.log("Found email =", user.email)
            return res.json({status: 'error', error: 'Duplicate Email'})
        }
    } catch (error) {
        try {
            console.log("TRYING TO CREATE!")
            await User.create({
                username: req.body.username,
                email: req.body.email,
                password: req.body.password,
                exercise: req.body.exercise,
                reps: req.body.reps,
                logged: req.body.logged,
            })
            console.log("REGISTRATION SUCCESSFULL")
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
        console.log(user.logged)
        const filter = {email: req.body.email, password: req.body.password}
        const update = {logged: true}
        diffUser = await User.findOneAndUpdate(filter, update, {
            new: true
        })
        console.log(diffUser.logged)
        if (user) {
            const token = jwt.sign({
                name: user.name,
                email: user.email,
            }, 'secret123')
            return res.json({ status: 'ok', user: token, user})
        } else {
            return res.json({ status: 'error', user: false})
        }
})

app.post('/api/exercise', async (req, res) => {
    console.log(req.body.email)
    console.log(req.body.password)
    count = await User.collection.countDocuments()
    if (count < 3){
        admin = await Serv.findOne({
            serv: true,
        })
        admin.updateOne({
            $set: {
                [`leaderboard.${user.username}.${req.body.exercise}`]: req.body.reps,
            }
        })
    }
    const user = await User.findOne({
        email: req.body.email,
        password: req.body.password,
        logged: true,
    })
    console.log(user)
    try {
        console.log(user.email)
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
    console.log("tempMap =", tempMap)
    res.json(tempMap)
})

app.listen(1337, () => {
    console.log('Server started on 1337')
})