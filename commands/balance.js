const { GetUserData, dailyIn } = require("../utils/coin");
const { FindMember } = require("../utils/helper");
const numeral = require("numeral");
const { MessageEmbed } = require("discord.js");

module.exports = {
  name: "balance",
  description: "get your balance",
  category: "Fun",
  alias: ["bal"],
  async execute(message, args) {
    let member = !args.length ? message.member : FindMember(args[0], message);

    let data = await GetUserData(member);
    if (!member || typeof data == "undefined") {
      message.reply("invalid user!");
      return;
    }

    let balance = data && data.coins ? +data.coins.toString() : 0;
    let lastdaily = data && data.lastdaily ? data.lastdaily : undefined;
    let streak = data && data.dailystreak ? data.dailystreak + "🔥" : 0;

    let dailyAvailable = dailyIn(lastdaily);
    let dailystr = dailyAvailable === true ? "NOW" : "in " + dailyAvailable;

    let balanceEmbed = new MessageEmbed()
      .setColor("#0000FF")
      .setAuthor(`${member.displayName}'s balance`, member.user.avatarURL())
      .addField("**Balance**", numeral(balance).format("$0,0.00"), true)
      .addField("**Daily available**", `${dailystr}`, true)
      .addField("**Streak**", streak, true);
    message.channel.send(balanceEmbed);
  },
};
