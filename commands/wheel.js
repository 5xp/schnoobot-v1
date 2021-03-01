const { MessageEmbed } = require("discord.js");
const { AwardPoints, GetUserData } = require("../utils/coin");
const numeral = require("numeral");
const INPUT_TYPES = ["red", "black", "even", "odd", "low", "high", "number"];
const DIGIT = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

module.exports = {
  name: "wheel",
  description: "roulette wheel",
  alias: ["roulette"],
  category: "Fun",
  usage: `\`${process.env.PREFIX}wheel <bet type> <wager>\`\n
  bet types: \`red\`, \`black\`, \`even\`, \`odd\`, \`high\`, \`low\`, \`green\`, \`<number>\``,
  async execute(message, args) {
    let input = args[0] ? args[0].toLowerCase() : null;
    input = input == "green" ? 0 : input;
    let type = isNaN(+input) ? input : "number";

    let wager = numeral(numeral(args[1]).format("0.00")).value();

    if (!INPUT_TYPES.includes(type) || (type == "number" && (input > 36 || input < 0 || !Number.isInteger(+input)))) {
      return message.reply("input a valid bet type!");
    }

    const data = await GetUserData(message.author);
    const balance = +data.coins.toString();

    if (wager > balance) {
      return message.reply(`insufficient balance! Your balance is **${numeral(balance).format("$0,0.00")}**.`);
    } else if (wager < 0.01) {
      return message.reply(`you must bet more than $0!`);
    }

    const roll = new Roll(input);
    const wheelEmbed = new MessageEmbed().setTitle("💸Roulette Wheel");

    if (roll[type][0]) {
      wheelEmbed.setColor("#2bff00");
      wheelEmbed.addField("**Net Gain**", numeral(wager * roll[type][1]).format("$0,0.00"), true);
      wheelEmbed.addField("**Balance**", numeral(balance + wager * roll[type][1]).format("$0,0.00"), true);
      AwardPoints(message.author, wager * roll[type][1]);
    } else {
      wheelEmbed.setColor("#ff0000");
      wheelEmbed.addField("**Net Gain**", numeral(-wager).format("$0,0.00"), true);
      wheelEmbed.addField("**Balance**", numeral(balance - wager).format("$0,0.00"), true);
      AwardPoints(message.author, -wager);
    }
    const clr = roll.color !== "red" && roll.color !== "black" ? "🟢" : roll.color == "red" ? "🔴" : "⚫";
    const digits = roll.num < 10 ? `:${DIGIT[+roll.num.toString()[0]]}:` : `:${DIGIT[+roll.num.toString()[0]]}: :${DIGIT[+roll.num.toString()[1]]}:`;
    const str = `${clr} ${digits}`;

    wheelEmbed.setDescription(str);
    message.channel.send(wheelEmbed);
  },
};

class Roll {
  constructor(input) {
    this.num = Math.round(Math.random() * 36);
    this.input = input;
  }
  get color() {
    return this.GetPocketColor(this.num);
  }
  get red() {
    return [this.color == "red", 1];
  }
  get black() {
    return [this.color == "black", 1];
  }
  get even() {
    return [this.num !== 0 && this.num % 2 == 0, 1];
  }
  get odd() {
    return [this.num !== 0 && this.num % 2 !== 0, 1];
  }
  get low() {
    return [this.num !== 0 && this.num <= 18, 1];
  }
  get high() {
    return [this.num >= 19, 1];
  }
  get number() {
    return [this.num == this.input, 35];
  }
  GetPocketColor(number) {
    if (number == 0) return "green";
    else if (number >= 1 && number <= 10) return number % 2 == 0 ? "black" : "red";
    else if (number >= 11 && number <= 18) return number % 2 == 0 ? "red" : "black";
    else if (number >= 19 && number <= 28) return number % 2 == 0 ? "black" : "red";
    else if (number >= 29 && number <= 36) return number % 2 == 0 ? "red" : "black";
  }
}
