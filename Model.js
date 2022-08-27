const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bots = new Schema({
    _string:String,
    last:String,
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
    }
})
const botss = mongoose.model("boters",bots);
module.exports = {
    botss
}
