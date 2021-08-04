const crypto = require("crypto");
const { MessageEmbed } = require("discord.js");
const numeral = require("numeral");
const { awardMoney, getBalance, formatMoney, formatWager, toNumber } = require("@utils/economy");

module.exports = {
  name: "limbo",
  description: "pick a target multiplier and if it lands higher than your target, you win",
  usage: `${process.env.PREFIX}limbo <target> <bet>`,
  slash: true,
  options: [
    { name: "target", type: "STRING", description: "your target multiplier", required: true },
    { name: "bet", type: "STRING", description: "your wager on this bet", required: true },
  ],
  async execute(interaction, args) {
    const isSlash = interaction.isCommand?.();
    let input, wager, user;

    if (isSlash) {
      input = toNumber(interaction.options.getString("target"));
      wager = formatWager(interaction.options.getString("bet"));
      user = interaction.user;
    } else {
      user = interaction.author;
      if (args[0] && args[1]) {
        input = toNumber(args[0]);
        wager = formatWager(args[1]);
      } else {
        return interaction.reply(`⚠ **To play, use this command: \`${module.exports.usage}\`**`);
      }
    }

    if (input <= 1) {
      return interaction.reply({ content: `⚠ **Your target payout must be greater than 1.00x.**`, ephemeral: true });
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

    const point = generatePoint();

    const limboEmbed = new MessageEmbed()
      .setTitle("📈 Limbo")
      .setDescription(`Multiplier: **${point.toFixed(2)}x**`)
      .addField("**Target Multipler**", input.toFixed(2) + "x", true)
      .addField("**Bet**", formatMoney(wager), true)
      .addField("**Win Chance**", numeral(1 / input).format("0.00%"), true)
      .setFooter(user.username, user.avatarURL({ format: "png", dynamic: true, size: 2048 }))
      .setTimestamp();

    if (input <= point) {
      const profit = wager * (input - 1);
      limboEmbed.setColor("#2bff00");
      limboEmbed.addField("**Net Gain**", formatMoney(profit), true);
      limboEmbed.addField("**Balance**", formatMoney(balance + profit), true);
      awardMoney(user.id, profit);
    } else {
      limboEmbed.setColor("#ff0000");
      limboEmbed.addField("**Net Gain**", formatMoney(-wager), true);
      limboEmbed.addField("**Balance**", formatMoney(balance - wager), true);
      awardMoney(user.id, -wager);
    }
    interaction.reply({ embeds: [limboEmbed], allowedMentions: { repliedUser: false } });
  },
};

function generatePoint() {
  const hex = crypto.randomBytes(32).toString("hex");

  const h = parseInt(hex.slice(0, 52 / 4), 16);
  const e = Math.pow(2, 52);

  return Math.floor((100 * e) / (e - h)) / 100;
}
