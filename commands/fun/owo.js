const owoify = require("owoify-js").default;
module.exports = {
  name: ["owo", "owoify", "uwu"],
  description: "owoify a message",
  async execute(interaction, args, content) {
    interaction.reply({
      content: owoify(content, "uwu") || "🚫 **You must enter text!**",
      allowedMentions: { parse: [], repliedUser: false },
    });
  },
};
