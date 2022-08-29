const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bots = new Schema({
    _string:String,
    last:{
        type:String,
        required:true
    },
    last_point:String,
    rate:String,
    period:{
        type:Date
    },
    count:String,
    in_swap:{
        type:Boolean,
    },
    date:{
        type:Date,
        default:Date.now()
    },
    gas:{
        type:String,
        required:false
    }
})
const botss = mongoose.model("tradingBot",bots);
module.exports = {
    botss
}
