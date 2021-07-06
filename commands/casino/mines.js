const { MessageButton, MessageActionRow } = require("discord-buttons");
const { MessageEmbed } = require("discord.js");
const numeral = require("numeral");
const { AwardPoints, GetUserData } = require("../../utils/coin");

const columns = 5;
const rows = 5;

// beginning state of all buttons
const hiddenButton = new MessageButton().setLabel(" ").setStyle("gray").setID("hiddenButton");
// revealed gem
const gemButton = new MessageButton().setEmoji("💎").setStyle("blurple").setID("gemButton"); //.setDisabled(true);
// revealed mine
const mineButton = new MessageButton().setEmoji("💣").setStyle("red").setID("mineButton"); //.setDisabled(true);
const cashoutButton = new MessageButton().setLabel("Cash out").setStyle("green").setID("cashoutButton");

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

    // create discord buttons
    var buttonRows = createButtonGrid(rows, columns, grid);

    let [, , nextProfit, nextMult, winOdds] = calculateMultiplier(numMines, wager);

    let minesEmbed = new MessageEmbed()
      .setTitle("💣 Mines")
      .setColor("#ffffff")
      .addField("**Mines**", numMines, true)
      .addField("**Total Profit**", `${numeral(0).format("$0,0.00")} (1.00x)`, true)
      .addField("**Profit on Next Tile**", `${numeral(nextProfit).format("$0,0.00")} (${nextMult.toFixed(2)}x)`, true)
      .addField("**Win % of Next Tile**", `${numeral(winOdds).format("0.00%")}`, true);

    const msg = await message.channel.send({ components: buttonRows, embed: minesEmbed });

    // have to send a second message for the 26th button
    // send a 1x1 image to get a small gap
    const msg2 = await message.channel.send({ buttons: cashoutButton, files: ["https://cdn.discordapp.com/attachments/793778786943762434/858505668481515540/image.png"] });

    const btnFilter = button => button.clicker.user.id === message.author.id;
    const btnCollector = msg.createButtonCollector(btnFilter);
    const cashoutCollector = msg2.createButtonCollector(btnFilter);

    let cellsRevealed = 0;

    btnCollector.on("collect", button => {
      const row = Math.floor(button.id / rows);
      const col = button.id % rows;
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
          .addField("**Mines**", numMines, true)
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
          let [currentProfit, currentMult, nextProfit, nextMult, winOdds] = calculateMultiplier(numMines + cellsRevealed, wager);

          minesEmbed = new MessageEmbed()
            .setTitle("💣 Mines")
            .setColor("#ffffff")
            .addField("**Mines**", numMines, true)
            .addField("**Total Profit**", `${numeral(currentProfit).format("$0,0.00")} (${currentMult}x)`, true)
            .addField("**Profit on Next Tile**", `${numeral(nextProfit).format("$0,0.00")} (${nextMult.toFixed(2)}x)`, true)
            .addField("**Win % of Next Tile**", `${numeral(winOdds).format("0.00%")}`, true);
        }
      }

      buttonRows = createButtonGrid(rows, columns, grid);
      msg.edit({ components: buttonRows, embed: minesEmbed });
    });

    cashoutCollector.on("collect", button => {
      if (button.id === "cashoutButton") {
        cashoutCollector.stop();
        btnCollector.stop();
        revealGrid(grid);

        if (cellsRevealed > 0) {
          let [currentProfit, currentMult] = calculateMultiplier(numMines + cellsRevealed, wager);
          minesEmbed = new MessageEmbed()
            .setTitle("💣 Mines")
            .setColor("#2bff00")
            .addField("**Profit**", `${numeral(currentProfit).format("$0,0.00")} (${currentMult.toFixed(2)}x)`, true)
            .addField("**Balance**", numeral(balance + currentProfit).format("$0,0.00"), true);

          AwardPoints(message.author, currentProfit);

          buttonRows = createButtonGrid(rows, columns, grid);
          msg.edit({ components: buttonRows, embed: minesEmbed });
        } else {
          minesEmbed = new MessageEmbed()
            .setTitle("💣 Mines")
            .setColor("#ffffff")
            .addField("**Profit**", `${numeral(0).format("$0,0.00")} (1.00x)`, true)
            .addField("**Balance**", numeral(balance).format("$0,0.00"), true);

          buttonRows = createButtonGrid(rows, columns, grid);
          msg.edit({ components: buttonRows, embed: minesEmbed });
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
      button.setID(this.x * columns + this.y);
      if (this.disabled) button.setDisabled(true);
      else button.setDisabled(false);
      return button;
    } else {
      let button = gemButton;
      button.setID(this.x * columns + this.y);
      if (this.disabled) button.setDisabled(true);
      else button.setDisabled(false);
      return button;
    }
  } else {
    let button = hiddenButton;
    button.setID(this.x * columns + this.y);
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
      buttonRows[i].addComponent(grid[i][j].buttonState());
    }
  }
  return buttonRows;
}

// bombs + clicked mines
function calculateMultiplier(sum, wager) {
  let currentMult = Math.round(100 * (25 / (26 - sum))) / 100;
  let currentProfit = wager * currentMult - wager;
  let nextMult = Math.round(100 * (25 / (25 - sum))) / 100;
  let nextProfit = wager * nextMult - wager;
  let winOdds = (25 - sum) / 25;
  return [currentProfit, currentMult, nextProfit, nextMult, winOdds];
}

function revealGrid(grid) {
  grid.forEach(row =>
    row.forEach(cell => {
      if (!cell.revealed) cell.reveal(false);
    })
  );
}