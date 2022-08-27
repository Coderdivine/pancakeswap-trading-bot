import  ethers from 'ethers'
import  chalk from 'chalk'
import  dotenv from 'dotenv'
import  ora from'ora'
import Coingecko from 'coingecko-api'
import mongoose from 'mongoose'
const CoinGeckoClient = new Coingecko();
//"mongodb+srv://chimdi:chimdindu2@cluster0.5zspaed.mongodb.net/?retryWrites=true&w=majority" || 'mongodb://localhost:27017/mum'
mongoose.connect("mongodb+srv://chimdi:chimdindu2@cluster0.5zspaed.mongodb.net/?retryWrites=true&w=majority");
const db = mongoose.connection;
db.on("error", (err) => { console.log(err) });
db.once("open", () => console.log("Connected to database"));
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
let time,id,last,last_point,_string,last_price,count,period,in_swap;
dotenv.config()

const config = {
  startCoin: process.env.START_COIN,
  startAmount: process.env.START_AMOUNT,
  slippage: process.env.SLIPPAGE,
  gasPrice: ethers.utils.parseUnits(`${process.env.GWEI}`, 'gwei'),
  gasLimit: process.env.GAS_LIMIT,
  tradeInterval: process.env.TRADE_INTERVAL,
  walletMin: process.env.WALLET_MIN
}

const saAddress = "0x55d398326f99059fF775485246999027B3197955"
const wbnbAddress = "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c"
const btcAddress = "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c"
const busdAddress = "0xe9e7cea3dedca5984780bafc599bd69add087d56"
const pancakeswapRouterAddress = "0x10ED43C718714eb63d5aA57B78B54704E256024E"

const bsc = process.env.BSC_NODE
const mnemonic = process.env.YOUR_MNEMONIC
const tokenOut = saAddress
const provider = new ethers.providers.JsonRpcProvider(bsc)
const wallet = new ethers.Wallet.fromMnemonic(mnemonic)
const account = wallet.connect(provider)

let tokenIn = ""

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
  account )

const sa = new ethers.Contract(
  saAddress,
  [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function balanceOf(address) view returns (uint)",
  ],
  account
)

const tokenContract = new ethers.Contract(
  tokenIn,
  [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function balanceOf(address) view returns (uint)",
  ],
  account
)

const saSymbol = await sa.symbol()
const tokenSymbol = await tokenContract.symbol()

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
async function checkBalanceTwo() {
  let bnbBalance = await account.getBalance()
  let bnbHuman = ethers.utils.formatEther(bnbBalance)
  let balance = await tokenContract.balanceOf(wallet.address)
  let humanBalance = ethers.utils.formatEther(balance)
  let saBalance = await sa.balanceOf(wallet.address)
  let saHuman = ethers.utils.formatEther(saBalance)
  console.log(chalk.magenta(`[INFO] wallet balance: ${bnbHuman} BNB`))
  console.log(chalk.magenta(`[INFO] wallet balance: ${humanBalance} ${tokenSymbol}`))
  console.log(chalk.magenta(`[INFO] wallet balance: ${saHuman} ${saSymbol}`))
  return saHuman
}

async function buyAction(buyQuantity) {
  console.log(chalk.yellow('[INFO] ready to buy'))
  try {
    let amountOutMin = 0
    let amountIn = ethers.utils.parseEther(buyQuantity)
    if ( parseInt(config.slippage) !== 0 ){
      let amounts = await router.getAmountsOut(amountIn, [tokenIn, tokenOut])
      amountOutMin = amounts[1].sub(amounts[1].div(`${config.slippage}`))
    }

    console.log(chalk.yellow(`
Buying ${saSymbol} using ${tokenSymbol}
=================
tokenIn: ${ethers.utils.formatEther(amountIn).toString()} ${tokenIn} (${tokenSymbol})
tokenOut: ${ethers.utils.formatEther(amountOutMin).toString()} ${tokenOut} (${saSymbol})
`))

    let tx
    if (config.startCoin === "bnb" || config.startCoin === "wbnb") {
      tx = await router.swapExactETHForTokens(
        amountOutMin,
        [tokenIn, tokenOut],
        wallet.address,
        Date.now() + 1000 * 60 * 5, //5 minutes
        {
            'gasLimit': config.gasLimit,
            'gasPrice': config.gasPrice,
            'nonce' : null,
            'value' : amountIn
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
    let receipt = await tx.wait()
    console.log(`Transaction receipt : https://www.bscscan.com/tx/${receipt.transactionHash}`)
    let lastSwapEvent = receipt.logs.slice(-1)[0]
    let swapInterface = new ethers.utils.Interface(['event Swap (address indexed sender, uint256 amount0In, uint256 amount1In, uint256 amount0Out, uint256 amount1Out, address indexed to)'])
    let parsed = swapInterface.parseLog(lastSwapEvent)
    let receivedTokens = parsed.args.amount0Out.isZero() ?  parsed.args.amount1Out : parsed.args.amount0Out
    let tokens = ethers.utils.formatEther(receivedTokens)
    console.log(`Swapped for tokens: ${tokens} ${saSymbol}`)
    return tokens
  } catch(err) {
    console.error(err)
    process.exit(1)
  }
}

async function sellAction(sellQuantity) {
  console.log(chalk.cyan('[INFO] ready to sell'))
  try {
    let amountInMin = 0
    let amountOut = ethers.utils.parseEther(sellQuantity)
    if ( parseInt(config.slippage) !== 0 ){
      let amounts = await router.getAmountsIn(amountOut, [tokenIn, tokenOut])
      amountInMin = amounts[0].sub(amounts[0].div(`${config.slippage}`))
    }

    console.log(chalk.cyan(`
Selling ${saSymbol} for ${tokenSymbol}
=================
tokenOut: ${ethers.utils.formatEther(amountOut).toString()} ${tokenOut} (${saSymbol})
tokenIn: ${ethers.utils.formatEther(amountInMin).toString()} ${tokenIn} (${tokenSymbol})
`))

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

function sleep(ms=1000) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function waitToTrade(seconds) {
  let waitCount = 0
  console.log(chalk.white.inverse(`[INFO] sleeping for ${seconds} seconds...`))
  let spinner = ora('sleeping').start()
  while (waitCount < seconds) {
    await sleep()
    waitCount++
    spinner.text = `sleeping: ${waitCount}`
  }
  if(last_price){
    await getPrice("binancecoin,tether", "usd")
    await GetData();
    await check();
}else{
    await getPrice("binancecoin,tether", "usd")
}
  spinner.stop()
  return
}

async function makeSwap(balance,toBuyValue,toSellValue) {
  if (balance > config.walletMin) {
    console.log('toBuyValue =', toBuyValue)
    console.log('toSellValue =', toSellValue)
    if (toSellValue > 0) {
      console.log('[INFO] initiating sell...')
      //toBuyValue = 
      await sellAction(toSellValue)
      toSellValue = 0
    } else if (toBuyValue > 0) {
      console.log('[INFO] initiating buy...')
      toSellValue = await buyAction(toBuyValue)
      toBuyValue = 0
    } 
    balance = await checkBalance()
    await update(toBuyValue);
    await waitToTrade(config.tradeInterval)
    await check();
  }
}
async function GetData() {
    const res = await botss.find()
        if (res.length) {
            last = res[0].last;
            last_point = res[0].last_point;
            _string = res[0]._string;
            id = res[0]._id;
            period = res[0].period;
            count = res[0].count;
            in_swap = res[0].in_swap;
            time = res[0].date
            let console_data = {
              last,last_point,_string,
              id,period,count,time
            }
            console.table(console_data);
            return {
                bool: true,
                data:console_data,
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
                    period:Date.now(),
                    count:"0",
                    in_swap:false

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

async function update(amounts,rate,period){ 
     try{
      
      const done = await botss.updateOne({ last },
        {
            $set: {
                last:amounts.toString(),
                last_point:last_price.binancecoin.usd.toString(),
                rate,
                period,
                count:Number(count)+1,
            } 
        });
        
         if(done){
                  console.log(done);
                  console.log("A trade was made: updated");
                  console.log("swaped")
          }
          console.log('updated')
     }catch(err){
      console.log(err.message);
     }
}

console.log('[INFO] RUNNING. Press ctrl+C to exit.')
let toBuyValue = config.startAmount;
let toSellValue = 0;
console.log('startAmount',config.startAmount);
let balance = await checkBalance()
let balance_two = await checkBalanceTwo()
console.log('balance USDT(Tether)',balance)
await GetData();
await getPrice("binancecoin,tether", "usd");
async function check(){
  if((Number(last_price.binancecoin.usd)-Number(last_point)) >= Number(_string)){
      let amounts_one = Number(last_price.binancecoin.usd) * Number(balance);
      let amounts_two = Number(last_point) * Number(balance);
    console.log('am_one,am_two',{amounts_one,amounts_two})
      let amounts = amounts_one-amounts_two;
      toBuyValue = Number(amounts)/last_price.binancecoin.usd;
      toBuyValue = toBuyValue.toFixed(6);
      toBuyValue = toBuyValue.toString();
      toSellValue = 0;
      console.log('amounts',amounts);
      console.log("@",{toSellValue,toBuyValue})
      console.log('change',Number(last_price.binancecoin.usd)-Number(last_point))
      console.log(`${last_price.binancecoin.usd}`, last_price.binancecoin.usd);
      await makeSwap(balance,toBuyValue,toSellValue)
      
  }else{
      

      let less = Number(last_price.binancecoin.usd)-Number(last_point)
      less = less + Number(_string);
      if(less <= 0){
        console.log('block changed');
        let call= Number(last_price.tether.usd) * Number(balance_two);
        let amounts_one = Number(last_price.binancecoin.usd) * Number(balance);
        let amounts_two = Number(last_point) * Number(balance);
        console.log('am_one,am_two',{amounts_one,amounts_two})
        let amounts = amounts_two-amounts_one;
        toSellValue = Number(amounts)///last_price.tether.usd;
        toSellValue = toSellValue.toFixed(6);
        toSellValue = toSellValue.toString();
        toBuyValue = 0;
        if(in_swap){
          if(amounts > 0.004990){
            console.log('amounts',amounts);
            console.log("@",{toSellValue,toBuyValue})
            console.log('change',Number(last_price.binancecoin.usd)-Number(last_point))
            console.log(`${last_price.binancecoin.usd}`, last_price.binancecoin.usd);
            //await makeSwap(call,toBuyValue,toSellValue)
           }else{
            console.log('skipped',toSellValue)
           }
        }else{
          console.log(chalk.cyan(`IN SWAP not enabled`));
          period = Date.now() - time;
          update(toSellValue,rate,period);
        }
      }else{
        console.log('still less',Number(last_price.binancecoin.usd)-Number(last_point))
       await waitToTrade(config.tradeInterval);
      }
  }
}
await check()
console.log('[INFO] Done.')
