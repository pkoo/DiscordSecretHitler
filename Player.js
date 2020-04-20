module.exports = class Player {
  _user = null;
  _cards = [];
  _fascist = false;
  _hitler = false;
  _dead = false;

  constructor(player) {
    this._user = player;
  }

  get user() {
    return this._user;
  }

  set fascist(bool) {
    this._fascist = bool;
  }

  set hitler(bool) {
    if (bool) {
      this._hitler = true;
      this._fascist = true;
    } else {
      this._hitler = false;
    }
  }

  gotKilled() {
    this._dead = true;
  }

  get isDead() {
    return this._dead;
  }

  isHitler() {
    return this._hitler;
  }

  isFascist() {
    return this._fascist;
  }
};
