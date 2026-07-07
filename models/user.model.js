const mongoose = require('mongoose')

const User = new mongoose.Schema(
    {
    username: { type: String, required: true},
    email: { type: String, required: true},
    password: { type: String, required: true},
    exercise: {type: Array, required: true},
    reps: {type: Array, required: true},
    logged: {type: Boolean, required: true},
    },
    { collection: 'user-data'}
)

const model = mongoose.model('UserData', User)

module.exports = model