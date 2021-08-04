const { MessageEmbed } = require("discord.js");
const { awardMoney, getBalance, formatMoney, formatWager } = require("@utils/economy");

module.exports = {
  name: ["flip", "coinflip"],
  description: "flip a coin",
  usage: `${process.env.PREFIX}flip <heads/tails> <bet>`,
  async execute(message, args) {
    let input, wager;
    if (args[0] && args[1]) {
      input = args[0].toLowerCase();
      wager = formatWager(args[1]);
    } else {
      return message.reply(`⚠ **To play, use this command: \`${module.exports.usage}\`**`);
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
        return message.reply({ content: "⚠ **You must pick heads or tails.**", ephemeral: true });
    }

    const balance = await getBalance(message.author.id);
    if (wager === "all") wager = balance;

    if (wager > balance) {
      return message.reply({
        content: `🚫 **Insufficient balance! Your balance is ${formatMoney(balance)}**.`,
        ephemeral: true,
      });
    } else if (wager < 0.01) {
      return message.reply({ content: `🚫 **You must bet more than $0.00.**`, ephemeral: true });
    }

    const flipEmbed = new MessageEmbed()
      .setTitle("🪙 Coin Flip")
      .setFooter(
        message.member.displayName,
        message.member.user.avatarURL({ format: "png", dynamic: true, size: 2048 })
      )
      .setTimestamp();

    const flip = Math.round(Math.random());

    let end;
    if (input == flip) {
      end = "**You won!** ";
      flipEmbed.setColor("#2bff00");
      flipEmbed.addField("**Net Gain**", formatMoney(wager), true);
      flipEmbed.addField("**Balance**", formatMoney(balance + wager), true);
      awardMoney(message.author.id, wager);
    } else {
      end = "**You lost!** ";
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
