const SecretHitler = require('./SecretHitler');
const Player = require('./Player');

module.exports = class DiscordSecretHitler {
  client = null;
  game = new SecretHitler();

  gameAdmin = null;
  guild = null;
  textChannel = null;
  voiceChannel = null;

  rounds = 0;

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
      .then((r) => {
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
    this.game.setNextPresident().then(() => {
      const president = this.game.currentPresident;
      console.log(`Step 1 Result = ${JSON.stringify(president.user)}`);
      this.txtChan
        .send(
          `The next president is <@${president.user.id}>.\nPlease nominate your chancellor and mention him here!`
        )
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
    console.log('Step 2) Nominate the next Chancellor');
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
        this.txtChan.send(
          `${this.game.currentPresident.user} nominated ${chancellor} as the next chancellor`
        );
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

      // make all votes public
      results.forEach((result) => {
        this.textChannel.send(
          `${result.player.user} voted ${result.yes ? 'YES' : 'NO'}`
        );
      });

      if (noVotes >= yesVotes) {
        console.log(`The chancellor is not voted`);
        // the chancellor has not been voted
        this.txtChan.send(
          `The vote for the next chancellor ${this.game.currentChancellor} has failed.`
        );
        this.game.resetNextChancellor();
        this.game.electionTracker++;
        if (this.game.electionTracker >= 3) {
          this.txtChan.send(
            `You missed three times in a row to select a working government.\nThe chaos spread within your parlament.`
          );
          // TODO: Draw the top Policy and play it!
          this.game.chaosElection = true;
        }
        // begin next round
        this.electionPhaseStart();
      } else {
        console.log(`The chancellor got voted`);
      }
      console.log('END OF ELECTION PHASE');
    });
  }

  voteForNextChancellor(player) {
    const filter = (reaction, user) =>
      ['👍', '👎'].includes(reaction.emoji.name) && !user.bot;

    return new Promise((resolve, reject) => {
      this.userChat(player.user)
        .send(
          `Do you vote for <@${this.game.currentChancellor.user.id}> as the next chancellor?`
        )
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
              sentMessage.reply(
                'you reacted with neither a thumbs up, nor a thumbs down.'
              );
              reject(err);
            });
        });
    });
  }

  get txtChan() {
    return this.client.channels.cache.get(this.textChannel.id);
  }

  userChat(user) {
    return this.client.users.cache.get(user.id);
  }
};
