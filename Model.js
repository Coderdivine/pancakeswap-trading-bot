const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bots = new Schema({
    amountOut:String,
    _string:String,
    last:String,
    last_point:String,
    rate:String,
    period:{
        type:Date
    },
    count:String,
    date:{
        type:Date,
        default:Date.now()
    }
})
const botss = mongoose.model("bots",bots);
module.exports = {
    botss
}
