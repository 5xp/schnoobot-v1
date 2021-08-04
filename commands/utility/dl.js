const youtubedl = require("youtube-dl-exec");
const ffmpeg = require("ffmpeg");
const fs = require("fs");
const { MessageAttachment, Formatters } = require("discord.js");
const { getVideoDurationInSeconds } = require("get-video-duration");
const { getAudioDurationInSeconds } = require("get-audio-duration");
const { downloadFile } = require("@utils/helper");

const format1 = "bestvideo[ext=mp4][filesize<8M]+bestaudio[ext=m4a]";
const format2 = "worstvideo[ext=mp4][filesize>8M]+bestaudio[ext=m4a]";
const format3 = "bestvideo[ext=mp4][filesize<200M]+bestaudio[ext=m4a]";

module.exports = {
  name: ["dl", "download", "tiktok", "youtube", "video"],
  description: "download and send videos",
  usage: `${process.env.PREFIX}dl <url>`,
  options: [
    { name: "url", type: "STRING", description: "the URL to download from", required: true },
    { name: "audioonly", type: "BOOLEAN", description: "download only audio", required: false },
  ],
  slash: true,
  async execute(interaction, args, silent) {
    if (silent !== true) silent = false;
    let url, reaction, reply;

    const dir = `${process.cwd()}/temp`;
    const flags = {
      o: `${dir}/${interaction.id}.%(ext)s`,
      format: `${format1}/${format2}/${format3}/best[ext=mp4][filesize<200M]/bestvideo+bestaudio/best`,
    };

    const isSlash = interaction?.type === "APPLICATION_COMMAND";

    if (isSlash) {
      url = interaction.options.get("url").value;
      interaction.defer();
    } else {
      if (!args[0]) {
        return interaction.reply(`To use this command: \`${module.exports.usage}\``);
      }

      url = args.shift().replace(/[<>]/g, "");
      reaction = interaction.react("861916931367108608");
    }

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }

    if (interaction?.options?.get("audioonly")?.value) {
      flags.extractAudio = true;
      flags.audioFormat = "mp3";
    }

    if (!fs.existsSync(`${dir}/cookies.txt`)) {
      console.log("Downloading cookies file...");
      await downloadFile(process.env.YTDL_COOKIES, `${dir}/cookies.txt`);
    }

    // only use cookies on instagram and youtube
    if (url.match(/(instagram)|(youtu?.be)/)) flags.cookies = `${dir}/cookies.txt`;

    try {
      const output = await youtubedl(url, flags);

      console.log(output);
      const filename = fs.readdirSync(dir).filter(file => file.startsWith(interaction.id))[0];
      const ext = filename.slice(interaction.id.length + 1);

      let path = `${dir}/${filename}`;

      const originalpath = path;

      const stats = fs.statSync(path);
      const megabytes = stats.size / (1024 * 1024);

      const tier = interaction.member.guild.premiumTier || 1;
      let maxFilesize;
      switch (tier) {
        case "TIER_2":
          maxFilesize = 50;
          break;
        case "TIER_3":
          maxFilesize = 100;
          break;
        default:
          maxFilesize = 8;
      }

      let failedToCompress = false;
      if (megabytes > maxFilesize) {
        console.log(`Filesize is greater than ${maxFilesize} megabytes! (${megabytes.toFixed(2)} MB)`.red);

        if (silent) {
          interaction.react("⚠");
        } else if (isSlash) {
          await interaction.editReply({
            content: `<a:loading:861916931367108608> Compressing file... (${megabytes.toFixed(2)} MB)`,
          });
        } else {
          reply = await interaction.reply({
            content: `Compressing file... (${megabytes.toFixed(2)} MB)`,
            allowedMentions: { repliedUser: false },
          });
        }

        try {
          await compress(`${dir}/${interaction.id}`, ext, maxFilesize);
          path = `${dir}/${interaction.id}_new.${ext}`;
        } catch (error) {
          failedToCompress = true;

          if (silent) {
            interaction.react("🚫");
          } else if (isSlash) {
            await interaction.editReply({ content: "🚫 **Download failed!**", ephemeral: false });
            await interaction.followUp({ content: Formatters.codeBlock(error.message), ephemeral: true });
          } else {
            interaction.reply(error.message);
          }

          fs.unlink(path, error => {
            if (error) throw error;
          });
        }
      }

      if (failedToCompress) return;

      const attachment = new MessageAttachment(path).setName(`video.${ext}`);

      if (isSlash) {
        await interaction.editReply({ content: null, files: [attachment] }).catch(async error => {
          await interaction.editReply({ content: "🚫 **Download failed!**", ephemeral: false });
          await interaction.followUp({ content: Formatters.codeBlock(error.message), ephemeral: true });
        });
      } else {
        await interaction.reply({ files: [attachment], allowedMentions: { repliedUser: false } }).catch(error => {
          silent ? interaction.react("🚫") : interaction.reply(error.message);
        });
      }

      fs.unlink(path, error => {
        if (error) throw error;
      });
      if (path !== originalpath) {
        fs.unlink(originalpath, error => {
          if (error) throw error;
        });
      }

      if (reaction) {
        reaction = await reaction;
        reaction.remove();
      }
    } catch (err) {
      console.log(err);
      const err_str = err.stderr.match(/^ERROR.*$/gm);

      if (silent) {
        return interaction.react("🚫");
      } else if (isSlash) {
        await interaction.editReply({ content: "🚫 **Download failed!**", ephemeral: false });
        await interaction.followUp({ content: Formatters.codeBlock(err_str.join("\n")), ephemeral: true });
        return;
      } else {
        return interaction.reply(Formatters.codeBlock(err_str.join("\n")));
      }
    } finally {
      if (reply) reply.delete();

      if (reaction) {
        reaction = await reaction;
        reaction.remove();
      }
    }
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

  if (bitrate < 0) throw new Error("File cannot be compressed");

  const process = new ffmpeg(`${path}.${ext}`);
  const video = await process;
  video.addCommand("-b:v", bitrate + "k");
  return video.save(`${path}_new.${ext}`);
}
