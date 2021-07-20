const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");
const numeral = require("numeral");
const { AwardPoints, GetUserData } = require("../../utils/coin");

const columns = 5;
const rows = 5;
const factorial = [
  1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600, 6227020800, 87178291200, 1307674368000, 20922789888000, 355687428096000, 6402373705728000, 121645100408832000,
  2432902008176640000, 51090942171709440000, 1124000727777607680000, 25852016738884976640000, 620448401733239439360000, 15511210043330985984000000,
];

// beginning state of all buttons
const hiddenButton = new MessageButton().setLabel(" ").setStyle("SECONDARY").setCustomId("hiddenButton");
// revealed gem
const gemButton = new MessageButton().setEmoji("💎").setStyle("PRIMARY").setCustomId("gemButton"); //.setDisabled(true);
// revealed mine
const mineButton = new MessageButton().setEmoji("💣").setStyle("DANGER").setCustomId("mineButton"); //.setDisabled(true);
const cashoutButton = new MessageButton().setLabel("Cash out").setStyle("SUCCESS").setCustomId("cashoutButton");

module.exports = {
  name: "mines",
  description: "you lose if you reveal a mine",
  usage: `${process.env.PREFIX}mines <number of mines> <bet>`,
  async execute(message, args) {
    if (args[0] !== undefined && args[1] !== undefined) {
      var numMines = Math.round(numeral(args[0]).value());
      var wager = args[1].toLowerCase() === "all" ? "all" : numeral(numeral(args[1]).format("0.00")).value();
    } else {
      return message.reply(`to play, use this command: \`${module.exports.usage}\``);
    }

    if (numMines < 1 || numMines > 24) return message.reply("you must have between 1-24 mines!");

    const data = await GetUserData(message.author);
    var balance = data === null ? 0 : +data.coins.toString();
    if (wager === "all") wager = balance;

    if (wager > balance) {
      return message.reply(`insufficient balance! Your balance is **${numeral(balance).format("$0,0.00")}**.`);
    } else if (wager < 0.01) {
      return message.reply(`you must bet more than $0!`);
    }

    // set up
    let grid = createArray(rows, columns);
    let cells = [];
    for (var i = 0; i < rows; i++) {
      for (var j = 0; j < columns; j++) {
        grid[i][j] = new Cell(i, j);
        cells.push([i, j]);
      }
    }

    // randomly assign mines
    for (var n = 0; n < numMines; n++) {
      let index = Math.floor(Math.random() * cells.length);
      let i = cells[index][0];
      let j = cells[index][1];

      cells.splice(index, 1);
      grid[i][j].mine = true;
    }

    // create array of MessageActionRows
    var buttonRows = createButtonGrid(rows, columns, grid);

    let [, , nextProfit, nextMult, winOdds] = calculateMultiplier(numMines, 0, wager);

    let minesEmbed = new MessageEmbed()
      .setTitle("💣 Mines")
      .setColor("#ffffff")
      .addField("**Mines**", numMines.toString(), true)
      .addField("**Total Profit**", `${numeral(0).format("$0,0.00")} (1.00x)`, true)
      .addField("**Profit on Next Tile**", `${numeral(nextProfit).format("$0,0.00")} (${nextMult.toFixed(2)}x)`, true)
      .addField("**Win % of Next Tile**", `${numeral(winOdds).format("0.00%")}`, true);

    const msg = await message.reply({ components: buttonRows, embeds: [minesEmbed], allowedMentions: { repliedUser: false } });

    // have to send a second message for the 26th button
    // send a 1x1 image to get a small gap
    const msg2 = await message.channel.send({
      components: [{ type: 1, components: [cashoutButton] }],
      files: ["https://cdn.discordapp.com/attachments/793778786943762434/858505668481515540/image.png"],
    });

    const btnFilter = button => button.user.id === message.author.id;
    const btnCollector = msg.createMessageComponentCollector({ btnFilter });
    const cashoutCollector = msg2.createMessageComponentCollector({ btnFilter });

    let cellsRevealed = 0;

    btnCollector.on("collect", button => {
      const row = Math.floor(button.customId / rows);
      const col = button.customId % rows;
      if (!grid[row][col].revealed) {
        grid[row][col].reveal();
      } else {
        return;
      }

      // game over, reveal each cell
      if (grid[row][col].mine) {
        btnCollector.stop();
        cashoutCollector.stop();
        revealGrid(grid);
        minesEmbed = new MessageEmbed()
          .setTitle("💣 Mines")
          .setDescription("**You lost!**")
          .setColor("ff0000")
          .addField("**Mines**", numMines.toString(), true)
          .addField("**Profit**", numeral(-wager).format("$0,0.00"), true)
          .addField("**Balance**", numeral(balance - wager).format("$0,0.00"), true);

        AwardPoints(message.author, -wager);
      } else {
        cellsRevealed++;

        // revealed all non-mines
        if (25 - numMines == cellsRevealed) {
          btnCollector.stop();
          cashoutCollector.stop();
          revealGrid(grid);
          minesEmbed = new MessageEmbed()
            .setDescription("**You won!**")
            .setTitle("💣 Mines")
            .setColor("#2bff00")
            .addField("**Profit**", `${numeral(nextProfit).format("$0,0.00")} (${nextMult.toFixed(2)}x)`, true)
            .addField("**Balance**", numeral(balance + nextProfit).format("$0,0.00"), true);

          AwardPoints(message.author, nextProfit);
        } else {
          let [currentProfit, currentMult, nextProfit, nextMult, winOdds] = calculateMultiplier(numMines, cellsRevealed, wager);

          minesEmbed = new MessageEmbed()
            .setTitle("💣 Mines")
            .setColor("#ffffff")
            .addField("**Mines**", numMines.toString(), true)
            .addField("**Total Profit**", `${numeral(currentProfit).format("$0,0.00")} (${currentMult}x)`, true)
            .addField("**Profit on Next Tile**", `${numeral(nextProfit).format("$0,0.00")} (${nextMult.toFixed(2)}x)`, true)
            .addField("**Win % of Next Tile**", `${numeral(winOdds).format("0.00%")}`, true);
        }
      }

      buttonRows = createButtonGrid(rows, columns, grid);
      button.update({ components: buttonRows, embeds: [minesEmbed] });
    });

    cashoutCollector.on("collect", button => {
      if (button.customId === "cashoutButton") {
        cashoutCollector.stop();
        btnCollector.stop();
        revealGrid(grid);

        if (cellsRevealed > 0) {
          let [currentProfit, currentMult] = calculateMultiplier(numMines, cellsRevealed, wager);
          minesEmbed = new MessageEmbed()
            .setTitle("💣 Mines")
            .setColor("#2bff00")
            .addField("**Profit**", `${numeral(currentProfit).format("$0,0.00")} (${currentMult.toFixed(2)}x)`, true)
            .addField("**Balance**", numeral(balance + currentProfit).format("$0,0.00"), true);

          AwardPoints(message.author, currentProfit);

          buttonRows = createButtonGrid(rows, columns, grid);
          button.deferUpdate();
          msg.edit({ components: buttonRows, embeds: [minesEmbed] });
        } else {
          minesEmbed = new MessageEmbed()
            .setTitle("💣 Mines")
            .setColor("#ffffff")
            .addField("**Profit**", `${numeral(0).format("$0,0.00")} (1.00x)`, true)
            .addField("**Balance**", numeral(balance).format("$0,0.00"), true);

          buttonRows = createButtonGrid(rows, columns, grid);
          button.deferUpdate();
          msg.edit({ components: buttonRows, embeds: [minesEmbed] });
        }
      }
    });
  },
};

function createArray(rows, cols) {
  let arr = new Array(rows);
  for (var i = 0; i < arr.length; i++) {
    arr[i] = new Array(cols);
  }
  return arr;
}

function Cell(x, y) {
  this.x = x;
  this.y = y;
  this.mine = false;
  this.revealed = false;
  this.disabled = false;
}

Cell.prototype.buttonState = function () {
  if (this.revealed) {
    if (this.mine) {
      let button = mineButton;
      button.setCustomId(`${this.x * columns + this.y}`);
      if (this.disabled) button.setDisabled(true);
      else button.setDisabled(false);
      return button;
    } else {
      let button = gemButton;
      button.setCustomId(`${this.x * columns + this.y}`);
      if (this.disabled) button.setDisabled(true);
      else button.setDisabled(false);
      return button;
    }
  } else {
    let button = hiddenButton;
    button.setCustomId(`${this.x * columns + this.y}`);
    return button;
  }
};

Cell.prototype.reveal = function (specific = true) {
  this.revealed = true;
  if (!specific) this.disabled = true;
};

function createButtonGrid(rows, columns, grid) {
  // create discord buttons
  let buttonRows = new Array(rows);
  for (var i = 0; i < rows; i++) {
    buttonRows[i] = new MessageActionRow();
    for (var j = 0; j < columns; j++) {
      buttonRows[i].addComponents([grid[i][j].buttonState()]);
    }
  }
  return buttonRows;
}

// bombs + clicked mines
function calculateMultiplier(mines, revealed, wager) {
  const currentOdds = winProbability(mines, revealed);
  const nextOdds = winProbability(mines, revealed + 1);
  const currentMult = Math.round(100 * (1 / currentOdds)) / 100;
  const currentProfit = wager * currentMult - wager;
  const nextMult = Math.round(100 * (1 / nextOdds)) / 100;
  const nextProfit = wager * nextMult - wager;
  return [currentProfit, currentMult, nextProfit, nextMult, nextOdds];
}

const winProbability = (mines, revealed) => (factorial[25 - mines] * factorial[25 - revealed]) / (factorial[25] * factorial[25 - (mines + revealed)]);

function revealGrid(grid) {
  grid.forEach(row =>
    row.forEach(cell => {
      if (!cell.revealed) cell.reveal(false);
    })
  );
}
