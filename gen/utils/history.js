'use strict';

var debug = require('debug')('history');

function History(options) {
  this._default = options && options.default || '';
  this._data = [];
  this._save = options && options.save;
  this._length = options && options.length || 20;
  this._pos = typeof options.pos === 'number' ? options.pos : this._data.length;
  this._pos = Math.max(0, Math.min(this._data.length, this._pos));
  var that = this;
  if (options && typeof options.load === 'function') {
    options.load(function (err, oData) {
      if (err) {
        throw err;
      }
      if (oData && oData.entries) {
        if (that._data.length === 0) {
          that._data = oData.entries || [];
          that._pos = oData.pos;
        } else {
          that._data = oData.entries.concat(that._data);
          that._pos = that._pos + oData.entries.length;
          that._shiftIfNeeded();
        }
      }
    });
  }
  debug('here pos ' + this._pos);
}

History.prototype.get = function () {
  if (this._pos >= this._data.length) {
    return this._default;
  }
  return this._data[this._pos];
};

History.prototype.forward = function () {
  if (this._pos === this._data.length) {
    return this.get();
  }
  if (this._pos === this._data.length - 1) {
    return this.get();
  }
  this._state = 'history';
  this._pos = Math.min(this._data.length, this._pos + 1);
  return this.get();
};

History.prototype._shiftIfNeeded = function () {
  if (this._data.length > this._length) {
    this._pos = Math.max(0, this._pos - 1);
    debug('shifting array' + JSON.stringify(this._data));
    this._data = this._data.slice(1);
    debug('shifting array' + JSON.stringify(this._data) + ' new pos:' + this._pos);
    this.save();
  }
};

History.prototype.push = function (oNext) {
  if (oNext === null || oNext === undefined) {
    throw Error('Object cannot be null or undefined');
  }
  this._state = 'pushed';
  if (oNext === this.get()) {
    if (this._data._length) {
      if (oNext !== this._data[this._data.length - 1]) {
        this._data.push(oNext);
        this._shiftIfNeeded();
        this.save();
        return;
      } else {
        // we added the last thing again, do not increase
        return;
      }
    } else {
      this._data.push(oNext);
      this._shiftIfNeeded();
      this.save();
      return;
    }
  } else {
    // the new entry is not the current one
    if (this._data.length && this._pos === this._data.length - 1) {
      debug('should not get here');
      return;
    } else {
      this._data.push(oNext);
      this._pos = this._pos + 1;
      debug('pushing ' + oNext + 'into ' + JSON.stringify(this._data));
      this._shiftIfNeeded();
      debug('after push ' + this._pos + '/' + JSON.stringify(this._data));
      this.save();
      return;
    }
  }
};

History.prototype.save = function () {
  if (this._save) {
    this._save({
      pos: this._pos,
      entries: this._data.slice(0)
    }, function (err) {
      if (err) {
        debug('error' + err);
      }
    });
  }
};
/*
History.prototype.set = function (oCurrent) {
  if (oCurrent !== this.get()) {
    this._current = oCurrent
  }
}
*/
History.prototype.backward = function () {
  if (this._data.length === 0) {
    return this.get();
  }
  if (this._state === 'pushed') {
    this._state = 'history';
    if (this._pos < this._data.length) {
      return this.get();
    }
    this._pos = Math.max(0, this._pos - 1);
    return this.get();
  }
  this._state = 'history';
  this._pos = Math.max(0, this._pos - 1);
  debug('pos after backward ' + this._pos);
  return this.get();
};

module.exports = History;