const mongoose = require('mongoose')

const Serv = new mongoose.Schema(
    {
    leaderboard: { type: Map, required: true},
    serv: {type: Boolean, required: true},
    },
    { collection: 'server-data'}
)

const model = mongoose.model('ServerData', Serv)

module.exports = model