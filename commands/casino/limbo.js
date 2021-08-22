const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");
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
    const isSlash = interaction.isCommand?.() || interaction.isInteraction;
    const user = isSlash ? interaction.user : interaction.author;
    let target, wager;

    if (interaction.newGame) {
      ({ target, wager } = interaction);
    } else if (isSlash) {
      target = toNumber(interaction.options.getString("target"));
      wager = formatWager(interaction.options.getString("bet"));
    } else if (args[0] && args[1]) {
      target = toNumber(args[0]);
      wager = formatWager(args[1]);
    } else {
      return interaction.reply(`⚠ **To play, use this command: \`${module.exports.usage}\`**`);
    }

    if (target <= 1) {
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

    const profit = wager * (target - 1);

    const point = generatePoint();

    const won = target <= point;

    const limboEmbed = new MessageEmbed()
      .setTitle("📈 Limbo")
      .setDescription(`Multiplier: **${point.toFixed(2)}x**`)
      .addField("**Target Multipler**", target.toFixed(2) + "x", true)
      .addField("**Bet**", formatMoney(wager), true)
      .addField("**Win Chance**", numeral(1 / target).format("0.00%"), true)
      .setFooter(user.username, user.avatarURL({ format: "png", dynamic: true, size: 2048 }))
      .setTimestamp();

    if (won) {
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

    const mult = target / (target - 1);

    const playAgainButton = new MessageButton({ style: "PRIMARY", label: "Play again", customId: "playAgain" });
    const martingaleButton = new MessageButton({
      style: "DANGER",
      label: `Play again (${mult.toFixed(2)}x bet)`,
      customId: "martingale",
    });

    const buttonRow = () => {
      const row = new MessageActionRow().addComponents([playAgainButton]);
      if (!won) row.addComponents([martingaleButton]);
      return row;
    };

    const reply = await interaction.reply({
      embeds: [limboEmbed],
      components: [buttonRow()],
      allowedMentions: { repliedUser: false },
      fetchReply: true,
    });

    const i = await reply.awaitMessageComponent({ filter: i => i.user.id === user.id, time: 10000 }).catch(() => {
      // ignore error
    });

    playAgainButton.setDisabled();
    martingaleButton.setDisabled();

    if (i) {
      i.originalBet = interaction.originalBet ?? wager;
      i.newGame = true;
      i.wager = won ? i.originalBet : wager;
      i.target = target;

      if (i.customId === "martingale") {
        i.wager *= mult;
      }

      if (isSlash) {
        i.isInteraction = true;
        i.options = interaction.options;
        module.exports.execute(i);
      } else {
        i.author = interaction.author;
        module.exports.execute(i);
      }
    } else {
      playAgainButton.setStyle("SECONDARY");
      martingaleButton.setStyle("SECONDARY");
    }

    reply.edit({ components: [buttonRow()] });
  },
};

function generatePoint() {
  const point = 1 / Math.random();

  // truncate to 2 decimals
  return Math.floor(point * 100) / 100;
}
