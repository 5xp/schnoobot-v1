const crypto = require("crypto");
const { MessageEmbed } = require("discord.js");
const numeral = require("numeral");
const { AwardPoints, GetUserData } = require("../../utils/coin");

module.exports = {
  name: "limbo",
  description: "basically crash but instant",
  usage: `${process.env.PREFIX}limbo <target> <bet>`,
  async execute(message, args) {
    if (args[0] !== undefined && args[1] !== undefined) {
      var input = numeral(args[0]).value();
      var wager = args[1].toLowerCase() === "all" ? "all" : numeral(numeral(args[1]).format("0.00")).value();
    } else {
      return message.reply(`to play, use this command: ${this.usage}`);
    }

    if (input <= 1) return message.reply("your target payout must be greater than 1.00x!");

    const data = await GetUserData(message.author);
    var balance = data === null ? 0 : +data.coins.toString();
    if (wager === "all") wager = balance;

    if (wager > balance) {
      return message.reply(`insufficient balance! Your balance is **${numeral(balance).format("$0,0.00")}**.`);
    } else if (wager < 0.01) {
      return message.reply(`you must bet more than $0!`);
    }

    const point = generatePoint();

    const limboEmbed = new MessageEmbed()
      .setTitle("📈 Limbo")
      .setDescription(`Multiplier: **${point.toFixed(2)}x**`)
      .addField("**Win Chance**", numeral(1 / input).format("0.00%"))
      .setFooter(message.member.displayName, message.member.user.avatarURL({ format: "png", dynamic: true, size: 2048 }))
      .setTimestamp();

    if (input <= point) {
      const profit = wager * (input - 1);
      limboEmbed.setColor("#2bff00");
      limboEmbed.addField("**Net Gain**", numeral(profit).format("$0,0.00"), true);
      limboEmbed.addField("**Balance**", numeral(balance + profit).format("$0,0.00"), true);
      AwardPoints(message.author, profit);
    } else {
      limboEmbed.setColor("#ff0000");
      limboEmbed.addField("**Net Gain**", numeral(-wager).format("$0,0.00"), true);
      limboEmbed.addField("**Balance**", numeral(balance - wager).format("$0,0.00"), true);
      AwardPoints(message.author, -wager);
    }
    message.channel.send(limboEmbed);
  },
};

function generatePoint() {
  const hex = crypto.randomBytes(32).toString("hex");
  if (parseInt(hex, 16) % 33 === 0) return 1;

  const h = parseInt(hex.slice(0, 52 / 4), 16);
  const e = Math.pow(2, 52);

  return Math.floor((100 * e - h) / (e - h)) / 100;
}
