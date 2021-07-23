const reminderSchema = require("@schemas/reminder-schema");
const schedule = require("node-schedule");

async function loadReminders(client) {
  const entries = await reminderSchema.find();

  for (const entry of entries) {
    // if the reminder hasn't already passed
    if (entry.date.getTime() > Date.now()) {
      const channel = await client.channels.fetch(entry.channelId);
      const message = await channel.messages.fetch(entry._id);

      schedule.scheduleJob(entry.date, () => {
        message.reply(entry.message);
        deleteReminder(entry._id);
      });
    } else {
      deleteReminder(entry._id);
    }
  }
}

async function saveReminder(data) {
  const { id, channelId, date, message } = data;
  await reminderSchema.findByIdAndUpdate(
    id,
    {
      channelId,
      date,
      message,
    },
    {
      upsert: true,
    }
  );
}

async function deleteReminder(id) {
  await reminderSchema.findByIdAndDelete(id);
}

module.exports = {
  loadReminders,
  saveReminder,
  deleteReminder,
};
