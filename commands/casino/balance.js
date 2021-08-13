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
      name: "view",
      type: "SUB_COMMAND",
      description: "get the balance of yourself or another user",
      options: [{ name: "user", type: "USER", description: "get the balance of a specific user", required: false }],
    },
    {
      name: "top",
      type: "SUB_COMMAND",
      description: "get the top balances",
      options: [
        {
          name: "global",
          type: "BOOLEAN",
          description: "whether to view the global leaderboard or the guild leaderboard",
        },
      ],
    },
  ],
  async execute(interaction, args) {
    const isSlash = interaction.isCommand?.();

    if (args?.[0] === "top" || interaction?.options?.getSubcommand() === "top") {
      await interaction.deferReply?.();

      const res = await economySchema.find().sort({ coins: -1 });
      let leaderboard = res.filter(entry => entry.coins > 0);

      const gettingGlobal = interaction?.options?.getBoolean("global") ?? false;

      if (!gettingGlobal) {
        const members = await interaction.guild.members.fetch();
        leaderboard = leaderboard.filter(entry => members.has(entry._id));
      }

      const maxEntries = 10;
      let currentPage = 0;
      const numPages = Math.ceil(leaderboard.length / maxEntries);

      const createFields = () => {
        const j = Math.min(maxEntries, leaderboard.length - maxEntries * currentPage);
        const shallowIndex = leaderboard.slice(currentPage * maxEntries, currentPage * maxEntries + j);

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
          .setFooter(`Page ${currentPage + 1}/${numPages}`)
          .setTitle(`${gettingGlobal ? "Global" : interaction.guild.name} balance leaderboard`);
      };

      const msgObject = (end = false) => {
        const leftButton = new MessageButton({
          emoji: "875608045416218635",
          style: end ? "SECONDARY" : "PRIMARY",
          customId: "left",
          disabled: end,
        });

        const rightButton = new MessageButton({
          emoji: "875607895482458122",
          style: end ? "SECONDARY" : "PRIMARY",
          customId: "right",
          disabled: end,
        });

        if (currentPage === numPages - 1) rightButton.setDisabled();
        if (currentPage === 0) leftButton.setDisabled();

        return { components: [{ type: 1, components: [leftButton, rightButton] }], embeds: [balanceTopEmbed()] };
      };

      const msg = isSlash ? await interaction.editReply(msgObject()) : await interaction.reply(msgObject());

      const filter = i => i.user.id === (isSlash ? interaction.user.id : interaction.author.id);
      const collector = msg.createMessageComponentCollector({ filter, idle: 20000 });

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

      collector.on("end", () => {
        msg.edit(msgObject(true)).catch(() => {
          // ignore
        });
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
