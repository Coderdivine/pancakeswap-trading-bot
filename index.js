const Coingecko = require('coingecko-api')
const CoinGeckoClient = new Coingecko();
const mongoose = require('mongoose')
require('dotenv').config()
//"mongodb+srv://chimdi:chimdindu2@cluster0.5zspaed.mongodb.net/?retryWrites=true&w=majority" || 'mongodb://localhost:27017/mum'
mongoose.connect("mongodb+srv://chimdi:chimdindu2@cluster0.5zspaed.mongodb.net/?retryWrites=true&w=majority");
const db = mongoose.connection;
db.on("error", (err) => { console.log(err) });
db.once("open", () => console.log("Connected to database"));
const { botss } = require("./Model");
let last,last_point,_string,last_price;
async function GetData() {
    const res = await botss.find()
        if (res.length) {
            last = res[0].last;
            last_point = res[0].last_point;
            _string = res[0]._string;
            console.table(`
            'last':${last},
            'last_point':${last_point},
            'STRING':${_string}`);
            return {
                bool: true,
                data: res[0],
                msg: "Data found"
            }
        } else {
            console.log("Updating");
            const res = await botss.find()
            if(res.length){
               console.log("Length dey")
            }else{
                console.log("Something dey sup");
                const bot = new botss({
                    last:last_price.binancecoin.usd,
                    _string:"10",
                    last_point:last_price.binancecoin.usd,
                })
               const save =  await bot.save();
               if(save){
                console.log(save);
               }
            }
            return {
                bool: false,
                msg: "Something went wrong"
            }
        };
}
async function getPrice(coin, fiated) {
    let fiat = fiated.toLowerCase();
    let data = await CoinGeckoClient.simple.price({
        ids: [coin],
        vs_currencies: [fiat],
    });
    last_price = data.data;
    if (data.code == 200) {
        console.log(`${coin}`, data);
        data = data.data;
        return data
    } else {
        console.log(`${coin}`, last_price);
        return last_price;
    }

}
async function check(){
    if((Number(last_price.binancecoin.usd)-Number(last_point)) >= Number(_string)){
        let bal = 0.001;
        let amounts_one = Number(last_price.binancecoin.usd) * bal;
        let amounts_two = Number(last_point) * bal;
        let amounts = amounts_one-amounts_two;
        console.log('amounts',amounts);
        console.log('change',Number(last_price.binancecoin.usd)-Number(last_point))
        console.log(`${last_price.binancecoin.usd}`, last_price.binancecoin.usd);
        await update(amounts);
    }else{
        console.log('still less',Number(last_price.binancecoin.usd)-Number(last_point))
    }
}
async function update(amounts){
    let last_point = last_price.binancecoin.usd;
    await botss.updateOne({ last },
        {
            $set: {
                last: amounts,
                last_point
            }
        }, function (err, result) {
            if (err) {
                console.log(err.message)
            } else {
                console.log(result);
                console.log("A trade was made: updated");
                console.log("swaped")
            }
        })
}

setInterval(async function () {
    if(last_price){
        await GetData();
        await check();
    }else{
        await getPrice("binancecoin,tether", "usd")
    }
}, 5000); 
setInterval(async function () {
    await getPrice("binancecoin,tether", "usd");
}, 60000); 