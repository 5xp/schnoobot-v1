const Discord = require("discord.js");
const helper = require("../helper.js");
const ytdl = require("youtube-dl");
const fs = require("fs");

module.exports = {
  name: "dl",
  alias: ["download", "tiktok", "youtube"],
  description: "download and send videos",
  execute(message, args) {
    if (!args[0]) {
      message.reply(`invalid arguments!`);
      return;
    }

    var ext;
    const url = args[0].replace(/[<>]/g, "");
    const dir = `./temp`;
    var GetPath = () => {
      return `${dir}/output.${ext}`;
    };

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    options = args.length > 1 ? helper.JoinArgs(args.slice(1)).split(", ") : ["--dump-json", "-f best"];

    async function sendMessage() {
      const msg = await message.channel.send("Getting file information...").then(console.log(`${message.author.username} is attempting to download a video from ${url}`.yellow));

      ytdl.getInfo(url, options, function (err, info) {
        if (err) throw err;
        ext = info.ext;
        const video = ytdl(url, options)
          // check for error before we download file
          .on("error", function error(error) {
            message.reply(error.stderr);
            console.log(error);
          })
          .on("info", function (info) {
            msg.edit("Downloading file...");
          })
          .pipe(fs.createWriteStream(GetPath()))

          // wait to send after it finishes downloading
          .on("close", function () {
            let sendAttachment = new Discord.MessageAttachment(GetPath());
            message.channel
              .send(sendAttachment)
              .then(msg.edit("Uploading file..."))
              // delete file after it finishes sending
              .then(() => {
                msg.delete();
                fs.unlink(GetPath(), err => {
                  if (err) throw err;
                });
              })
              .catch(error => {
                console.error(error);
                message.reply(error.message);
              });
          });
      });
    }

    sendMessage();

    process.on("unhandledRejection", error => {
      message.reply(error.stderr);
    });
  },
};
