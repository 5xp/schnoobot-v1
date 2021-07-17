const { GetUserData, dailyIn } = require("../../utils/coin");
const { FindMember, TimeToString } = require("../../utils/helper");
const numeral = require("numeral");
const { MessageEmbed, MessageButton } = require("discord.js");
const economySchema = require("../../schemas/economy-schema");

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

    if (args?.[0] === "top" || interaction?.options?.has("top")) {
      await interaction.defer?.();
      const sortedIndex = await economySchema.find().sort({ coins: -1 });
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
          const bal = `*${numeral(+shallowIndex[i].coins.toString()).format("$0,00.00")}*\n`;
          field1.value += index;
          field2.value += bal;
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
      const collector = msg.createMessageComponentCollector(filter, { time: 30000 });

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
      const user = isSlash ? interaction.options.get("user")?.options?.get("user")?.user ?? interaction.user : !args.length ? interaction.member.user : FindMember(args[0], interaction).user;

      console.log(interaction.options.get("user")?.options?.get("user")?.user);
      if (!user) {
        return interaction.reply(`To use this command: \`\`${module.exports.usage}\`\``);
      }

      let data = await GetUserData(user);

      let balance = data?.coins ? +data.coins.toString() : "0";
      let lastdaily = data?.lastdaily;
      let streak = data?.dailystreak ? data.dailystreak + "🔥" : "0";

      let dailyAvailable = dailyIn(lastdaily);
      const timestamp = Math.floor((Date.now() + dailyAvailable) / 1000);
      let dailystr = dailyAvailable === true ? "now" : `<t:${timestamp}:R>\n<t:${timestamp}:t>`;

      let balanceEmbed = new MessageEmbed()
        .setColor("#0000FF")
        .setAuthor(`${user.username}'s balance`, user.avatarURL())
        .addField("**Balance**", numeral(balance).format("$0,0.00"), true)
        .addField("**Daily available**", dailystr, true)
        .addField("**Streak**", streak, true);
      interaction.reply({ embeds: [balanceEmbed], allowedMentions: { repliedUser: false } });
    }
  },
};
