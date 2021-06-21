const { GetUserData, dailyIn } = require("../../utils/coin");
const { FindMember } = require("../../utils/helper");
const numeral = require("numeral");
const { MessageEmbed } = require("discord.js");
const economySchema = require("../../schemas/economy-schema");

module.exports = {
  name: ["balance", "bal"],
  description: "get your balance",
  usage: `${process.env.PREFIX}balance\n${process.env.PREFIX}balance <@member?>\n${process.env.PREFIX}balance top`,
  async execute(message, args) {
    if (args[0] == "top") {
      const index = await economySchema.find().sort({ coins: -1 });
      const top = 10;
      const j = Math.min(top, index.length);
      let str = "\n";

      for (var i = 0; i < j; i++) {
        let bal = +index[i].coins.toString();
        str += `**#${i + 1}: <@${index[i]._id}> | **${numeral(bal).format("$0,00.00")}\n`;
      }

      const topEmbed = new MessageEmbed().setColor("#80ff80").addFields({ name: `Top ${j} balances`, value: str });
      message.channel.send(topEmbed);
    } else {
      let member = !args.length ? message.member : FindMember(args[0], message);

      if (!member) {
        return message.reply(`To use this command: \`\`${module.exports.usage}\`\``);
      }

      let data = await GetUserData(member);

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
    }
  },
};
