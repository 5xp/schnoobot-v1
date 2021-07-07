const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");

// TODO shuffle discarded pile if deck is depleted
// TODO check if users are dm'able
// TODO rules settings
// TODO win condition

module.exports = {
  name: "uno",
  description: "uno game",
  slash: true,
  async execute(interaction, args) {
    const isSlash = interaction?.type === "APPLICATION_COMMAND";

    // pre-game lobby
    const players = [];
    players.push(new Player(players.length, interaction.member.user)); // ! doesnt work in dm

    const joinButton = new MessageButton().setStyle("PRIMARY").setLabel("Join").setCustomId("join");
    const startButton = new MessageButton().setStyle("SUCCESS").setLabel("Start Game").setDisabled(true).setCustomId("start");
    const leaveButton = new MessageButton().setStyle("DANGER").setLabel("Leave Game").setCustomId("leave");

    const lobbyEmbed = new MessageEmbed().setTitle("Lobby").addField("Player List", `*${players[0].name}*`).setFooter(`${players.length} players`);

    let m = await interaction.reply({ embeds: [lobbyEmbed], components: [[joinButton, startButton, leaveButton]] });

    if (isSlash) m = interaction.channel;
    const buttonCollector = m.createMessageComponentCollector({ time: 600000 });

    buttonCollector.on("collect", i => {
      switch (i.customId) {
        case "join":
          const player = new Player(players.length, interaction.member.user);

          if (players.map(player => player.id).includes(player.id)) {
            return i.reply({ content: "You are already in the game!", ephemeral: true });
          }

          players.push(player);

          lobbyEmbed.fields[0].value = players.map(player => `*${player.name}*`).join("\n");
          lobbyEmbed.setFooter(`${players.length} players`);
          startButton.setDisabled(false);

          i.update({ embeds: [lobbyEmbed], components: [[joinButton, startButton, leaveButton]] });
          break;
        case "leave":
          // TODO
          i.deferUpdate();
          break;
        case "start":
          // TODO startable only by members or author
          i.deferUpdate();
          startGame(players);
          buttonCollector.stop();
          break;
      }
    });
  },
};

async function startGame(players) {
  // increment or decrement based on direction
  let reverse = false;
  const n = () => (reverse ? -1 : 1);

  const deck = createUnoDeck();
  const discarded = [];

  // randomize first turn
  let turn = Math.floor(Math.random() * players.length);

  shuffleDeck(deck);

  // let topCard = deck.pop();
  discarded.push(deck.pop());

  for (var i = 0; i < players.length; i++) {
    // deal 7 cards to each player
    const player = players[i];
    for (var j = 0; j < 7; j++) {
      drawCard(deck, player.hand);
    }

    const handRows = generateHandRows(player.hand, discarded[discarded.length - 1], !(player.i === turn));
    const msg = await player.user.send({ content: `**Player ${player.i}** - Top Card: ${discarded[discarded.length - 1].label()}`, components: handRows });

    // attach collector to player object so it can be updated later
    const collector = await msg.createMessageComponentCollector();
    player.setCollector(collector);

    collector.on("collect", async i => {
      if (i.customId == "draw") {
        const drawnCard = drawCard(deck, player.hand);
        console.log(`${player.i} drew ${drawnCard.label()}`);

        // check if drawn card is playable and play it
        if (drawnCard.playable(discarded[discarded.length - 1])) {
          player.hand.pop();
          await playCard(drawnCard);
          discarded.push(drawnCard);
          console.log(`${player.i} played ${drawnCard.label()}`);
        }
        if (drawnCard.face == "+4" || drawnCard.face == "Wildcard") return;
      } else if (i.customId.startsWith("wild")) {
        // handles wildcard color picking
        discarded[discarded.length - 1].color = i.customId.substr(4);
      } else {
        console.log(`${player.i} played ${player.hand[i.customId].label()}`);

        const card = player.hand[i.customId];
        player.hand.splice(i.customId, 1);
        await playCard(card);
        discarded.push(card);

        // playCard() handles wildcards so we dont need to update everyones hand
        if (card.face == "+4" || card.face == "Wildcard") return;
      }

      // advance turn and update each player
      turn = Math.abs((turn + n()) % players.length);

      // update button user first so interaction doesn't fail
      const handRows = generateHandRows(player.hand, discarded[discarded.length - 1], !(player.i === turn));
      await i.update({ content: `**Player ${player.i}** - Top Card: ${discarded[discarded.length - 1].label()}`, components: handRows });

      for (const p of players) {
        if (p !== player) {
          const handRows = generateHandRows(p.hand, discarded[discarded.length - 1], !(p.i === turn));
          await p.collector.message.edit({ content: `**Player ${p.i}** - Top Card: ${discarded[discarded.length - 1].label()}`, components: handRows });
        }
      }

      async function playCard(card) {
        switch (card.face) {
          case "Skip":
            turn = Math.abs((turn + n()) % players.length);
            break;
          case "Reverse":
            // TODO skip player if only two players
            reverse = !reverse;
            break;
          case "+2":
            // draw 2 cards to next player and skip their turn
            // TODO check if next player has a +2 and stack
            drawCard(deck, players[(turn + n()) % players.length].hand, 2);
            turn = Math.abs((turn + n()) % players.length);
            break;
          case "+4":
            // TODO check if next player has a +4 and stack
            drawCard(deck, players[(turn + n()) % players.length].hand, 4);
            turn = Math.abs((turn + n()) % players.length);
            await i.update({ components: [wildCardRow()] });
            i.channel.awaitMessageComponent();
            break;
          case "Wildcard":
            await i.update({ components: [wildCardRow()] });
            i.channel.awaitMessageComponent();
            break;
        }
      }
    });
  }
}

function createUnoDeck() {
  const deck = [];
  const colors = ["Red", "Yellow", "Green", "Blue"];
  const faces = ["0", "1", "1", "2", "2", "3", "3", "4", "4", "5", "5", "6", "6", "7", "7", "8", "8", "9", "9", "Skip", "Skip", "Reverse", "Reverse", "+2", "+2", "Wildcard", "+4"];
  for (var i = 0; i < colors.length; i++) {
    for (var j = 0; j < faces.length; j++) {
      const card = new Card(colors[i], faces[j]);
      deck.push(card);
    }
  }
  return deck;
}

function Card(color, face) {
  this.color = color;
  this.face = face;
}

Card.prototype.label = function () {
  return this.color + " " + this.face;
};

Card.prototype.playable = function (topCard) {
  if (this.face === "Wildcard" || this.face === "+4") return true;

  if (this.color === topCard.color || this.face === topCard.face) return true;

  return false;
};

function shuffleDeck(deck) {
  for (var i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
}

function drawCard(deck, hand, n = 1) {
  if (n > 1) {
    for (var i = 0; i < n; i++) {
      const card = deck.pop();
      hand.push(card);
    }
  } else {
    const card = deck.pop();
    hand.push(card);
    return card;
  }
}

function Player(i, user) {
  this.i = i;
  this.user = user;
  this.id = this.user.id;
  this.name = this.user.username;
  this.hand = [];
  this.collector;
}

Player.prototype.setCollector = function (c) {
  this.collector = c;
};

function generateHandRows(hand, topCard, disabled = false) {
  // TODO create left and right buttons if someone has too many cards
  // start at 1 because of draw card button
  const rows = new Array(Math.ceil((hand.length + 1) / 5));

  for (var i = 0; i < rows.length; i++) {
    rows[i] = new MessageActionRow();
  }

  const drawCardButton = new MessageButton().setLabel("Draw Card").setStyle("DANGER").setCustomId("draw").setDisabled(disabled);
  rows[0].addComponents([drawCardButton]);

  for (var j = 0; j < hand.length; j++) {
    const r = Math.floor((j + 1) / 5);
    const button = new MessageButton().setLabel(hand[j].label()).setStyle("SECONDARY").setCustomId(j.toString());
    if (disabled || !hand[j].playable(topCard)) button.setDisabled(true);
    rows[r].addComponents([button]);
  }
  return rows;
}

function wildCardRow() {
  const colors = ["Red", "Yellow", "Green", "Blue"];
  const wildRow = new MessageActionRow();
  for (color of colors) {
    const button = new MessageButton().setLabel(color).setStyle("SECONDARY").setCustomId(`wild${color}`);
    wildRow.addComponents([button]);
  }
  return wildRow;
}
