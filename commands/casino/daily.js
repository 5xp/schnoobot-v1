const { getDaily, formatMoney, checkDailyAvailable } = require("@utils/economy");
const { MessageEmbed, MessageButton } = require("discord.js");
const economySchema = require("@schemas/economy-schema");

module.exports = {
  name: "daily",
  description: "get daily reward",
  slash: true,
  options: [
    {
      name: "get",
      type: "SUB_COMMAND",
      description: "get your daily",
    },
    { name: "top", type: "SUB_COMMAND", description: "see the highest daily streaks" },
  ],
  async execute(interaction, args) {
    const isSlash = interaction.isCommand?.();

    if (args?.[0] == "top" || interaction?.options?.getSubCommand() === "top") {
      await interaction.defer?.();
      const sortedIndex = await economySchema.find().sort({ dailystreak: -1 });
      const maxEntries = 10;
      let currentPage = 0;
      const numPages = Math.ceil(sortedIndex.length / maxEntries);

      const createFields = () => {
        const j = Math.min(maxEntries, sortedIndex.length - maxEntries * currentPage);
        const shallowIndex = sortedIndex.slice(currentPage * maxEntries, currentPage * maxEntries + j);

        const field1 = { name: "User", value: "", inline: true };
        const field2 = { name: "Streak", value: "", inline: true };

        for (let i = 0; i < shallowIndex.length; i++) {
          const index = `**#${currentPage * maxEntries + i + 1}**: <@${shallowIndex[i]._id}>\n`;
          const streak = shallowIndex[i].dailystreak || 0;
          field1.value += index;
          field2.value += streak + "\n";
        }
        return [field1, field2];
      };

      const createEmbed = () => {
        return new MessageEmbed()
          .setColor("#80ff80")
          .addFields(createFields())
          .setFooter(`Page ${currentPage + 1}/${numPages}`);
      };

      const leftButton = new MessageButton().setEmoji("◀").setStyle("PRIMARY").setCustomId("left");
      const rightButton = new MessageButton().setEmoji("▶").setStyle("PRIMARY").setCustomId("right");

      const msgObject = () => {
        return { components: [{ type: 1, components: [leftButton, rightButton] }], embeds: [createEmbed()] };
      };

      const msg = isSlash ? await interaction.editReply(msgObject()) : await interaction.reply(msgObject());

      const filter = i => i.user.id === (isSlash ? interaction.user.id : interaction.author.id);
      const collector = msg.createMessageComponentCollector({ filter, time: 30000 });

      collector.on("collect", button => {
        if (button.customId === "right") {
          currentPage++;
          currentPage = Math.min(currentPage, numPages);
          button.update(msgObject());
        } else {
          currentPage--;
          currentPage = Math.max(currentPage, 0);
          button.update(msgObject());
        }
      });
    } else {
      const user = isSlash ? interaction.user : interaction.member.user;
      const { awarded, data } = await getDaily(user.id);
      const { dailystreak: dailyStreak, lastdaily: lastDaily, coins: balance } = data;

      const dailyAvailable = checkDailyAvailable(lastDaily);
      const dailyAvailableTimestamp = Math.floor((Date.now() + dailyAvailable) / 1000);

      const dailyEmbed = new MessageEmbed();

      let fields;
      if (awarded) {
        dailyEmbed.setColor("#fc03d3");

        fields = [
          {
            name: "**Reward**",
            value: formatMoney(1000 * dailyStreak),
            inline: true,
          },
          {
            name: "**New Balance**",
            value: formatMoney(balance),
            inline: true,
          },
          {
            name: "**Streak**",
            value: dailyStreak + "🔥",
            inline: true,
          },
        ];
      } else {
        dailyEmbed.setColor("#ff0000").setDescription("You have already claimed your reward!");

        fields = [
          {
            name: "**Daily Available**",
            value: `<t:${dailyAvailableTimestamp}:R>\n<t:${dailyAvailableTimestamp}:t>`,
            inline: true,
          },
          {
            name: "**Balance**",
            value: formatMoney(balance),
            inline: true,
          },
          {
            name: "**Streak**",
            value: dailyStreak + "🔥",
            inline: true,
          },
        ];
      }

      dailyEmbed
        .addFields(fields)
        .setAuthor("Daily Reward", user.avatarURL({ format: "png", dynamic: true, size: 2048 }));

      interaction.reply({ embeds: [dailyEmbed], allowedMentions: { repliedUser: false } });
    }
  },
};
