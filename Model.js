const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const bots = new Schema({
    last:String,
    _string:String,
    last_point:String,
    date:{
        type:Date,
        default:Date.now()
    }
})
const botss = mongoose.model("bots",bots);
module.exports = {
    botss
}
