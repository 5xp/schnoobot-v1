const crypto = require("crypto");
const { MessageEmbed } = require("discord.js");
const numeral = require("numeral");
const { AwardPoints, GetUserData } = require("../../utils/coin");

module.exports = {
  name: "limbo",
  description: "pick a target multiplier and if it lands higher than your target, you win",
  usage: `${process.env.PREFIX}limbo <target> <bet>`,
  slash: true,
  options: [
    { name: "target", type: "STRING", description: "your target multiplier", required: true },
    { name: "bet", type: "STRING", description: "your wager on this bet", required: true },
  ],
  async execute(interaction, args) {
    const isSlash = interaction.isCommand?.();
    var input, wager, user;

    if (isSlash) {
      input = numeral(numeral(interaction.options.get("target").value).format("0.00")).value();
      wager = interaction.options.get("bet").value.toLowerCase() === "all" ? "all" : numeral(interaction.options.get("bet").value).value();
      user = interaction.user;
    } else {
      user = interaction.author;
      if (!args[0] && !args[1]) {
        input = numeral(numeral(args[0]).format("0.00")).value();
        wager = args[1].toLowerCase() === "all" ? "all" : numeral(numeral(args[1]).format("0.00")).value();
      } else {
        return interaction.reply(`To play, use this command: \`${module.exports.usage}\``);
      }
    }
    console.log(input);

    if (input <= 1) return interaction.reply("Your target payout must be greater than 1.00x!");

    const data = await GetUserData(user);
    var balance = data === null ? 0 : +data.coins.toString();
    if (wager === "all") wager = balance;

    if (wager > balance) {
      return interaction.reply(`insufficient balance! Your balance is **${numeral(balance).format("$0,0.00")}**.`);
    } else if (wager < 0.01) {
      return interaction.reply(`You must bet more than **$0**!`);
    }

    const point = generatePoint();

    const limboEmbed = new MessageEmbed()
      .setTitle("📈 Limbo")
      .setDescription(`Multiplier: **${point.toFixed(2)}x**`)
      .addField("**Target Multipler**", input.toFixed(2) + "x", true)
      .addField("**Bet**", numeral(wager).format("$0,0.00"), true)
      .addField("**Win Chance**", numeral(1 / input).format("0.00%"), true)
      .setFooter(user.username, user.avatarURL({ format: "png", dynamic: true, size: 2048 }))
      .setTimestamp();

    if (input <= point) {
      const profit = wager * (input - 1);
      limboEmbed.setColor("#2bff00");
      limboEmbed.addField("**Net Gain**", numeral(profit).format("$0,0.00"), true);
      limboEmbed.addField("**Balance**", numeral(balance + profit).format("$0,0.00"), true);
      AwardPoints(user, profit);
    } else {
      limboEmbed.setColor("#ff0000");
      limboEmbed.addField("**Net Gain**", numeral(-wager).format("$0,0.00"), true);
      limboEmbed.addField("**Balance**", numeral(balance - wager).format("$0,0.00"), true);
      AwardPoints(user, -wager);
    }
    interaction.reply({ embeds: [limboEmbed], allowedMentions: { repliedUser: false } });
  },
};

function generatePoint() {
  const hex = crypto.randomBytes(32).toString("hex");

  const h = parseInt(hex.slice(0, 52 / 4), 16);
  const e = Math.pow(2, 52);

  return Math.floor((100 * e) / (e - h)) / 100;
}
