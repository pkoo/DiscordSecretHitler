const Player = require('./Player');

module.exports = class SecretHitler {
  PolicyCard = {
    LIBERAL: 'LIBERAL',
    FASCIST: 'FASCIST',
  };

  players = [];

  hitler = null;

  drawPolicies = []; // 6 liberal, 11 fascist
  discardedPolicies = [];
  handPolicies = [];

  liberalBoard = 0;
  fascistBoard = 0;

  specialElection = false;
  chaosElection = false;

  currentPresident = null;
  lastPresident = null;
  currentChancellor = null;
  lastChancellor = null;
  electionTracker = 0;

  rounds = 1;

  canVeto = () => this.fascistBoard >= 5;

  constructor(players = []) {
    players.forEach((p) => this.addPlayer(p));
  }

  addPlayer(player) {
    if (this.players.map((p) => p.user).indexOf(player) === -1) {
      this.players.push(new Player(player));
      return true;
    }
    return false;
  }

  get alivePlayers() {
    return this.players.filter((p) => !p.isDead);
  }

  async startGame() {
    if (this.players.length < 5) throw new Error('Not enough players');
    // randomize player seats
    shuffle(this.players);
    // randomize copy of players for setting the party
    const tmpPlayers = [...this.players];
    shuffle(tmpPlayers);
    /*
      set party accordingliy
      5/6P  => 3/4 Liberal, 1 Fascist, 1 Hitler
      7/8P  => 5/6 Liberal, 2 Fascist, 1 Hitler
      9/10P => 6/7 Liberal, 3 Fascist, 1 Hitler
    */
    tmpPlayers.pop().hitler = true;
    if (this.players.length < 5) {
      tmpPlayers.pop().fascist = true;
    } else if (this.players.length < 9) {
      tmpPlayers.pop().fascist = true;
      tmpPlayers.pop().fascist = true;
    } else {
      tmpPlayers.pop().fascist = true;
      tmpPlayers.pop().fascist = true;
      tmpPlayers.pop().fascist = true;
    }
    // add and randomize the policies
    for (let index = 0; index < 11; index++) {
      this.drawPolicies.push(this.PolicyCard.FASCIST);
    }
    for (let index = 0; index < 6; index++) {
      this.drawPolicies.push(this.PolicyCard.LIBERAL);
    }
    shuffle(this.drawPolicies);
    console.log(`Finished preparing the game.\nPlayers => ${JSON.stringify(this.players)}`);
  }

  async setNextPresident() {
    this.rounds++;

    // on GameStart, the last und current President are null
    // set next President (currentPresident === null ? random player)
    if (this.currentPresident === null) {
      this.currentPresident = shuffle([...this.alivePlayers])[0];
      return this.currentPresident;
    }

    this.lastPresident = this.currentPresident;
    const nextIndex = this.alivePlayers.indexOf(this.lastPresident) + 1;
    this.currentPresident = nextIndex >= this.alivePlayers.length ? this.alivePlayers[0] : this.alivePlayers[nextIndex];
    return this.currentPresident;
  }

  async setNextChancellor(discordChancellor) {
    const chancellor = this.players.filter((p) => p.user.id === discordChancellor.id)[0];

    const moreThan5Alive = this.alivePlayers.length >= 5;
    const chancellorIsFormerPresident = this.lastPresident === chancellor;
    const chancellorIsFormerChancellor = this.currentChancellor === chancellor;
    const chancellorIsDead = chancellor.isDead;

    // Chaos election says everyone os eligable as President
    if (!this.chaosElection) {
      if (
        chancellorIsDead ||
        chancellorIsFormerChancellor ||
        (moreThan5Alive && chancellorIsFormerPresident) // if fewer than 5 are alive, the former president can be chancellor
      )
        throw new Error('This chancellor can not be nominated');
    }

    this.lastChancellor = this.currentChancellor;
    this.currentChancellor = chancellor;
  }

  resetNextChancellor() {
    this.currentChancellor = this.lastChancellor;
  }

  chancellorVoteFailed() {
    return new Promise((resolve, reject) => {
      this.resetNextChancellor();
      this.electionTracker++;
      if (this.electionTracker < 3) {
        resolve(false);
      }
      this.chaosElection = true;
      this.handPolicies = [this.drawPolicies.pop()];
      this.putPolicy().then((policy) => resolve(policy));
    });
  }

  async putPolicy() {
    if (this.handPolicies.length > 1) throw new Error('There are still more than one policy left in hand');

    const policy = this.handPolicies.pop();

    if (policy === this.PolicyCard.LIBERAL) {
      this.liberalBoard++;
    } else if (policy === this.PolicyCard.FASCIST) {
      this.fascistBoard++;
    } else {
      throw new Error('That was not a valid card to play');
    }
    return policy;
  }

  drawHandPolicies() {
    if (this.handPolicies.length > 0) return;
    const arr = [this.drawPolicies.pop(), this.drawPolicies.pop(), this.drawPolicies.pop()];

    if (this.drawPolicies.length < 3 && this.discardedPolicies.length > 0) {
      this.drawPolicies = shuffle([...this.drawPolicies, ...this.discardedPolicies]);
      this.discardedPolicies = [];
    }
    this.handPolicies = arr;
    return this.handPolicies;
  }

  async discardHandPolicy(policy) {
    if (this.handPolicies.length >= 2 && this.handPolicies.includes(policy)) {
      const position = this.handPolicies.findIndex((p) => p === policy);
      this.handPolicies.splice(position, 1);
      return;
    }
    throw new Error(`Could not discard ${policy}`);
  }

  killPlayer(discordUser) {
    const victim = this.players.filter((p) => p.user.id === discordUser.id)[0];
    victim.gotKilled();
    return victim.isHitler();
  }

  isPlayerFascist(discordUser) {
    const player = this.players.filter((p) => p.user.id === discordUser.id)[0];
    return player.isFascist();
  }

  electionPhase() {
    // set next President (currentPresident === null ? random player)
    // President nominates Chancellor
    // Players vote on Chancellor
    // yes.count === no.count || yes.count < no.count ? electionCounter++; electionPhase();
    // 3 Fascists policies && new Chancellor === Hitler ? Reveal Hitler & End Game : Reveal NOT Hitler;
  }

  legislativePhase() {
    // draw 3 policies to President
    // President selects one to discard, gives 2 to Chancellor
    // Chancellor selects one to discard, the other Policy gets played
  }

  executivePhase() {}
};

function shuffle(array) {
  array.sort(() => Math.random() - 0.5);
  return array;
}
