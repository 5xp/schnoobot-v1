const { MessageEmbed } = require("discord.js");
const { awardMoney, getBalance, formatMoney, formatWager } = require("@utils/economy");
const validTypes = ["red", "black", "even", "odd", "low", "high", "number"];
const longDigits = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

module.exports = {
  name: ["wheel", "roulette"],
  description: "roulette wheel",
  usage: `${process.env.PREFIX}wheel <bet type> <wager>\nbet types: red, black, even, odd, high, low, green, <number>`,
  async execute(message, args) {
    let input, wager;
    if (args[0] && args[1]) {
      input = args[0].toLowerCase();
      wager = formatWager(args[1]);
    } else {
      return message.reply(`⚠ To play, use this command: \`${module.exports.usage}\``);
    }

    if (input === "green") input = 0;

    const type = isNaN(+input) ? input : "number";

    input = type === "number" ? Math.floor(+input) : input;

    if (type === "number" ? input < 0 || input > 36 : !validTypes.includes(type)) {
      console.log({ type });
      return message.reply(`⚠ To play, use this command: \`${module.exports.usage}\``);
    }

    const balance = await getBalance(message.author.id);
    if (wager === "all") wager = balance;

    if (wager > balance) {
      return message.reply({
        content: `🚫 **Insufficient balance. Your balance is ${formatMoney(balance)}.**`,
        ephemeral: true,
      });
    } else if (wager < 0.01) {
      return message.reply({ content: `🚫 **You must bet more than $0.00.**`, ephemeral: true });
    }

    const roll = new Roll(input);
    const wheelEmbed = new MessageEmbed()
      .setTitle("💸 Roulette Wheel")
      .setFooter(
        message.member.displayName,
        message.member.user.avatarURL({ format: "png", dynamic: true, size: 2048 })
      )
      .setTimestamp();

    if (roll[type][0]) {
      wheelEmbed.setColor("#2bff00");
      wheelEmbed.addField("**Net Gain**", formatMoney(balance + wager * roll[type][1]), true);
      wheelEmbed.addField("**Balance**", formatMoney(balance + wager * roll[type][1]), true);
      awardMoney(message.author.id, wager * roll[type][1]);
    } else {
      wheelEmbed.setColor("#ff0000");
      wheelEmbed.addField("**Net Gain**", formatMoney(-wager), true);
      wheelEmbed.addField("**Balance**", formatMoney(balance - wager), true);
      awardMoney(message.author.id, -wager);
    }
    const clr = roll.color !== "red" && roll.color !== "black" ? "🟢" : roll.color == "red" ? "🔴" : "⚫";
    const digits =
      roll.num < 10
        ? `:${longDigits[+roll.num.toString()[0]]}:`
        : `:${longDigits[+roll.num.toString()[0]]}::${longDigits[+roll.num.toString()[1]]}:`;
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
