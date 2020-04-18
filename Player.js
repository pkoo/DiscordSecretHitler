module.exports = class Player {
  _user = null;
  _cards = [];
  _facist = false;
  _hitler = false;
  _dead = false;

  constructor(player) {
    this._user = player;
  }

  get user() {
    return this._user;
  }

  set facist(bool) {
    this._facist = bool;
  }

  set hitler(bool) {
    if (bool) {
      this._hitler = true;
      this._facist = true;
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

  isFacist() {
    return this._facist;
  }
};
