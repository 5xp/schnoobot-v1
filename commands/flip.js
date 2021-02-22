const { MessageEmbed } = require("discord.js");
const { GetBalance, AwardPoints } = require("../utils/coin");
const { TruncateDecimals } = require("../utils/helper");

module.exports = {
  name: "flip",
  description: "flip a coin",
  usage: `\`${process.env.PREFIX}flip <heads/tails> <bet>\``,
  alias: ["coinflip"],
  category: "Fun",
  async execute(message, args) {
    let input = args[0] ? args[0].toLowerCase() : null;

    let wager = TruncateDecimals(+args[1], 2);
    if (!wager || !input) {
      message.reply(`to play, use this command: ${this.usage}`);
      return;
    }

    GetBalance(message.author).then(balance => {
      if (wager > balance) {
        message.reply(`insufficient balance! Your balance is **${balance.toFixed(2)}**.`);
        return;
      } else if (wager < 0.01) {
        message.reply(`you must bet more than 0!`);
        return;
      }
      StartGame(balance);
    });

    function StartGame(balance) {
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

      let flip = Math.round(Math.random());

      let outcome = {};
      if (input == flip) {
        outcome["color"] = "#2bff00";
        outcome["balance"] = TruncateDecimals(balance + wager, 2);
        outcome["winnings"] = wager.toFixed(2);
        AwardPoints(message.author, wager);
      } else {
        outcome["color"] = "#ff0000";
        outcome["balance"] = TruncateDecimals(balance - wager, 2);
        outcome["winnings"] = (wager * -1).toFixed(2);
        AwardPoints(message.author, -wager);
      }
      outcome["str"] = flip == 0 ? `The coin landed on **heads**!` : `The coin landed on **tails**!`;

      const flipEmbed = new MessageEmbed()
        .setColor(outcome.color)
        .setTitle("🪙 Coin Flip")
        .setDescription(outcome.str)
        .addField("**Winnings**", outcome.winnings, true)
        .addField("**Balance**", outcome.balance, true);
      message.channel.send(flipEmbed);
    }
  },
};
