const { MessageEmbed } = require("discord.js");
const { awardMoney, getBalance, formatMoney, formatWager } = require("@utils/economy");
const validTypes = ["red", "black", "even", "odd", "low", "high", "number"];
const longDigits = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];

module.exports = {
  name: ["wheel", "roulette"],
  description: "roulette wheel",
  usage: `${process.env.PREFIX}wheel <bet type> <wager>\nbet types: red, black, even, odd, high, low, green, <number>`,
  slash: true,
  options: [
    {
      name: "red",
      description: "win if it lands on red",
      type: "SUB_COMMAND",
      options: [{ name: "bet", type: "STRING", description: "your wager on this bet", required: true }],
    },
    {
      name: "black",
      description: "win if it lands on black",
      type: "SUB_COMMAND",
      options: [{ name: "bet", type: "STRING", description: "your wager on this bet", required: true }],
    },
    {
      name: "even",
      description: "win if it lands on an even number (not including 0)",
      type: "SUB_COMMAND",
      options: [{ name: "bet", type: "STRING", description: "your wager on this bet", required: true }],
    },
    {
      name: "odd",
      description: "win if it lands on an odd number (not including 0)",
      type: "SUB_COMMAND",
      options: [{ name: "bet", type: "STRING", description: "your wager on this bet", required: true }],
    },
    {
      name: "high",
      description: "win if it land on a high number",
      type: "SUB_COMMAND",
      options: [{ name: "bet", type: "STRING", description: "your wager on this bet", required: true }],
    },
    {
      name: "low",
      description: "win if it lands on a low number (not including 0)",
      type: "SUB_COMMAND",
      options: [{ name: "bet", type: "STRING", description: "your wager on this bet", required: true }],
    },
    {
      name: "green",
      description: "win if it lands on green",
      type: "SUB_COMMAND",
      options: [{ name: "bet", type: "STRING", description: "your wager on this bet", required: true }],
    },
    {
      name: "straight-up",
      description: "win if it lands on a specific number",
      type: "SUB_COMMAND",
      options: [
        { name: "number", type: "INTEGER", description: "the number to bet on", required: true },
        { name: "bet", type: "STRING", description: "your wager on this bet", required: true },
      ],
    },
  ],
  async execute(interaction, args) {
    const isSlash = interaction.isCommand?.();
    const user = isSlash ? interaction.user : interaction.author;

    let input, wager;

    if (isSlash) {
      input = interaction.options.getSubcommand();
      if (input === "straight-up") input = interaction.options.getInteger("number");
      wager = formatWager(interaction.options.getString("bet"));
    } else if (args[0] && args[1]) {
      input = args[0].toLowerCase();
      wager = formatWager(args[1]);
    } else {
      return interaction.reply(`⚠ **To play, use this command: \`${module.exports.usage}\`**`);
    }

    if (input === "green") input = 0;

    const type = isNaN(+input) ? input : "number";

    input = type === "number" ? Math.floor(+input) : input;

    if (type === "number" && (input < 0 || input > 36)) {
      return interaction.reply({ content: `⚠ **Number must be between 0 and 36.**`, ephemeral: true });
    }

    if (!validTypes.includes(type)) {
      return interaction.reply({
        content: `⚠ **To play, use this command: \`${module.exports.usage}\`**`,
        ephemeral: true,
      });
    }

    const balance = await getBalance(user.id);
    if (wager === "all") wager = balance;

    if (wager > balance) {
      return interaction.reply({
        content: `🚫 **Insufficient balance. Your balance is ${formatMoney(balance)}.**`,
        ephemeral: true,
      });
    } else if (wager < 0.01) {
      return interaction.reply({ content: `🚫 **You must bet more than $0.00.**`, ephemeral: true });
    }

    const roll = new Roll(input);
    const wheelEmbed = new MessageEmbed()
      .setTitle("💸 Roulette Wheel")
      .setFooter(
        interaction.member.displayName,
        interaction.member.user.avatarURL({ format: "png", dynamic: true, size: 2048 })
      )
      .setTimestamp();

    if (roll[type][0]) {
      wheelEmbed.setColor("#2bff00");
      wheelEmbed.addField("**Net Gain**", formatMoney(wager * roll[type][1]), true);
      wheelEmbed.addField("**Balance**", formatMoney(balance + wager * roll[type][1]), true);
      awardMoney(user.id, wager * roll[type][1]);
    } else {
      wheelEmbed.setColor("#ff0000");
      wheelEmbed.addField("**Net Gain**", formatMoney(-wager), true);
      wheelEmbed.addField("**Balance**", formatMoney(balance - wager), true);
      awardMoney(user.id, -wager);
    }
    const clr = roll.color !== "red" && roll.color !== "black" ? "🟢" : roll.color == "red" ? "🔴" : "⚫";
    const digits =
      roll.num < 10
        ? `:${longDigits[+roll.num.toString()[0]]}:`
        : `:${longDigits[+roll.num.toString()[0]]}::${longDigits[+roll.num.toString()[1]]}:`;
    const str = `${clr} ${digits}`;

    wheelEmbed.setDescription(str);
    interaction.reply({ embeds: [wheelEmbed], allowedMentions: { repliedUser: false } });
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
