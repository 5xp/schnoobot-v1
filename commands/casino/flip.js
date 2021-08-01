const { MessageEmbed } = require("discord.js");
const { awardMoney, getBalance, formatMoney, formatWager } = require("@utils/economy");

module.exports = {
  name: ["flip", "coinflip"],
  description: "flip a coin",
  usage: `${process.env.PREFIX}flip <heads/tails> <bet>`,
  async execute(message, args) {
    if (args[0] && args[1]) {
      var input = args[0].toLowerCase();
      var wager = formatWager(args[1]);
    } else {
      return message.reply(`to play, use this command: \`${module.exports.usage}\``);
    }

    switch (input) {
      case "h":
      case "heads":
        input = 0;
        break;
      case "t":
      case "tails":
        input = 1;
        break;
      default:
        message.reply("you must choose heads or tails!");
        return;
    }

    const balance = await getBalance(message.author.id);
    if (wager === "all") wager = balance;

    if (wager > balance) {
      return message.reply(`insufficient balance! Your balance is **${formatMoney(balance)}**.`);
    } else if (wager < 0.01) {
      return message.reply(`you must bet more than $0!`);
    }

    const flipEmbed = new MessageEmbed()
      .setTitle("🪙 Coin Flip")
      .setFooter(
        message.member.displayName,
        message.member.user.avatarURL({ format: "png", dynamic: true, size: 2048 })
      )
      .setTimestamp();

    const flip = Math.round(Math.random());

    if (input == flip) {
      var end = "**You won!** ";
      flipEmbed.setColor("#2bff00");
      flipEmbed.addField("**Net Gain**", formatMoney(wager), true);
      flipEmbed.addField("**Balance**", formatMoney(balance + wager), true);
      awardMoney(message.author.id, wager);
    } else {
      var end = "**You lost!** ";
      flipEmbed.setColor("#ff0000");
      flipEmbed.addField("**Net Gain**", formatMoney(-wager), true);
      flipEmbed.addField("**Balance**", formatMoney(balance - wager), true);
      awardMoney(message.author.id, -wager);
    }

    const str = flip === 0 ? end + `The coin landed on **heads**!` : end + `The coin landed on **tails**!`;

    flipEmbed.setDescription(str);

    message.reply({ embeds: [flipEmbed], allowedMentions: { repliedUser: false } });
  },
};
