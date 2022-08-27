const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bots = new Schema({
    amountOut:String,
    _string:String,
    old_price:String,
    new_price:String,
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
