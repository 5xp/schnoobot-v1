const msgCooldowns = new Set();
const COOLDOWN_TIME = 10;
// const cache = {};
const economySchema = require("../schemas/economy-schema");
const { RandomRange, TruncateDecimals } = require("../utils/helper");
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
  GetUserData,
  GetDaily,
  dailyIn,
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

async function GetUserData(user) {
  const result = await economySchema.findById(user.id);
  return result;
}

async function GetDaily(user) {
  const dailyreward = 1000;
  // let lastDaily;
  // let data, dailystreak;

  let data = await GetUserData(user);
  // has user ever claimed daily?
  if (data && data.lastdaily) {
    var lastDaily = data.lastdaily;
  }
  // if (!lastDaily) {
  // }

  // has 24 hours passed?
  dailyAvailable = dailyIn(lastDaily);
  if (dailyAvailable === true) {
    // did less than 34 hours pass?
    if (Date.now() - lastDaily < 1000 * 60 * 60 * 34) {
      // increment streak
      let result = await economySchema.findByIdAndUpdate(
        user.id,
        {
          lastdaily: Date.now(),
          $inc: {
            dailystreak: 1,
          },
        },
        {
          upsert: true,
          new: true,
        }
      );
      dailystreak = result.dailystreak;
    } else {
      // reset streak
      let result = await economySchema.findByIdAndUpdate(
        user.id,
        {
          lastdaily: Date.now(),
          dailystreak: 1,
        },
        {
          upsert: true,
          new: true,
        }
      );
      dailystreak = result.dailystreak;
    }

    let result = await AwardPoints(user, dailyreward * dailystreak);
    return { awarded: true, reward: numeral(dailyreward * dailystreak).format("$0,0.00"), new_balance: numeral(result.coins).format("$0,0.00"), streak: dailystreak };
  } else {
    // time until next daily
    return { awarded: false, dailyAvailable: dailyAvailable, new_balance: numeral(+data.coins.toString()).format("$0,0.00"), streak: data.dailystreak };
  }
}

function dailyIn(lastdaily) {
  let time = lastdaily + 1000 * 60 * 60 * 18 - Date.now();
  return Date.now() - lastdaily > 1000 * 60 * 60 * 18 || !time || !lastdaily ? true : time;
}
