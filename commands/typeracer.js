const fs = require("fs");
const levenshtein = require("js-levenshtein");
const Discord = require("discord.js");

module.exports = {
  name: "typeracer",
  description: "typing contest",
  execute(message, args) {
    const prompts = JSON.parse(fs.readFileSync("./prompts.json"));
    const currentPrompt = prompts[Math.floor(Math.random() * prompts.length)];
    const t = Math.floor((currentPrompt.length / 4.5) * 1.7);
    let timeStarted;
    let filter = m => !m.author.bot;
    let counter = 4;
    let finishedIDs = [];

    const countdownText = () => {
      return `**${counter}**...`;
    };

    async function countdown() {
      const msg = await message.channel.send(countdownText());
      const updateTime = finished => {
        if (finished) return;
        msg.edit(countdownText());

        if (counter <= 1) {
          finished = true;
          setTimeout(() => {
            msg.edit(currentPrompt.replace(/ /g, " \u200B")).then(StartGame());
          }, 1000);
        }

        counter--;

        // loop until finished counting down
        setTimeout(() => {
          updateTime(finished);
        }, 1000);
      };
      updateTime();
    }

    message.channel.send(`The next prompt will last for ${t} seconds.`).then(countdown());

    function StartGame() {
      collector = message.channel.createMessageCollector(filter, { time: t * 1000 });
      timeStarted = Date.now();

      collector.on("collect", m => {
        AnswerLogic(m);
      });
      collector.on("end", collected => {
        //summary
      });
    }

    function AnswerLogic(msg) {
      if (finishedIDs.includes(msg.author.id)) return;

      let response = msg.content;
      let distance = levenshtein(currentPrompt, response);
      if (distance > currentPrompt.length / 25) return;
      let elapsedTime = Date.now() - timeStarted;
      let wpm = (currentPrompt.length / 4.5 / (elapsedTime / 1000)) * 60;
      finishedIDs.push(msg.author.id);

      const summaryEmbed = new Discord.MessageEmbed()
        .setColor("#80ff80")
        .setTitle(`${msg.author.username} finished the race!`)
        .addField("**Place**", `#${finishedIDs.length}`, true)
        .addField("**WPM**", `${wpm.toFixed(1)}`, true)
        .addField("**Errors**", `${distance}`, true);

      message.channel.send(summaryEmbed);
    }
  },
};
