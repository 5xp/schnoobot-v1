const msgCooldowns = new Set();
const COOLDOWN_TIME = 10;
const cache = {};
const economySchema = require("../schemas/economy-schema");
const { RandomRange, TruncateDecimals, TimeToString } = require("../utils/helper");
const numeral = require("numeral");

module.exports = {
  async HandleCoin(client) {
    client.on("message", message => {
      if (/^[a-z]/i.test(message.content) && message.content.split(" ").length > 1) {
        ActivityPoints(message.author);
      }
    });
  },
  AwardPoints,
  GetBalance,
  GetDaily,
};

async function ActivityPoints(user, time = null) {
  const SC_PER_MSG = [10, 20];
  let coins = 0;

  if (!time) {
    if (user.bot) return;
    if (msgCooldowns.has(user.id)) return;
    msgCooldowns.add(user.id);

    setTimeout(() => {
      msgCooldowns.delete(user.id);
    }, COOLDOWN_TIME * 1000);

    coins = RandomRange(SC_PER_MSG[0], SC_PER_MSG[1]);
  } else {
    // TODO: points for being in vc
  }
  coins = TruncateDecimals(coins, 2);
  AwardPoints(user, coins);
}

async function AwardPoints(user, coins) {
  return await economySchema.findOneAndUpdate(
    {
      _id: user.id,
    },
    {
      _id: user.id,
      $inc: { coins },
    },
    {
      upsert: true,
      new: true,
    }
  );
}

async function GetBalance(user) {
  const result = await economySchema.findById(user.id);
  let balance = result ? result.coins : 0;
  return balance;
}

async function GetDaily(user) {
  const dailyreward = 1000;
  let lastDaily = cache[user.id];

  // is user in cache?
  if (!lastDaily) {
    result = await economySchema.findById(user.id);
    // has user ever claimed daily?
    if (result.lastdaily) {
      cache[user.id] = lastDaily = result.lastdaily;
    }
  }

  // has 24 hours passed?
  if (Date.now() - lastDaily > 1000 * 60 * 60 * 24 || !lastDaily) {
    cache[user.id] = lastDaily = Date.now();
    // TODO: daily reward * tier

    await economySchema.findByIdAndUpdate(
      user.id,
      {
        lastdaily: Date.now(),
      },
      {
        upsert: true,
      }
    );

    return AwardPoints(user, dailyreward).then(result => {
      return `you have received **${numeral(dailyreward).format("0,0.00")}**! Your new balance is **${numeral(result.coins).format("0,0.00")}**.`;
    });
  } else {
    // time until next daily
    let time = lastDaily + 1000 * 60 * 60 * 24 - Date.now();
    return `you have already claimed your daily reward! Come back in **${TimeToString(time)}**!`;
  }
}
