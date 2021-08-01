const { MessageEmbed, MessageButton, MessageActionRow } = require("discord.js");
const { awardMoney, getBalance, formatMoney, formatWager } = require("@utils/economy");

module.exports = {
  name: ["blackjack", "bj"],
  description: "beat dealer's hand without going over 21; dealer stands on all 17s",
  usage: `${process.env.PREFIX}blackjack <bet>`,
  async execute(message, args) {
    if (args[0]) {
      var wager = formatWager(args[0]);
    } else {
      return message.reply(`to play, use this command: \`${module.exports.usage}\``);
    }

    const balance = await getBalance(message.author.id);
    if (wager === "all") wager = balance;

    if (wager > balance) {
      return message.reply(`insufficient balance! Your balance is **${formatMoney(balance)}**.`);
    } else if (wager < 0.01) {
      return message.reply(`you must bet more than $0!`);
    }

    // take money first to prevent cheating
    awardMoney(message.author.id, -wager);

    // create shuffled deck
    var deck = shuffle(createDeck()),
      yourHand = { cards: [], score: 0, emoji_string: "" },
      dealerHand = { cards: [], score: 0, emoji_string: "" },
      hands = [dealerHand, yourHand];

    // deal cards to player and dealer
    for (var i = 0; i < 2; i++) {
      drawCard(yourHand);
      drawCard(dealerHand);
    }

    // hide one of dealer's cards
    dealerHand.cards[1].hidden = true;

    var bjEmbed = new MessageEmbed();
    update();

    // user input
    let hitButton = new MessageButton().setLabel("Hit").setEmoji(emojis[HIT]).setStyle("SUCCESS").setCustomId("hit");

    let standButton = new MessageButton()
      .setLabel("Stand")
      .setEmoji(emojis[STAND])
      .setStyle("DANGER")
      .setCustomId("stand");

    let doubleButton = new MessageButton()
      .setLabel("Double Down")
      .setEmoji(emojis[DOUBLE])
      .setStyle("PRIMARY")
      .setCustomId("double");

    if (wager * 2 > balance) doubleButton.setDisabled(true);

    let bjRow = new MessageActionRow().addComponents([hitButton, standButton, doubleButton]);

    const msg = await message.channel.send({ components: [bjRow], embeds: [bjEmbed] });

    const filter = button => button.user.id === message.author.id;
    const collector = msg.createMessageComponentCollector({ filter, time: 45000 });
    var finish = false;

    collector.on("collect", button => {
      if (button.customId === "hit") {
        drawCard(yourHand);
        update();
        button.update({ components: [bjRow], embeds: [bjEmbed] });
      } else if (button.customId === "stand") {
        // dealer starts drawing
        collector.stop("stand");
        dealerHand.cards[1].hidden = false;
        update();
        while (dealerHand.score < 17) {
          drawCard(dealerHand);
          update();
        }
        button.update({ components: [], embeds: [bjEmbed] });
      } else if (button.customId === "double") {
        awardMoney(message.author.id, -wager);
        wager *= 2;
        drawCard(yourHand);
        update();
        if (!finish) {
          collector.stop("stand");
          dealerHand.cards[1].hidden = false;
          update();
          while (dealerHand.score < 17) {
            drawCard(dealerHand);
            update();
          }
        }
        button.update({ components: [], embeds: [bjEmbed] });
      }
    });

    function drawCard(hand) {
      hand.cards.push(deck.pop());
      return hand;
    }

    function update() {
      for (var i = 0; i < hands.length; i++) {
        hands[i].score = 0;
        hands[i].emoji_string = "";
        hands[i].string = "";

        for (var j = 0; j < hands[i].cards.length; j++) {
          if (hands[i].cards[j].value === "A") hands[i].cards[j].weight = 1;

          if (!hands[i].cards[j].hidden) {
            hands[i].score += hands[i].cards[j].weight;
            hands[i].emoji_string += hands[i].cards[j].emoji;
          } else {
            hands[i].emoji_string += emojis[BACK];
          }
        }

        if (hands[i].score > 21) {
          hands[i].bust = true;
          collector.stop("bust");
        } else {
          for (var j = 0; j < hands[i].cards.length; j++) {
            if (!hands[i].cards[j].hidden && hands[i].cards[j].value === "A" && hands[i].score + 10 <= 21) {
              hands[i].cards[j].weight = 11;
              hands[i].score += 10;
            }
          }
        }

        if (hands[i].score == 21 && hands[i].cards.length == 2) {
          hands[i].blackjack = true;
          if (yourHand.blackjack) wager *= 0.5;
        }
      }

      if (
        (yourHand.score > dealerHand.score && !yourHand.bust && dealerHand.score >= 17) ||
        dealerHand.bust ||
        yourHand.blackjack
      ) {
        var end = 0;
        finish = true;
      } else if (yourHand.score == dealerHand.score && dealerHand.score >= 17) {
        var end = 1;
        finish = true;
      } else if (dealerHand.score >= 17 || yourHand.bust) {
        var end = 2;
        finish = true;
      }

      bjEmbed = new MessageEmbed()
        .setTitle("🃏 Blackjack")
        .setColor("#ffffff")
        .addField(`Your Hand | **${yourHand.score}**`, yourHand.emoji_string)
        .addField(`Dealer's Hand | **${dealerHand.score}**`, dealerHand.emoji_string)
        .setFooter(
          message.member.displayName,
          message.member.user.avatarURL({ format: "png", dynamic: true, size: 2048 })
        )
        .setTimestamp();

      if (finish) {
        if (end === 0) {
          bjEmbed.setDescription("**You won!**");
          bjEmbed.setColor("#00ff00");
          bjEmbed.addField("**Net Gain**", formatMoney(wager), true);
          bjEmbed.addField("**Balance**", formatMoney(balance + wager), true);
          awardMoney(message.author.id, wager * 2);
        } else if (end === 1) {
          bjEmbed.setDescription("**You drew!**");
          bjEmbed.setColor("#9ecfff");
          bjEmbed.addField("**Net Gain**", formatMoney(0), true);
          bjEmbed.addField("**Balance**", formatMoney(balance), true);
          awardMoney(message.author.id, wager);
        } else {
          bjEmbed.setDescription("**You lost!**");
          bjEmbed.setColor("#ff0000");
          bjEmbed.addField("**Net Gain**", formatMoney(-wager), true);
          bjEmbed.addField("**Balance**", formatMoney(balance - wager), true);
        }
      }
    }
  },
};

const suits = ["Clubs", "Spades", "Hearts", "Diamonds"];
const values = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const HIT = 52,
  STAND = 53,
  DOUBLE = 54,
  BACK = 55;

function createDeck() {
  var deck = [];
  for (var i = 0; i < suits.length; i++) {
    for (var j = 0; j < values.length; j++) {
      switch (values[j]) {
        case "J":
          var weight = 10;
          break;
        case "Q":
          var weight = 10;
          break;
        case "K":
          var weight = 10;
          break;
        case "A":
          var weight = 1;
          break;
        default:
          var weight = +values[j];
      }
      var card = { suit: suits[i], value: values[j], weight: weight, hidden: false };
      deck.push(card);
    }
  }
  for (var i = 0; i < deck.length; i++) {
    deck[i]["emoji"] = emojis[i];
  }
  return deck;
}

function shuffle(deck) {
  for (var i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

const emojis = [
  "<:card_1:838283412904738847>",
  "<:card_2:838283535873867826>",
  "<:card_3:838283604022263879>",
  "<:card_4:838283638764208139>",
  "<:card_5:838283852697829387>",
  "<:card_6:838283895542644736>",
  "<:card_7:838283931601338369>",
  "<:card_8:838284070562562078>",
  "<:card_9:838284112078045215>",
  "<:card_10:838284486226477086>",
  "<:card_11:838284572914483222>",
  "<:card_12:838284639746523156>",
  "<:card_13:838284711561527297>",
  "<:card_14:838284920660951100>",
  "<:card_15:838285058234253352>",
  "<:card_16:838285141092204544>",
  "<:card_17:838285269698215938>",
  "<:card_18:838285354712432650>",
  "<:card_19:838285497322831872>",
  "<:card_20:838285560207376385>",
  "<:card_21:838286219208032276>",
  "<:card_22:838286541494157352>",
  "<:card_23:838286670679506974>",
  "<:card_24:838286828963496017>",
  "<:card_25:838286964414480414>",
  "<:card_26:838287042353168424>",
  "<:card_27:838287860183597086>",
  "<:card_28:838287928391368714>",
  "<:card_29:838288148915683338>",
  "<:card_30:838288213612560424>",
  "<:card_31:838288247313530900>",
  "<:card_32:838288278532522036>",
  "<:card_33:838288349373792266>",
  "<:card_34:838288483353100288>",
  "<:card_35:838288516148494387>",
  "<:card_36:838288554819846175>",
  "<:card_37:838288609970749471>",
  "<:card_38:838288688135536660>",
  "<:card_39:838288864351092786>",
  "<:card_40:838288960366182430>",
  "<:card_41:838289007787376661>",
  "<:card_42:838289088251166730>",
  "<:card_43:838289149609639948>",
  "<:card_44:838289191120011295>",
  "<:card_45:838289230949646336>",
  "<:card_46:838289253779243038>",
  "<:card_47:838289371869347870>",
  "<:card_48:838289513784672326>",
  "<:card_49:838290779217854474>",
  "<:card_50:838293272920195073>",
  "<:card_51:838292222704877638>",
  "<:card_52:838292260738826280>",
  "838642518744104981",
  "838642593171767327",
  "838643677215719455",
  "<:card_back:838293749347123250>",
];
