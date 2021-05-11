const Discord = require("discord.js");
const youtubedl = require("youtube-dl");
const fs = require("fs");
const { getVideoDurationInSeconds } = require("get-video-duration");
const { getAudioDurationInSeconds } = require("get-audio-duration");
const ffmpeg = require("ffmpeg");

const format1 = "--format=bestvideo[ext=mp4][filesize<8M]+bestaudio[ext=m4a]";
const format2 = "--format=worstvideo[ext=mp4][filesize>8M]+bestaudio[ext=m4a]";
const format3 = "--format=bestvideo[ext=mp4][filesize<200M]+bestaudio[ext=m4a]";

module.exports = {
  name: "dl",
  alias: ["download", "tiktok", "youtube"],
  description: "download and send videos",
  usage: `\`${process.env.PREFIX}dl <url>\``,
  category: "Utility",
  async execute(message, args, silent = false) {
    if (!args[0]) {
      message.reply(`invalid arguments!`);
      return;
    }

    const url = args.shift().replace(/[<>]/g, "");
    const dir = `${process.cwd()}/temp`;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    console.log(`${message.author.username} is downloading a video from ${url}`.yellow);
    message.channel.startTyping();

    var options = ["-o", `${dir}/${message.id}.%(ext)s`, `${format1}/${format2}/${format3}/best[ext=mp4][filesize<200M]/bestvideo+bestaudio/best`];
    // options = options.concat(args);

    youtubedl.exec(url, options, {}, async (err, output) => {
      if (err) {
        console.log(err);
        const err_str = err.stderr.match(/^ERROR.*$/gm);
        message.channel.stopTyping();
        return message.reply(err_str.join("\n"));
      }

      console.log(output.join("\n"));

      var filename = fs.readdirSync(dir).filter(file => file.startsWith(message.id))[0];
      var ext = filename.slice(message.id.length + 1);
      let path = `${dir}/${filename}`;
      const originalpath = path;

      const stats = fs.statSync(path);
      const megabytes = stats.size / (1024 * 1024);

      const tier = message.guild.premiumTier;
      let maxFilesize;
      switch (tier) {
        case 2:
          maxFilesize = 50;
          break;
        case 3:
          maxFilesize = 100;
          break;
        default:
          maxFilesize = 8;
      }

      if (megabytes > maxFilesize) {
        console.log(`Filesize is greater than ${maxFilesize} megabytes! (${megabytes.toFixed(2)} MB)`.red);
        var msg = await message.channel.send(`Compressing file... (${megabytes.toFixed(2)} MB)`);
        await compress(`${dir}/${message.id}`, ext, maxFilesize);
        path = `${dir}/${message.id}_new.${ext}`;
      }

      const attachment = new Discord.MessageAttachment(path);
      await message.reply(attachment).catch(error => {
        if (!silent) message.reply(error.message);
      });

      if (msg) msg.delete();

      message.channel.stopTyping();

      fs.unlink(path, error => {
        if (error) throw error;
      });
      if (path !== originalpath)
        fs.unlink(originalpath, error => {
          if (error) throw error;
        });
    });
  },
};

const getDuration = async (path, ext) => {
  switch (ext) {
    default:
      return await getVideoDurationInSeconds(path);
    case "m4a":
    case "mp3":
      return await getAudioDurationInSeconds(path);
  }
};

async function compress(path, ext, target) {
  const duration = (await getDuration(`${path}.${ext}`, ext)) * 1.5;
  const bitrate = (target * 8196) / duration - 128;

  var process = new ffmpeg(`${path}.${ext}`);
  video = await process;
  video.addCommand("-b:v", bitrate + "k");
  return video.save(`${path}_new.${ext}`);
}
