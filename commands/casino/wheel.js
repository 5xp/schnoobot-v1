const { MessageEmbed } = require("discord.js");
const { AwardPoints, GetUserData } = require("../../utils/coin");
const numeral = require("numeral");
const INPUT_TYPES = ["red", "black", "even", "odd", "low", "high", "number"];
const DIGIT = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

module.exports = {
  name: ["wheel", "roulette"],
  description: "roulette wheel",
  usage: `${process.env.PREFIX}wheel <bet type> <wager>\nbet types: red, black, even, odd, high, low, green, <number>`,
  async execute(message, args) {
    if (args[0] !== undefined && args[1] !== undefined) {
      var input = args[0].toLowerCase();
      var wager = args[1].toLowerCase() === "all" ? "all" : numeral(numeral(args[1]).format("0.00")).value();
    } else {
      return message.reply(`to play, use this command: \`${module.exports.usage}\``);
    }

    input = input == "green" ? 0 : input;

    let type = isNaN(+input) ? input : "number";

    if (!INPUT_TYPES.includes(type) || (type == "number" && (input > 36 || input < 0 || !Number.isInteger(+input)))) {
      return message.reply(`to play, use this command: \`${module.exports.usage}\``);
    }

    const data = await GetUserData(message.author);
    const balance = data === null ? 0 : +data.coins.toString();
    if (wager === "all") wager = balance;

    if (wager > balance) {
      return message.reply(`insufficient balance! Your balance is **${numeral(balance).format("$0,0.00")}**.`);
    } else if (wager < 0.01) {
      return message.reply(`you must bet more than $0!`);
    }

    const roll = new Roll(input);
    const wheelEmbed = new MessageEmbed()
      .setTitle("💸 Roulette Wheel")
      .setFooter(message.member.displayName, message.member.user.avatarURL({ format: "png", dynamic: true, size: 2048 }))
      .setTimestamp();

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
    message.reply({ embeds: [wheelEmbed], allowedMentions: { repliedUser: false } });
  },
};

class Roll {
  constructor(input) {
    this.num = Math.floor(Math.random() * 37);
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
