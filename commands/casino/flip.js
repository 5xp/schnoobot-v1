const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");
const { awardMoney, getBalance, formatMoney, formatWager } = require("@utils/economy");

module.exports = {
  name: ["flip", "coinflip"],
  description: "flip a coin",
  usage: `${process.env.PREFIX}flip <heads/tails> <bet>`,
  slash: true,
  options: [
    {
      name: "face",
      type: "STRING",
      description: "heads or tails",
      required: true,
      choices: [
        { name: "heads", value: "heads" },
        { name: "tails", value: "tails" },
      ],
    },
    {
      name: "bet",
      type: "STRING",
      description: "your wager on this bet",
      required: true,
    },
  ],
  async execute(interaction, args) {
    const isSlash = interaction.isCommand?.() || interaction.isInteraction;
    const user = isSlash ? interaction.user : interaction.author;

    let input, wager, value;

    if (interaction.newGame) {
      ({ input, wager } = interaction);
    } else if (isSlash) {
      input = interaction.options.getString("face");
      wager = formatWager(interaction.options.getString("bet"));
    } else if (args[0] && args[1]) {
      input = args[0].toLowerCase();
      wager = formatWager(args[1]);
    } else {
      return interaction.reply(`⚠ **To play, use this command: \`${module.exports.usage}\`**`);
    }

    switch (input) {
      case "h":
      case "heads":
        value = 0;
        break;
      case "t":
      case "tails":
        value = 1;
        break;
      default:
        return interaction.reply({ content: "⚠ **You must pick heads or tails.**" });
    }

    const balance = await getBalance(user.id);
    if (wager === "all") wager = balance;

    if (wager > balance) {
      return interaction.reply({
        content: `🚫 **Insufficient balance! Your balance is ${formatMoney(balance)}**.`,
        ephemeral: true,
      });
    } else if (wager < 0.01) {
      return interaction.reply({ content: `🚫 **You must bet more than $0.00.**`, ephemeral: true });
    }

    const flipEmbed = new MessageEmbed()
      .setTitle("🪙 Coin Flip")
      .setFooter(user.username, user.avatarURL({ format: "png", dynamic: true, size: 2048 }))
      .setTimestamp();

    const flip = Math.round(Math.random());
    const won = value === flip;

    let end;
    if (won) {
      end = "**You won!** ";
      flipEmbed.setColor("#2bff00");
      flipEmbed.addField("**Net Gain**", formatMoney(wager), true);
      flipEmbed.addField("**Balance**", formatMoney(balance + wager), true);
      awardMoney(user.id, wager);
    } else {
      end = "**You lost!** ";
      flipEmbed.setColor("#ff0000");
      flipEmbed.addField("**Net Gain**", formatMoney(-wager), true);
      flipEmbed.addField("**Balance**", formatMoney(balance - wager), true);
      awardMoney(user.id, -wager);
    }

    const outcome = flip === 0 ? end + `The coin landed on **heads**!` : end + `The coin landed on **tails**!`;

    flipEmbed.setDescription(outcome);

    const playAgainButton = new MessageButton({ style: "PRIMARY", label: "Play again", customId: "playAgain" });
    const martingaleButton = new MessageButton({
      style: "DANGER",
      label: "Play again (2x bet)",
      customId: "martingale",
    });

    const buttonRow = () => {
      const row = new MessageActionRow().addComponents([playAgainButton]);
      if (!won) row.addComponents([martingaleButton]);
      return row;
    };

    const reply = await interaction.reply({
      embeds: [flipEmbed],
      components: [buttonRow()],
      allowedMentions: { repliedUser: false },
      fetchReply: true,
    });

    const i = await reply.awaitMessageComponent({ filter: i => i.user.id === user.id, time: 10000 }).catch(() => {
      // ignore error
    });

    playAgainButton.setDisabled();
    martingaleButton.setDisabled();
    reply.edit({ components: [buttonRow()] });

    if (i) {
      i.originalBet = interaction.originalBet ?? wager;
      i.newGame = true;
      i.wager = won ? i.originalBet : wager;
      i.input = input;

      if (i.customId === "martingale") {
        i.wager *= 2;
      }

      if (isSlash) {
        i.isInteraction = true;
        i.options = interaction.options;
        module.exports.execute(i);
      } else {
        i.author = interaction.author;
        module.exports.execute(i, args);
      }
    }
  },
};
