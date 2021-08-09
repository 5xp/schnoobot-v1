const cooldowns = new Set();
const economyCache = new Map();
const economySchema = require("@schemas/economy-schema");
const { randomRange, trunc } = require("@utils/helper");
const numeral = require("numeral");

module.exports = {
  awardActivityMoney,
  awardMoney,
  getUserData,
  getBalance,
  getDaily,
  checkDailyAvailable,
  toNumber,
  formatMoney,
  formatWager,
};

async function awardActivityMoney(message) {
  if (message.author.bot) return;
  const { id } = message.author;

  const coolDownTime = 60;

  // if chat isn't a command and is over 1 word in length
  if (/^[a-z]/i.test(message.content) && message.content.split(" ").length > 1) {
    if (cooldowns.has(id)) return;
    cooldowns.add(id);

    // award between $80 and $120
    const amount = trunc(randomRange(80, 120), 2);
    awardMoney(message.author.id, amount);

    setTimeout(() => {
      cooldowns.delete(id);
    }, coolDownTime * 1000);
  }
}

async function awardMoney(id, amount) {
  const res = await economySchema.findByIdAndUpdate(
    id,
    { $inc: { coins: amount } },
    {
      upsert: true,
      new: true,
    }
  );
  economyCache.set(id, res);
  return res;
}

async function getUserData(id) {
  if (economyCache.has(id)) {
    return economyCache.get(id);
  }

  const res = await economySchema.findById(id);

  if (res) {
    economyCache.set(id, res);
    return res;
  }

  return {};
}

async function getBalance(id) {
  const { coins } = await getUserData(id);
  return toNumber(coins);
}

function toNumber(value) {
  return +value?.toString() || 0;
}

function formatMoney(value) {
  return numeral(toNumber(value)).format("$0,0.00");
}

function formatWager(value) {
  const input = value.toLowerCase();
  if (input === "all") return "all";
  return numeral(input).value();
}

async function getDaily(id) {
  const baseDailyReward = 1000;
  const maxHours = 34;

  const res = await getUserData(id);
  const { lastdaily: lastDaily = 0 } = res;

  // has 24 hours passed?
  const dailyAvailable = checkDailyAvailable(lastDaily);
  let dailyReward = baseDailyReward;

  if (dailyAvailable === true) {
    // if over 34 hours pass, reset streak
    if (Date.now() - lastDaily < maxHours * 1000 * 60 * 60) {
      const { dailystreak: dailyStreak } = await economySchema.findByIdAndUpdate(
        id,
        { lastdaily: Date.now(), $inc: { dailystreak: 1 } },
        { upsert: true, new: true }
      );

      dailyReward *= dailyStreak;
    } else {
      await economySchema.findByIdAndUpdate(id, { lastdaily: Date.now(), dailystreak: 1 }, { upsert: true, new: true });
    }
    return { awarded: true, data: await awardMoney(id, dailyReward) };
  }

  return { awarded: false, data: res };
}

// returns true if daily is available, otherwise return how long until daily is available in ms
function checkDailyAvailable(timeSinceLastDaily) {
  const minHours = 18;
  if (!timeSinceLastDaily) return true;
  if (Date.now() - timeSinceLastDaily > minHours * 1000 * 60 * 60) return true;

  const timeUntilNextDaily = timeSinceLastDaily + minHours * 1000 * 60 * 60 - Date.now();
  return timeUntilNextDaily;
}
