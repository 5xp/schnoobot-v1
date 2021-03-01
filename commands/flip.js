const { MessageEmbed } = require("discord.js");
const { AwardPoints, GetUserData } = require("../utils/coin");
const numeral = require("numeral");

module.exports = {
  name: "flip",
  description: "flip a coin",
  usage: `\`${process.env.PREFIX}flip <heads/tails> <bet>\``,
  alias: ["coinflip"],
  category: "Fun",
  async execute(message, args) {
    let input = args[0] ? args[0].toLowerCase() : null;

    let wager = numeral(numeral(args[1]).format("0.00")).value();

    if (!input) {
      message.reply(`to play, use this command: ${this.usage}`);
      return;
    }

    switch (input) {
      case "heads":
        input = 0;
        break;
      case "tails":
        input = 1;
        break;
      default:
        message.reply("you must choose heads or tails!");
        return;
    }

    let data = await GetUserData(message.author);
    let balance = +data.coins.toString();

    if (wager > balance) {
      return message.reply(`insufficient balance! Your balance is **${numeral(balance).format("$0,0.00")}**.`);
    } else if (wager < 0.01) {
      return message.reply(`you must bet more than $0!`);
    }

    const flipEmbed = new MessageEmbed().setTitle("🪙 Coin Flip");

    const flip = Math.round(Math.random());

    if (input == flip) {
      flipEmbed.setColor("#2bff00");
      flipEmbed.addField("**Net Gain**", numeral(wager).format("$0,0.00"), true);
      flipEmbed.addField("**Balance**", numeral(balance + wager).format("$0,0.00"), true);
      AwardPoints(message.author, wager);
    } else {
      flipEmbed.setColor("#ff0000");
      flipEmbed.addField("**Net Gain**", numeral(-wager).format("$0,0.00"), true);
      flipEmbed.addField("**Balance**", numeral(balance - wager).format("$0,0.00"), true);
      AwardPoints(message.author, -wager);
    }

    const str = flip == 0 ? `The coin landed on **heads**!` : `The coin landed on **tails**!`;

    flipEmbed.setDescription(str);

    message.channel.send(flipEmbed);
  },
};
