const mongoose = require('mongoose')

const User = new mongoose.Schema(
    {
    username: { type: String, required: true},
    email: { type: String, required: true},
    password: { type: String, required: true},
    logs: [{
        exercise: { type: String, required: true },
        reps: { type: Number, required: true },
        date: { type: Date, default: Date.now },
    }],
    logged: {type: Boolean, required: true},
    },
    { collection: 'user-data'}
)

const model = mongoose.model('UserData', User)

module.exports = model