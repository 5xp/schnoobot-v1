const { MessageEmbed } = require("discord.js");
const { GetBalance, AwardPoints } = require("../utils/coin");
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

    if (!wager || !input) {
      message.reply(`to play, use this command: ${this.usage}`);
      return;
    }

    GetBalance(message.author).then(balance => {
      balance = +balance.toString();
      if (wager > balance) {
        message.reply(`insufficient balance! Your balance is **${numeral(balance).format("$0,0.00")}**.`);
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
        outcome["balance"] = numeral(balance + wager).format("$0,0.00");
        outcome["winnings"] = numeral(wager).format("$0,0.00");
        AwardPoints(message.author, wager);
      } else {
        outcome["color"] = "#ff0000";
        outcome["balance"] = numeral(balance - wager).format("$0,0.00");
        outcome["winnings"] = numeral(wager * -1).format("$0,0.00");
        AwardPoints(message.author, -wager);
      }
      outcome["str"] = flip == 0 ? `The coin landed on **heads**!` : `The coin landed on **tails**!`;

      const flipEmbed = new MessageEmbed()
        .setColor(outcome.color)
        .setTitle("🪙 Coin Flip")
        .setDescription(outcome.str)
        .addField("**Net Gain**", outcome.winnings, true)
        .addField("**Balance**", outcome.balance, true);
      message.channel.send(flipEmbed);
    }
  },
};
