const helper = require("../utils/helper.js");
const { MesageAttachment, MessageAttachment } = require("discord.js");
module.exports = {
  name: "eval",
  description: "eval",
  category: "Bot owner",
  execute(message, args) {
    if (message.author.id !== process.env.OWNERID) {
      return;
    }
    try {
      let code = helper.JoinArgs(args);
      let evaled = eval(code);
      if (typeof evaled !== "string") evaled = require("util").inspect(evaled);
      let cleaned = clean(evaled);

      if (cleaned.length > 2000) {
        const buffer = Buffer.from(cleaned, "utf-8");
        const attachment = new MessageAttachment(buffer, "response.xl");
        message.channel.send(attachment);
      } else {
        message.channel.send(cleaned, { code: "xl" });
      }
    } catch (err) {
      message.channel.send(`\`ERROR\` \`\`\`xl\n${clean(err)}\n\`\`\``);
    }
  },
};
function clean(text) {
  if (typeof text === "string") return text.replace(/`/g, "`" + String.fromCharCode(8203)).replace(/@/g, "@" + String.fromCharCode(8203));
  else return text;
}
