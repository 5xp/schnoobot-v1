const helper = require("../../utils/helper.js");
const { MessageAttachment } = require("discord.js");
module.exports = {
  name: "eval",
  async execute(message, args) {
    if (message.author.id !== process.env.OWNERID) {
      return;
    }
    try {
      let code = helper.JoinArgs(args);
      let evaled = await eval(code);
      if (typeof evaled !== "string") evaled = require("util").inspect(evaled);
      let cleaned = clean(evaled);

      if (cleaned.length > 2000) {
        const buffer = Buffer.from(cleaned, "utf-8");
        const attachment = new MessageAttachment(buffer, "response.xl");
        message.reply({ files: [attachment], allowedMentions: { repliedUser: false } });
      } else {
        message.reply({ content: `\`\`\`xl\n${cleaned}\`\`\``, allowedMentions: { repliedUser: false } });
      }
    } catch (err) {
      message.reply({ content: `\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``, allowedMentions: { repliedUser: false } });
    }
  },
};
function clean(text) {
  if (typeof text === "string") return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
  else return text;
}
