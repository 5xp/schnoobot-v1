const { getUserData, checkDailyAvailable, formatMoney } = require("@utils/economy");
const { findMember } = require("@utils/helper");
const { MessageEmbed, MessageButton } = require("discord.js");
const economySchema = require("@schemas/economy-schema");

module.exports = {
  name: ["balance", "bal"],
  description: "get your balance",
  usage: `${process.env.PREFIX}balance\n${process.env.PREFIX}balance <@member?>\n${process.env.PREFIX}balance top`,
  slash: true,
  options: [
    {
      name: "user",
      type: "SUB_COMMAND",
      description: "get the balance of yourself or another user",
      options: [{ name: "user", type: "USER", description: "get the balance of a specific user", required: false }],
    },
    { name: "top", type: "SUB_COMMAND", description: "get the top balances" },
  ],
  async execute(interaction, args) {
    const isSlash = interaction.isCommand?.();

    if (args?.[0] === "top" || interaction?.options?.getSubcommand() === "top") {
      await interaction.deferReply?.();

      const res = await economySchema.find().sort({ coins: -1 });
      const sortedIndex = res.filter(entry => entry.coins > 0);

      const maxEntries = 10;
      let currentPage = 0;
      const numPages = Math.ceil(sortedIndex.length / maxEntries);

      const createFields = () => {
        const j = Math.min(maxEntries, sortedIndex.length - maxEntries * currentPage);
        const shallowIndex = sortedIndex.slice(currentPage * maxEntries, currentPage * maxEntries + j);

        const field1 = { name: "User", value: "", inline: true };
        const field2 = { name: "Balance", value: "", inline: true };

        for (let i = 0; i < shallowIndex.length; i++) {
          const index = `**#${currentPage * maxEntries + i + 1}**: <@${shallowIndex[i]._id}>\n`;
          const bal = `*${formatMoney(shallowIndex[i].coins)}*\n`;
          field1.value += index;
          field2.value += bal;
        }
        return [field1, field2];
      };

      const balanceTopEmbed = () => {
        return new MessageEmbed()
          .setColor("#80ff80")
          .addFields(createFields())
          .setFooter(`Page ${currentPage + 1}/${numPages}`);
      };

      const msgObject = () => {
        const leftButton = new MessageButton().setEmoji("◀").setStyle("PRIMARY").setCustomId("left");
        const rightButton = new MessageButton().setEmoji("▶").setStyle("PRIMARY").setCustomId("right");

        if (currentPage === numPages - 1) rightButton.setDisabled();
        if (currentPage === 0) leftButton.setDisabled();

        return { components: [{ type: 1, components: [leftButton, rightButton] }], embeds: [balanceTopEmbed()] };
      };

      const msg = isSlash ? await interaction.editReply(msgObject()) : await interaction.reply(msgObject());

      const filter = i => i.user.id === (isSlash ? interaction.user.id : interaction.author.id);
      const collector = msg.createMessageComponentCollector({ filter, time: 30000 });

      collector.on("collect", button => {
        if (button.customId === "right") {
          currentPage++;
          currentPage = Math.min(currentPage, numPages - 1);
          button.update(msgObject());
        } else {
          currentPage--;
          currentPage = Math.max(currentPage, 0);
          button.update(msgObject());
        }
      });
    } else {
      const member = isSlash
        ? interaction.options.getUser("user") ?? interaction.user
        : !args.length
        ? interaction.member
        : await findMember(args[0], interaction);

      const user = isSlash ? member : member?.user;

      if (!user) return interaction.reply("🚫 **Could not find this user.**");

      const res = await getUserData(user.id);
      const { coins: balance = 0, lastdaily: lastDaily = 0, dailystreak: dailyStreak = 0 } = res;

      const dailyAvailable = checkDailyAvailable(lastDaily);
      const timestamp = Math.floor((Date.now() + dailyAvailable) / 1000);
      const dailystr = dailyAvailable === true ? "now" : `<t:${timestamp}:R>\n<t:${timestamp}:t>`;

      const balanceEmbed = new MessageEmbed()
        .setColor("#0000FF")
        .setAuthor(`${user.username}'s balance`, user.avatarURL())
        .addField("**Balance**", formatMoney(balance), true)
        .addField("**Daily Available**", dailystr, true)
        .addField("**Streak**", `${dailyStreak || 0}🔥`, true);

      interaction.reply({ embeds: [balanceEmbed], allowedMentions: { repliedUser: false } });
    }
  },
};
