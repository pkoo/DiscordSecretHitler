const SecretHitler = require('./SecretHitler');
const Player = require('./Player');

module.exports = class DiscordSecretHitler {
  client = null;
  game = new SecretHitler(); // TODO: Set to null to disable double instance

  gameAdmin = null;
  guild = null;
  textChannel = null;
  voiceChannel = null;

  constructor(gameAdmin, players, client) {
    this.game = new SecretHitler(players);
    this.game.addPlayer(gameAdmin);
    this.gameAdmin = gameAdmin;
    this.client = client;
    this.client.user.setActivity('Serving SecretHitler');
  }

  startGame() {
    // TODO: Remove this after tests
    if (this.game.players.length < 5) {
      console.log('Cheating to get at least 5 players');
      this.game.players = [
        new Player(this.gameAdmin),
        new Player(this.gameAdmin),
        new Player(this.gameAdmin),
        new Player(this.gameAdmin),
        new Player(this.gameAdmin),
        new Player(this.gameAdmin),
        ...this.game.players,
      ];
    }

    console.log('Starting the backend game');
    this.game
      .startGame()
      .then(() => {
        console.log('Game is prepared and starting now');
        this.txtChan.send('The game is ready and starting now');
        this.client.user.setActivity('SecretHitler');
      })
      .then(() => this.electionPhaseStart())
      .catch((err) => {
        console.log(`ERROR while starting the game!\n${err}`);
        this.txtChan.send('ERROR: Could not start the game :-(');
        this.txtChan.send(`Error Message: ${err}`);
      });
  }

  electionPhaseStart() {
    console.log('Step 1) Set the next President');
    this.txtChan.send(`Playing Round ${this.game.rounds}`);
    this.game.setNextPresident().then(() => {
      const president = this.game.currentPresident;
      console.log(`Step 1 Result = ${JSON.stringify(president)}`);
      this.txtChan
        .send(`The next president is ${president.user}.\nPlease nominate your chancellor and mention him here!`)
        .then(() => {
          this.electionPhaseNominateChancellor();
        })
        .catch((err) => {
          console.log(`ERROR with nominating a chancellor!\n${err}`);
          this.txtChan.send(`ERROR: ${err}`);
        });
    });
  }

  electionPhaseNominateChancellor() {
    console.log('Step 2) Nominate the next Chancellor, just @-Notify him here.');
    const filter = (m) => m.author.id === this.game.currentPresident.user.id;
    this.txtChan
      .awaitMessages(filter, {
        time: 60000,
        max: 1,
        errors: ['time'],
      })
      .then((messages) => {
        const chancellor = messages.first().mentions.users.first();
        console.log(`Step 2 result = ${chancellor}`);
        this.txtChan.send(`${this.game.currentPresident.user} nominated ${chancellor} as the next chancellor`);
        this.game
          .setNextChancellor(chancellor)
          .then(() => {
            this.electionPhaseVoteForChancellor();
          })
          .catch((err) => {
            throw err;
          });
      })
      .catch(() => {
        this.txtChan.send(
          `${this.game.currentPresident.user}, you did not nominate an chancellor or he is not eligable :-(\nPlease choose another one!`
        );
        this.electionPhaseNominateChancellor();
      });
  }

  electionPhaseVoteForChancellor() {
    console.log('Step 3) Vote for new Chancellor');
    const votePromises = [];
    this.game.alivePlayers.forEach((player) => {
      console.log(`Letting ${player.user} vote`);
      votePromises.push(this.voteForNextChancellor(player));
    });
    Promise.all(votePromises).then((results) => {
      const yesVotes = results.filter((r) => r.yes).length;
      const noVotes = results.length - yesVotes;

      // make all vote results public
      results.forEach((result) => {
        this.textChannel.send(`${result.player.user} voted ${result.yes ? 'YES' : 'NO'}`);
      });

      if (noVotes >= yesVotes) {
        console.log(`The chancellor is not voted`);
        // the chancellor has not been voted
        this.txtChan.send(`The vote for the next chancellor ${this.game.currentChancellor} has failed.`);
        this.game
          .chancellorVoteFailed()
          .then(() => this.electionPhaseStart())
          .catch((policy) => {
            this.txtChan.send(
              `You missed three times in a row to select a working government.\nThe chaos spread within your parlament.`
            );
            // TODO: Draw the top Policy and play it!
            this.txtChan.send(`The top policy card ${policy} was played.`);
            // begin next round
            this.electionPhaseStart();
          });
      } else {
        console.log(`The chancellor got voted`);
        this.legislativeSelectPolicy();
      }
      console.log('END OF ELECTION PHASE');
    });
  }

  voteForNextChancellor(player) {
    const filter = (reaction, user) => ['👍', '👎'].includes(reaction.emoji.name) && !user.bot;

    return new Promise((resolve, reject) => {
      this.userChat(player.user)
        .send(`Do you vote for <@${this.game.currentChancellor.user.id}> as the next chancellor?`)
        .then((sentMessage) => {
          sentMessage.react('👍');
          sentMessage.react('👎');
          sentMessage
            .awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
            .then((collected) => {
              console.log(`Response Reaction => ${collected}`);
              const reaction = collected.first();
              if (reaction.emoji.name === '👍') {
                console.log(`${player.user.username} voted YES`);
                resolve({ player: player, yes: true });
              } else {
                console.log(`${player.user.username} voted NO`);
                resolve({ player: player, yes: false });
              }
            })
            .catch((err) => {
              console.log(
                `ERROR while collecting votes for next Chancellor.\n
                ${JSON.stringify(err)}`
              );
              sentMessage.reply('you reacted with neither a thumbs up, nor a thumbs down.');
              reject(err);
            });
        });
    });
  }

  legislativeSelectPolicy() {
    console.log('START LEGISLATIVE');
    // draw 3 policies to President
    this.game.drawHandPolicies();
    console.log(`Drawed three policies: ${JSON.stringify(this.game.handPolicies)}`);
    // President selects one to discard, gives 2 to Chancellor
    this.discardHandPolicy(this.game.currentPresident.user).then((card) => {
      console.log(`President discarded ${card}`);
      console.log(`Two policies left: ${JSON.stringify(this.game.handPolicies)}`);
      this.discardHandPolicy(this.game.currentChancellor.user).then((card) => {
        console.log(`Chancellor discarded ${card}`);
        // now we play the last hand card
        this.game.putPolicy().then((policy) => this.executePolicy(policy));
      });
    });
    // Chancellor selects one to discard, the other Policy gets played
  }

  discardHandPolicy(player) {
    return new Promise((resolve, reject) => {
      this.userChat(player)
        .send(
          `Please discard one of these policies, just react on it.\n
        ${this.game.canVeto() ? 'The Veto right can be used' : ''}`
        )
        .then(() => {
          this.game.drawHandPolicies().forEach((policy, index) => {
            this.userChat(player)
              .send(`${index}) ${policy}`)
              .then((sentMessage) => {
                sentMessage.react('👎');
                sentMessage
                  .awaitReactions(filter, { max: 1, time: 60000, errors: ['time'] })
                  .then((collected) => {
                    console.log(`Response Reaction => ${collected}`);
                    const reaction = collected.first();
                    if (reaction.emoji.name === '👎') {
                      console.log(reaction);
                      resolve(reaction);
                      // TODO: Discard the selected policy
                    }
                  })
                  .catch((err) => {
                    console.log(
                      `ERROR while ${player} does not discarded a card.\n
                ${JSON.stringify(err)}`
                    );
                    reject(err);
                  });
              });
          });
        });
    });
  }

  executePolicy(policy) {
    if (policy === this.game.PolicyCard.LIBERAL) this.electionPhaseStart();
    const playerLength = this.game.players.length;
    const fascistAction = this.game.fascistBoard;

    if (playerLength < 7) {
      switch (fascistAction) {
        case 3:
          // currentPresident can see the next three drawPolicies
          const cards = this.game.drawPolicies.slice(-3);
          this.userChat(this.game.currentPresident).send(`The next three policies will be ${cards}`);
          break;
        case 4:
        // kill another player
        case 5:
          // kill another player, Veto Power is enabled
          this.killOtherPlayer();
          break;
        case 6:
          this.txtChan.send('The Fascist have taken over and won :-(');
          this.stopGame();
          break;
      }
    } else {
      switch (fascistAction) {
        case 1:
          if (!playerLength > 8) break;
        case 2:
          // investigate a players party
          this.investigatePlayerParty();
          break;
        case 3:
          // pick the next president
          this.pickNextPresident();
          break;
        case 4:
        // kill another player
        case 5:
          // kill another player, Veto power is enabled
          this.killOtherPlayer();
          break;
        case 6:
          this.txtChan.send('The Fascist have taken over and won :-(');
          this.stopGame();
          break;
      }
    }
  }

  pickNextPresident() {
    const filter = (m) => m.author.id === this.game.currentPresident.user.id;
    this.txtChan.send(`${this.game.currentPresident.user}, please pick the next president.`);
    this.txtChan
      .awaitMessages(filter, {
        time: 60000,
        max: 1,
        errors: ['time'],
      })
      .then((messages) => {
        const next = messages.first().mentions.users.first();
        this.game.setSepcialPresident(next);
      })
      .catch(() => {
        this.txtChan.send(`${this.game.currentPresident.user}, still no choice?.`);
      });
  }

  investigatePlayerParty() {
    const filter = (m) => m.author.id === this.game.currentPresident.user.id;
    this.txtChan.send('Please mention the user, you want to inspect.');
    this.txtChan
      .awaitMessages(filter, {
        time: 60000,
        max: 1,
        errors: ['time'],
      })
      .then((messages) => {
        const discordPlayer = messages.first().mentions.users.first();
        this.userChat(this.game.currentPresident.user).send(
          this.game.isPlayerFascist(discordPlayer) ? `${discordPlayer} is fascist` : `${discordPlayer} is liberal`
        );
      });
  }

  killOtherPlayer() {
    const filter = (m) => m.author.id === this.game.currentPresident.user.id;
    this.txtChan.send(
      `${this.game.currentPresident.user}, you need to kill another player. Please mention your victim.`
    );
    this.txtChan
      .awaitMessages(filter, {
        time: 60000,
        max: 1,
        errors: ['time'],
      })
      .then((messages) => {
        const victim = messages.first().mentions.users.first();
        console.log(`Killing result = ${victim}`);
        this.txtChan.send(`Sorry ${victim}, you just got killed :(`);
        const won = this.game.killPlayer(victim);
        if (won) {
          this.txtChan.send('Congratulations, you assassinated Hitler! This time the Liberals won!');
          this.stopGame();
        }
      })
      .catch(() => {
        this.txtChan.send(`${this.game.currentPresident.user}, still no choice?.`);
        this.killOtherPlayer();
      });
  }

  stopGame() {
    // TODO: Setting if the users should be revealed or not
    this.game.players.forEach((player) => {
      if (player.isHitler()) {
        this.txtChan.send(`${player.user} was Hitler`);
      } else {
        this.txtChan.send(`${player.user} was ${player.isFascist() ? 'FASCIST' : 'LIBERAL'}`);
      }
    });
    this.txtChan.send(`Please stay nice to each other, we all had to play roles. Maybe you wanna try again? ;-)`);
    this.game = null;
    this.client.user.setActivity();
  }

  get txtChan() {
    return this.client.channels.cache.get(this.textChannel.id);
  }

  userChat(user) {
    return this.client.users.cache.get(user.id);
  }
};
