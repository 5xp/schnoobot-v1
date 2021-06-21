const { MessageEmbed } = require("discord.js");
const { AwardPoints, GetUserData } = require("../../utils/coin");
const numeral = require("numeral");

module.exports = {
  name: ["flip", "coinflip"],
  description: "flip a coin",
  usage: `${process.env.PREFIX}flip <heads/tails> <bet>`,
  async execute(message, args) {
    if (args[0] !== undefined && args[1] !== undefined) {
      var input = args[0].toLowerCase();
      var wager = args[1].toLowerCase() === "all" ? "all" : numeral(numeral(args[1]).format("0.00")).value();
    } else {
      return message.reply(`to play, use this command: ${this.usage}`);
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

    let data = await GetUserData(message.author);
    const balance = data === null ? 0 : +data.coins.toString();
    if (wager === "all") wager = balance;

    if (wager > balance) {
      return message.reply(`insufficient balance! Your balance is **${numeral(balance).format("$0,0.00")}**.`);
    } else if (wager < 0.01) {
      return message.reply(`you must bet more than $0!`);
    }

    const flipEmbed = new MessageEmbed()
      .setTitle("🪙 Coin Flip")
      .setFooter(message.member.displayName, message.member.user.avatarURL({ format: "png", dynamic: true, size: 2048 }))
      .setTimestamp();

    const flip = Math.round(Math.random());

    if (input == flip) {
      var end = "**You won!** ";
      flipEmbed.setColor("#2bff00");
      flipEmbed.addField("**Net Gain**", numeral(wager).format("$0,0.00"), true);
      flipEmbed.addField("**Balance**", numeral(balance + wager).format("$0,0.00"), true);
      AwardPoints(message.author, wager);
    } else {
      var end = "**You lost!** ";
      flipEmbed.setColor("#ff0000");
      flipEmbed.addField("**Net Gain**", numeral(-wager).format("$0,0.00"), true);
      flipEmbed.addField("**Balance**", numeral(balance - wager).format("$0,0.00"), true);
      AwardPoints(message.author, -wager);
    }

    const str = flip == 0 ? end + `The coin landed on **heads**!` : end + `The coin landed on **tails**!`;

    flipEmbed.setDescription(str);

    message.channel.send(flipEmbed);
  },
};
