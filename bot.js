import ethers from 'ethers'
import chalk from 'chalk'
import dotenv from 'dotenv';
dotenv.config();
import ora from 'ora'
import Coingecko from 'coingecko-api';
import mongoose from 'mongoose'
import Binance from 'node-binance-api';
const binance = new Binance()
.options({
  APIKEY:process.env.BINANCE_APIKEY,
  APISECRET:process.env.BINANCE_APISECRET,
});
const CoinGeckoClient = new Coingecko();
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017');
const db = mongoose.connection;
db.on("error", (err) => { console.log(err) });
db.once("open", () => console.log("Connected to database"));
const Schema = mongoose.Schema;
let time, id, last, last_point, _string, last_price, count, 
period, in_swap, gas, threshold, startPrice, percentage_change_in_price, 
old_threshold, new_threshold, gasOverAll, dates, gasVolume, gain, gainCount, gainBreak;


const BotSchema = new Schema({
  _string:{
    type: String,
  },
  last: {
    type: String,
    required: true
  },
  last_point:{
    type: String
  },
  rate:{
    type: String
  },
  period: {
    type: Date
  },
  count: String,
  in_swap: {
    type: Boolean,
  },
  date: {
    type: Date,
    default: Date.now()
  },
  gas: {
    type: String,
    required: false
  },
  new_threshold:{
    type: Number,
  },
  startPrice:{
    type:String
  },
  percentage_change_in_price:{
    type: Number,
  },
  old_threshold:{
    type: Number,
  },
  gasOverAll:{
    type:[String]
  },
  dates:{
    type:[Date],
  },
  gasVolume:{
    type:Number,
  },
  gain:{
    type:[Number]
  },
  gainCount:{
      type:Number
  },
  gainBreak:{
    type:Number
  }
});

const botss = mongoose.model("swingbot-2023", BotSchema);

// Set the trading pair and interval...
const SYMBBOL_ = "BNBUSDT";
const interval = '15m';

// Get the last 200 candlesticks for the trading pair and interval
async function getBNBPriceChangePerDay() {
  const ticker = 'binancecoin'; // Binance Coin (BNB) symbol on Coingecko
  const data = await CoinGeckoClient.coins.fetch(ticker, {
    tickers: false,
    market_data: true,
    community_data: false,
    developer_data: false,
    localization: false,
    sparkline: false
  }); // get coin data for BNB

  const currentClose = parseFloat(data.data.market_data.current_price.usd); // current day's closing price
  const prevClose = currentClose / (1 + (data.data.market_data.price_change_percentage_24h_in_currency.usd / 100));
  // const prevClose = parseFloat(data.data.market_data.price_change_percentage_24h) / 100 + 1; // previous day's closing price
  const priceChange = currentClose / prevClose - 1; // price change per day

  // calculate threshold based on price change per day
  let threshold = 0;
  if (priceChange >= 0) {
    threshold = Math.min(priceChange * 0.5, 12); // threshold capped at 12
  } else {
    threshold = Math.max(priceChange * 0.5, -12); // threshold capped at -12
  }
  threshold = Math.max(threshold, 2); // threshold floor at 2
  console.log(":::> threshold = ", threshold);

  console.log({
    threshold,
    currentClose,
    prevClose,
    priceChange,
    sign:priceChange < 0?"-":"+"
  });
  console.log("5")

  return threshold;
}


// async function getBNBPriceChangePerDay() {

//   const ticker = SYMBBOL_; // Binance Coin (BNB) trading pair
//   const klines = await binance.candlesticks(ticker, '1d'); 
//   console.log("RECENT:::>")// get daily klines for BNB
//   const prevClose = parseFloat(klines[klines.length - 2][4]); // previous day's closing price
//   const currentClose = parseFloat(klines[klines.length - 1][4]); // current day's closing price
//   const priceChange = currentClose - prevClose; // price change per day

//   // calculate threshold based on price change per day
//   let threshold = 0;
//   if (priceChange >= 0) {
//     threshold = Math.min(priceChange * 0.5, 12); // threshold capped at 12
//   } else {
//     threshold = Math.max(priceChange * 0.5, -12); // threshold capped at -12
//   }
//   threshold = Math.max(threshold, 2); // threshold floor at 2
//   console.log(":::> threshold = ", threshold);

//   console.log({
//     threshold,
//     currentClose,
//     prevClose,
//     priceChange,
//     sign:priceChange < 0?"-":"+"
//   });
//   console.log("5")


//   return threshold;
// }

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString();
  return `${day}-${month}-${year}`;
}

//Get recent transactions for db...
async function GetData() {
  const res = await botss.find({});
  if (!res.length) {
    console.log(res)
    console.log(":::> Creating new BOT");
    const bot = new botss({
      last:"0",
      _string: "3",
      last_point: '289',
      rate: '1',
      period: Date.now(),
      count: "0",
      in_swap: false,
      gas:"0",
      new_threshold:0,
      startPrice:"0",
      percentage_change_in_price:0,
      old_threshold:0,
      gasOverAll:[0],
      dates:[0],
      gain:[0],
      gasVolume:0,
      gainCount:0,
      gasBreak:0
    });
    const save = await bot.save();
    if (save) {
      console.table(save);
    }
    return {
      bool: false,
      msg: "Something went wrong"
    }
  } else {
    last = res[0].last;
    last_point = res[0].last_point;
    _string = res[0]._string;
    id = res[0]._id;
    period = formatTimestamp(res[0].period);
    count = res[0].count;
    in_swap = res[0].in_swap;
    time = formatTimestamp(res[0].date);
    gas = res[0].gas;
    startPrice = res[0].startPrice;
    percentage_change_in_price = res[0].percentage_change_in_price;
    old_threshold = res[0].old_threshold;
    new_threshold = res[0].new_threshold;
    gasOverAll = res[0].gasOverAll;
    dates = res[0].dates;
    gasVolume = res[0].gasVolume
    gain = res[0].gain;
    gainCount = res[0].gainCount;
    gainBreak = res[0].gainBreak;

    let console_data = {
      last, last_point, _string,
      startPrice,
      id, period, count, time, gas,
      old_threshold,
      percentage_change_in_price,
      new_threshold,
      gasOverAll,
      dates,
      gasVolume, gainBreak,
      gain, gainCount
    }
    console.table(console_data);
    return {
      bool: true,
      data: console_data,
      msg: "Data found"
    }
  };
}














const config = {
  startCoin: process.env.START_COIN,
  startAmount: process.env.START_AMOUNT,
  slippage: process.env.SLIPPAGE,
  gasPrice: ethers.utils.parseUnits(`${process.env.GWEI}`, 'gwei'),
  gasLimit: process.env.GAS_LIMIT,
  tradeInterval: process.env.TRADE_INTERVAL,
  walletMin: process.env.WALLET_MIN
}
console.table(config);

const saAddress = "0x55d398326f99059fF775485246999027B3197955";
const wbnbAddress = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c";
const btcAddress = "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c";
const busdAddress = "0xe9e7cea3dedca5984780bafc599bd69add087d56";
const pancakeswapRouterAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E";

const bsc = process.env.BSC_NODE;
const mnemonic = process.env.YOUR_MNEMONIC
const tokenOut = saAddress
const provider = new ethers.providers.JsonRpcProvider(bsc)
const wallet = new ethers.Wallet.fromMnemonic(mnemonic)
const account = wallet.connect(provider);

let tokenIn = "";

switch (config.startCoin) {
  case 'btc':
    tokenIn = btcAddress
    break
  case 'busd':
    tokenIn = busdAddress
    break
  default:
    tokenIn = wbnbAddress
}


const router = new ethers.Contract(
  pancakeswapRouterAddress,
  [
    "function WETH() external pure returns (address)",
    "function factory() external pure returns (address)",
    "function getAmountOut(uint amountIn, uint reserveIn, uint reserveOut) public pure returns (uint amountOut)",
    "function getAmountIn(uint amountOut, uint reserveIn, uint reserveOut) public pure returns (uint amountIn)",
    "function getAmountsOut(uint amountIn, address[] memory path) public view returns (uint[] memory amounts)",
    "function getAmountsIn(uint amountOut, address[] memory path) public view returns (uint[] memory amounts)",
    "function quote(uint amountA, uint reserveA, uint reserveB) public pure returns (uint amountB)",
    "function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts)",
    "function swapExactTokensForETH(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
    "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
  ],
  account)

const sa = new ethers.Contract(
  saAddress,
  [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function balanceOf(address) view returns (uint)",
  ],
  account)

const tokenContract = new ethers.Contract(
  tokenIn,
  [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function balanceOf(address) view returns (uint)",
  ],
  account)

const saSymbol = await sa.symbol()
const tokenSymbol = await tokenContract.symbol()


//Get balance of WBNB...
async function checkBalance() {
  let bnbBalance = await account.getBalance()
  let bnbHuman = ethers.utils.formatEther(bnbBalance)
  let balance = await tokenContract.balanceOf(wallet.address)
  let humanBalance = ethers.utils.formatEther(balance)
  let saBalance = await sa.balanceOf(wallet.address)
  let saHuman = ethers.utils.formatEther(saBalance)
  console.log(chalk.magenta(`[INFO] wallet balance: ${bnbHuman} BNB`))
  console.log(chalk.magenta(`[INFO] wallet balance: ${humanBalance} ${tokenSymbol}`))
  console.log(chalk.magenta(`[INFO] wallet balance: ${saHuman} ${saSymbol}`))
  return bnbHuman
}

//Get balance of USDT...
async function checkBalanceTwo() {
  let bnbBalance = await account.getBalance()
  let bnbHuman = ethers.utils.formatEther(bnbBalance)
  let balance = await tokenContract.balanceOf(wallet.address)
  let humanBalance = ethers.utils.formatEther(balance)
  let saBalance = await sa.balanceOf(wallet.address)
  let usdtBalance = ethers.utils.formatEther(saBalance)
  console.log(chalk.magenta(`[INFO] wallet balance: ${bnbHuman} BNB`))
  console.log(chalk.magenta(`[INFO] wallet balance: ${humanBalance} ${tokenSymbol}`))
  console.log(chalk.magenta(`[INFO] wallet balance: ${usdtBalance} ${saSymbol}`))
  return usdtBalance
}


//Make a buy Option...
async function buyAction(buyQuantity) {
  //USDT using BNB
  console.log(chalk.yellow('[INFO] ready to BUY'))
  try {
    let amountOutMin = 0;
    let amountIn = ethers.utils.parseEther(buyQuantity)// I want to buy ? amt = ? ...

    if (parseInt(config.slippage) !== 0) {
      let amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut])
      amountOutMin = amounts[1].sub(amounts[1].div(`${config.slippage}`))//Some calculatio using slippage as params...
    }

    console.log(chalk.yellow(`
        ::::> Buying ${saSymbol} using ${tokenSymbol}
        ================= (I/O)
        tokenInput: ${ethers.utils.formatEther(amountIn).toString()} (${tokenIn.substring(0,10)+"..."+tokenIn.substring(4,tokenIn.length)}) (${tokenSymbol})
        tokenOutput: ${ethers.utils.formatEther(amountOutMin).toString()} (${tokenOut.substring(0,10)+"..."+tokenOut.substring(4,tokenOut.length)}) (${saSymbol})
        `));

    let tx
    console.table({["SWAP WALLET ADDRESS"]:wallet.address})
    if (config.startCoin === "bnb" || config.startCoin === "wbnb") {
      tx = await router.swapExactETHForTokens(
        amountOutMin,
        [tokenIn, tokenOut],
        wallet.address,
        Date.now() + 1000 * 60 * 10, //5 minutes
        {
          'gasLimit': config.gasLimit,
          'gasPrice': config.gasPrice,
          'nonce': null,
          'value': amountIn
        })
    } else {
      tx = await router.swapExactTokensForTokens(
        amountIn,
        amountOutMin,
        [tokenIn, tokenOut],
        wallet.address,
        Date.now() + 1000 * 60 * 5, //5 minutes
        {
          'gasLimit': config.gasLimit,
          'gasPrice': config.gasPrice
        })
    }

    let receipt = await tx.wait(); //Wait for tx to complete...
    console.log(`:::> Transaction receipt : https://www.bscscan.com/tx/${receipt.transactionHash}`);
    let lastSwapEvent = receipt.logs.slice(-1)[0]
    let swapInterface = new ethers.utils.Interface(['event Swap (address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)'])
    let parsed = swapInterface.parseLog(lastSwapEvent)
    let receivedTokens = parsed.args.amount0Out.isZero() ? parsed.args.amount1Out : parsed.args.amount0Out
    let tokens = ethers.utils.formatEther(receivedTokens)
    const tx_data = {
      lastSwapEvent,
      swapInterface,
      parsed,
      receivedTokens,
      tokens
    };
    console.table(tx_data);
    console.log(`:::> Swapped for tokens: ${tokens} ${saSymbol}`)
    return tokens;
  } catch (err) {
    console.error({err})
    process.exit(1)
  }
}

//Make a buy Option...
async function sellAction(sellQuantity) {
  console.log(chalk.cyan(':::> [INFO] ready to sell'));
  //BNB for USDT
  try {
    let amountInMin = 0
    let amountOut = ethers.utils.parseEther(sellQuantity);

    if (parseInt(config.slippage) !== 0) {
      let amounts = await router.getAmountsIn(amountOut, [tokenIn, tokenOut])
      amountInMin = amounts[0].sub(amounts[0].div(`${config.slippage}`));
    }

    console.log(chalk.cyan(`
        :::> Selling ${saSymbol} for ${tokenSymbol}
        ================= (I/O)
        tokenOutput: ${ethers.utils.formatEther(amountOut).toString()} (${tokenOut.substring(0,6)+"..."+tokenOut.substring(0,tokenOut.length)}) (${saSymbol})
        tokenInput: ${ethers.utils.formatEther(amountInMin).toString()} (${tokenIn.substring(0,6)+"..."+tokenIn.substring(0,tokenIn.length)}) (${tokenSymbol})
        `));

    let tx
    if (config.startCoin === "bnb" || config.startCoin === "wbnb") {
      tx = await router.swapExactTokensForETH(
        amountOut,
        amountInMin,
        [tokenOut, tokenIn],
        wallet.address,
        Date.now() + 1000 * 60 * 5, //5 minutes
        {
          'gasLimit': config.gasLimit,
          'gasPrice': config.gasPrice
        })
    } else {
      tx = await router.swapExactTokensForTokens(
        amountOut,
        amountInMin,
        [tokenOut, tokenIn],
        wallet.address,
        Date.now() + 1000 * 60 * 5, //5 minutes
        {
          'gasLimit': config.gasLimit,
          'gasPrice': config.gasPrice
        })
    }
    let receipt = await tx.wait();
    console.log(`Transaction receipt : https://www.bscscan.com/tx/${receipt.transactionHash}`)
    // let lastSwapEvent = receipt.logs.slice(3)[0]
    // let swapInterface = new ethers.utils.Interface(['event Swap(address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)'])
    // let parsed = swapInterface.parseLog(lastSwapEvent)
    // let receivedTokens = parsed.args.amount0Out.isZero() ?  parsed.args.amount1Out : parsed.args.amount0Out
    // let tokens = ethers.utils.formatEther(receivedTokens)
    // console.log(`Swapped for tokens: ${tokens} ${tokenSymbol}`)
    // return tokens
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

//Create a sleep function...
function sleep(ms = 1111) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

//waitForTrade...
async function waitToTrade(seconds) {
  let waitCount = 0
  console.log(chalk.white.inverse(`[INFO] sleeping for ${seconds} seconds...`))
  let spinner = ora('sleeping').start()
  while (waitCount < seconds) {
    await sleep()
    waitCount++
    spinner.text = `sleeping: ${waitCount}`
  }
  if (last_price) {
    await getPrice("binancecoin,tether", "usd")
    await GetData();
    await check();
  } else {
    await getPrice("binancecoin,tether", "usd")
  }
  spinner.stop()
  return
}

//make Swap Call...
async function makeSwap(balance, toBuyValue, toSellValue, rate, period) {
   /**
    * toBuyValue = AmountOut
    * toSellValue = AmountIn
    * balance = AmountIn Balance
    * rate = RATE
    * period = FOR TRADE SETTINGS
    */
  if (balance > config.walletMin) {
    console.table({['toBuyValue(AmountOut) =']:toBuyValue});
    console.table({['toSellValue(AmountIn) =']:toSellValue});

    if (toSellValue > 0) {
      console.log(':::> [INFO] initiating sell...')
      //toBuyValue = 
      await sellAction(toSellValue);
      toSellValue = 0
    } else if (toBuyValue > 0) {
      console.log(':::> [INFO] initiating buy...')
      toSellValue = await buyAction(toBuyValue);
      toBuyValue = 0
    }
    balance = await checkBalance();
    //(Need update)
    await update(toBuyValue, rate, period);
    await waitToTrade(config.tradeInterval)
    await check();
  }
}

//Enable or disable trading...
async function Allow(balance) {
  // 0.10bnb == NGN15k
  if (Number(balance) <= 0.060) {
    //0.095 => NGN25000
    return false
  } else {
    return true;
  }
}



//Get current price of WBNB and USDT...
async function getPrice(coin, fiated) {
  let fiat = fiated.toLowerCase();
  let data = await CoinGeckoClient.simple.price({
    ids: [coin],
    vs_currencies: [fiat],
  });
  last_price = data.data
  console.table({["...CODE"]:data.code})
  if (data.code == 200) {
    console.table({[data.code]:data.message})
    console.table(data.data);
    data = data.data;
    return data
  } else {
    console.log(`${coin}`, last_price);
    return last_price;
  }

}

//Update database with new values...
async function update(amounts, rate, period) {
  try {

    gas = Number(gas) + 1;
    count = Number(count) + 1;
    gasOverAll = [...gasOverAll,gas];
    dates = [...dates,Date.now()];
    gasVolume = Number(gasVolume) + Number(gas);
    gain = [...gain, Number(amounts)]; // Gain not calculated yet...
    gainCount = gain.length;
    gas = gas.toString();
    count = count.toString();

    const done = await botss.updateOne({ last },
      {
        $set: {
          last: amounts.toString(),
          last_point: last_price.binancecoin.usd.toString(),
          rate,
          period,
          count,
          gas,
          new_threshold:threshold,
          old_threshold:new_threshold,
          percentage_change_in_price,
          gasOverAll,
          gasVolume,
          dates,
          gain,
          gainCount        
        }
    });

    if (done) {
      console.log({done});
      console.log(":::> A trade was made: updated");
      console.log("<::: SWAPED :::>")
    }
    console.log('updated')
  } catch (err) {
    console.log(err.message);
  }
}

//Run bot simulation...
console.log('[TRADING] RUNNING. Press ctrl+C to exit.')
let toBuyValue = config.startAmount; //(Need update)...
let toSellValue = 0; //(Need update)...

let allow, balance, balance_two;

async function SellRequiredUSDT(){
  //If break point is approved...
  //Check if threshold is greater now...
  //return amount to trade - gasFees
}

async function SellAll({coin,value}){
  if(value == true) config.startCoin = coin;
  console.log({STARTCOIN:config.startCoin});
}

async function PreCheck(){
  console.log({["USE ADDRESS (HEX) :::>"]:wallet.address});
  console.table({startAmount:config.startAmount});
  balance = await checkBalance();
  balance_two = await checkBalanceTwo();
  console.table({WBNB:balance,USDT:balance_two});
  await GetData();
  await getPrice("binancecoin,tether", "usd");
  
    threshold = await getBNBPriceChangePerDay();
    allow = await Allow(balance);
    console.table({allow});
}

//RUN BOT simulation Check...
async function check() {
    await PreCheck();
  if(allow) {
    /**
     * (recentBalance - previousBalance) >= Threshold
     * In if statement...
     * AmoutnOne calculates the Current Price in Dollar (Default currency) of TOKEN
     * AmoutnTwo calculates the Previous Price in Dollar (Default currency) of TOKEN
     * Amounts calculates expected gain from TOKEN...
     * 
     * In Else statement...
     * Call calculates Bot USDT (USD) balance 
     * AmountOne calculates Bot BNB balance in Dollar
     * AmountTwo calculates Bot BNB Previous balance in Dollar...
     * 
     * 
     */
    if ((Number(last_price.binancecoin.usd) - Number(last_point)) >= Number(threshold) ){
      //Number(_string)) {
      console.log('BLOCK UNCHANGED # :::>');
      let amounts_one = Number(last_price.binancecoin.usd) * Number(balance);
      let amounts_two = Number(last_point) * Number(balance);
      console.table({ AmoutnOne:amounts_one, AmoutnTwo:amounts_two, Amounts:(amounts_one-amounts_two)});
      let amounts = amounts_one - amounts_two;
      toBuyValue = Number(balance) // Number(amounts) / Number(last_price.binancecoin.usd);
      let controlUnit = Number(0.20) / Number(last_price.binancecoin.usd);
      if (toBuyValue >= controlUnit) {
        // in bnb :)
        console.table({["Price Start Point "]:{"Token":controlUnit,"USD":controlUnit*Number(last_price.binancecoin.usd)}});
        toBuyValue = toBuyValue.toFixed(6);
        toBuyValue = toBuyValue.toString();
        toSellValue = 0;
        console.log('amounts', amounts);
        console.table({ toSellValue, toBuyValue })
        // console.log('change', Number(last_price.binancecoin.usd) - Number(last_point))
        console.log(`${last_price.binancecoin.usd}`, last_price.binancecoin.usd);
        await makeSwap(balance, toBuyValue, toSellValue, amounts, period)

      } else {
        let pp_ = {
          toBuyValue,
          mini:controlUnit,
          difference: Number(toBuyValue) - controlUnit
        }
        console.table(pp_)
        await waitToTrade(15)
        await check()

      }

    } else {

      let less = Number(last_price.binancecoin.usd) - Number(last_point)
      less = less;
      period = Date.now() - time;
      const negativeThreshold = ((Number(threshold))-(Number(threshold)*2));
      console.log("negativeThreshold =>",negativeThreshold);
        console.log({LessCal:less-negativeThreshold});

      if (less <= 0 && less < negativeThreshold) {
        console.log('<::: # BLOCK CHANGED #');
        let call = Number(last_price.tether.usd) * Number(balance_two);
        let amounts_one = Number(last_price.binancecoin.usd) * Number(balance);
        let amounts_two = Number(last_point) * Number(balance);
        console.table({ BNB_TO_DOLLAR:amounts_one, PREV_BNB_TO_DOLLAR:amounts_two });
        let amounts = amounts_two - amounts_one;
        console.log("Differnce =>",amounts);
        amounts = amounts.toString();
        toSellValue = Number(amounts); //last_price.tether.usd;
        toSellValue = toSellValue.toFixed(6);
        toSellValue = toSellValue.toString();
        toBuyValue = 0;
        if (in_swap) {
          if (amounts >= 0.10) {
            console.table({SellValue:amounts});
            console.table({ toSellValue, toBuyValue });
            console.table({['change In Price']: Number(last_price.binancecoin.usd) - Number(last_point)});
            console.log(`${last_price.binancecoin.usd}`, last_price.binancecoin.usd);
            await makeSwap(call, toBuyValue, toSellValue, amounts, period);
          } else {
            console.log('toSellValue', toSellValue)
            await waitToTrade(config.tradeInterval);
            await check();
          }
        } else {
          console.log(chalk.cyan(`IN SWAP not enabled`));

          //update(toSellValue,amounts,period);
          await waitToTrade(config.tradeInterval);
          await check();
        }
        //  if(amounts > 0.14990){
        //   console.log('amounts',amounts);23
        //   console.log("@",{toSellValue,toBuyValue})
        //   console.log('change',Number(last_price.binancecoin.usd)-Number(last_point))
        //   console.log(`${last_price.binancecoin.usd}`, last_price.binancecoin.usd);
        // await makeSwap(call,toBuyValue,toSellValue)
        //  }else{
        //   console.log('skipped',toSellValue)
        //  }
      }else{
        console.log('::> Still under Threshold', Number(last_price.binancecoin.usd) - Number(last_point))
        await waitToTrade(config.tradeInterval);
        await check();
      }
    }
  } 
  else {
    if (balance < 0.02) {
      console.log(":::> Balance is <=", 0.02);
      await waitToTrade(19);
      await check()
    } 
    await waitToTrade(29);
      await check()
    // else {
    //   const val = 0.1190 - Number(balance);
    //   // buying bnb...
    //   toBuyValue = val.toString();
    //   toSellValue = 0;
    //   let amounts = val;
    //   period = Date.now() - time;
    //   await makeSwap(balance, toBuyValue, toSellValue, amounts, period);
    // }
  }
}

await check();
console.log('<::: [TRADING] DONE :::>');
