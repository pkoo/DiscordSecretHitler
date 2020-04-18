const Player = require('./Player');

module.exports = class SecretHitler {
  players = [];

  hitler = null;

  drawPolicies = []; // 6 liberal, 11 fascist
  discardedPolicies = [];

  liberalBoard = 0;
  fascistBoard = 0;

  specialElection = false;
  chaosElection = false;

  currentPresident = null;
  lastPresident = null;
  currentChancellor = null;
  lastChancellor = null;
  electionTracker = 0;
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
      5/6P  => 3/4 Liberal, 1 Facist, 1 Hitler
      7/8P  => 5/6 Liberal, 2 Facist, 1 Hitler
      9/10P => 6/7 Liberal, 3 Facist, 1 Hitler
    */
    tmpPlayers.pop().hitler = true;
    if (this.players.length < 5) {
      tmpPlayers.pop().facist = true;
    } else if (this.players.length < 9) {
      tmpPlayers.pop().facist = true;
      tmpPlayers.pop().facist = true;
    } else {
      tmpPlayers.pop().facist = true;
      tmpPlayers.pop().facist = true;
      tmpPlayers.pop().facist = true;
    }
    // add and randomize the policies
    for (let index = 0; index < 11; index++) {
      this.drawPolicies.push('FASCIST');
    }
    for (let index = 0; index < 6; index++) {
      this.drawPolicies.push('LIBERAL');
    }
    shuffle(this.drawPolicies);
    console.log(
      `Finished preparing the game.\nPlayers => ${JSON.stringify(this.players)}`
    );
  }

  async setNextPresident() {
    // on GameStart, the last und current President are null
    // set next President (currentPresident === null ? random player)
    if (this.currentPresident === null) {
      this.currentPresident = shuffle([...this.alivePlayers])[0];
      return this.currentPresident;
    }

    this.lastPresident = this.currentPresident;
    const nextIndex = this.alivePlayers.indexOf(this.lastPresident) + 1;
    this.currentPresident =
      nextIndex >= this.alivePlayers.length
        ? this.alivePlayers[0]
        : this.alivePlayers[nextIndex];
    return this.currentPresident;
  }

  async setNextChancellor(discordChancellor) {
    const chancellor = this.players.filter(
      (p) => p.user.id === discordChancellor.id
    )[0];

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

  electionPhase() {
    // set next President (currentPresident === null ? random player)
    // President nominates Chancellor
    // Players vote on Chancellor
    // yes.count === no.count || yes.count < no.count ? electionCounter++; electionPhase();
    // 3 Facists policies && new Chancellor === Hitler ? Reveal Hitler & End Game : Reveal NOT Hitler;
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
