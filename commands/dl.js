const Discord = require("discord.js");
const helper = require("../helper.js");
const ytdl = require("youtube-dl");
const fs = require("fs");

module.exports = {
  name: "dl",
  alias: ["download", "tiktok", "youtube"],
  description: "download and send videos",
  usage: `\`${process.env.PREFIX}dl <url>\``,
  category: "Utility",
  async execute(message, args) {
    if (!args[0]) {
      message.reply(`invalid arguments!`);
      return;
    }

    var ext;
    const url = args[0].replace(/[<>]/g, "");
    const dir = `./temp`;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    var GetPath = () => {
      let num = message.id;
      return `${dir}/output${num}.${ext}`;
    };

    options = args.length > 1 ? helper.JoinArgs(args.slice(1)).split(", ") : ["--dump-json", "-f best"];

    const msg = await message.channel.send("Getting file information...").then(console.log(`${message.author.username} is attempting to download a video from ${url}`.yellow));

    ytdl.getInfo(url, options, function (err, info) {
      if (err) throw err;
      ext = info.ext;
      path = GetPath();
      const video = ytdl(url, options)
        // check for error before we download file
        .on("error", function error(error) {
          message.reply(error.stderr);
          console.log(error);
        })
        .on("info", function (info) {
          msg.edit("Downloading file...");
        })
        .pipe(fs.createWriteStream(path))

        // wait to send after it finishes downloading
        .on("close", function () {
          let sendAttachment = new Discord.MessageAttachment(path);
          message.channel
            .send(sendAttachment)
            .then(msg.edit("Uploading file..."))
            // delete file after it finishes sending
            .then(() => {
              msg.delete();
              fs.unlink(path, err => {
                if (err) throw err;
              });
            })
            .catch(error => {
              console.error(error);
              message.reply(error.message);
            });
        });
    });

    process.on("unhandledRejection", error => {
      message.reply(error.stderr);
    });
  },
};
