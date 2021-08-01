const { awardMoney, formatWager, getBalance, formatMoney } = require("@utils/economy");
const { findMember } = require("@utils/helper");
const { MessageEmbed } = require("discord.js");

module.exports = {
  name: "transfer",
  description: "transfer coins",
  usage: `${process.env.PREFIX}transfer <@user> <amount>`,
  slash: true,
  options: [
    { name: "user", type: "USER", description: "the user to transfer money to", required: true },
    { name: "amount", type: "STRING", description: "the amount of money to transfer", required: true },
  ],
  async execute(interaction, args) {
    const isSlash = interaction.isCommand?.();

    let transferAmount = isSlash ? formatWager(interaction.options.getString("amount")) : formatWager(args[1]);

    let transferee = isSlash ? interaction.options.getMember("user") : await findMember(args[0], interaction);

    if (!transferee) {
      interaction.reply(`🚫 **To transfer, use this command: \`${module.exports.usage}\`**`);
      return;
    } else if (interaction.member === transferee) {
      interaction.reply("🚫 **You cannot transfer to yourself.**");
      return;
    }

    const balance = await getBalance(interaction.member.id);
    const transfereeBalance = await getBalance(transferee.id);

    if (transferAmount > balance) {
      return interaction.reply(`insufficient balance! Your balance is **${formatMoney(balance)}**.`);
    } else if (transferAmount < 0.01) {
      return interaction.reply(`you must transfer more than $0!`);
    }

    let transferEmbed = new MessageEmbed()
      .setColor("#00e394")
      .setTitle(`${interaction.member.user.username}'s transfer to ${transferee.user.username}`)
      .addField("**Transfer**", formatMoney(transferAmount), true)
      .addField("**New Balance**", formatMoney(balance - transferAmount), true)
      .addField(`**${transferee.user.username}'s Balance**`, formatMoney(transfereeBalance + transferAmount), true);

    interaction.reply({ embeds: [transferEmbed], allowedMentions: { repliedUser: false } });

    awardMoney(interaction.member.id, -transferAmount);
    awardMoney(transferee.id, transferAmount);
  },
};
