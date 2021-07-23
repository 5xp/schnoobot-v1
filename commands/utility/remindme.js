const chrono = require("chrono-node");
const schedule = require("node-schedule");
const { saveReminder, deleteReminder } = require("@utils/reminder");

module.exports = {
  name: ["remindme", "remind"],
  description: "set a reminder for later",
  slash: true,
  options: [
    {
      name: "time",
      type: "STRING",
      description: `accepts relative or absolute time (example: "in an hour, tomorrow, at 5 pm")`,
      required: true,
    },
    {
      name: "reason",
      type: "STRING",
      description: "the reason you want to be reminded",
      required: false,
    },
  ],
  async execute(interaction, args, content) {
    const isSlash = interaction.isCommand?.();
    const inGuild = !!interaction.guild;
    let reason, user;

    const time = isSlash ? interaction.options.get("time").value : content;
    const result = chrono.parse(time);

    if (!result.length) {
      return interaction.reply({ content: "🚫 **Failed to parse your message!**", ephemeral: true });
    }

    const date = result[0]?.start?.date?.();

    if (isSlash) {
      reason = interaction.options.get("reason").value;
      user = interaction.user;
    } else {
      reason = content.replace(result?.[0].text, "").trim();
      user = interaction.author;
    }

    reason = reason.startsWith("to") || !reason.length ? reason : `to ${reason}`;
    let reminderMessage = reason ? `Reminder **${reason}**!` : "Reminder!";
    reminderMessage = user.toString().concat(" ", reminderMessage);

    schedule.scheduleJob(date, () => {
      isSlash ? interaction.followUp(reminderMessage) : interaction.reply(reminderMessage);
      deleteReminder(interaction.id);
    });

    await interaction.defer?.();
    const msg = isSlash
      ? await interaction.editReply(`**Set a reminder for <t:${unixTime(date)}> ${reason}!**`)
      : await interaction.reply(`**Set a reminder for <t:${unixTime(date)}> ${reason}!**`);

    saveReminder({
      id: isSlash ? msg.id : interaction.id,
      inGuild,
      channelId: interaction.channel.id,
      date,
      message: reminderMessage,
    });
  },
};

const unixTime = date => Math.floor(date.getTime() / 1000);
