function History (options) {
  this._default = options && options.default || ''
  this._data = []
  this._length = options && options.length || 20
  this._pos = (typeof options.pos === 'number') ? options.pos : (this._data.length)
  this._pos = Math.max(0, Math.min(this._data.length, this._pos))
  console.log('here pos ' + this._pos)
}

History.prototype.get = function () {
  if (this._pos >= this._data.length) {
    return this._default
  }
  return this._data[this._pos]
}

History.prototype.forward = function () {
  if (this._pos === this._data.length) {
    return this.get()
  }
  if (this._pos === this._data.length - 1) {
    return this.get()
  }
  this._state = 'history'
  this._pos = Math.min(this._data.length, this._pos + 1)
  return this.get()
}

History.prototype._shiftIfNeeded = function () {
  if (this._data.length > this._length) {
    this._pos = Math.max(0, this._pos - 1)
    console.log('shifting array' + JSON.stringify(this._data))
    this._data = this._data.slice(1)
    console.log('shifting array' + JSON.stringify(this._data) + ' new pos:' + this._pos)
  }
}

History.prototype.push = function (oNext) {
  if (oNext === null || oNext === undefined) {
    throw Error('Object cannot be null or undefined')
  }
  this._state = 'pushed'
  if (oNext === this.get()) {
    if (this._data._length) {
      if (oNext !== this._data[this._data.length - 1]) {
        this._data.push(oNext)
        this._shiftIfNeeded()
        return
      } else {
        // we added the last thing again, do not increase
        return
      }
    } else {
      this._data.push(oNext)
      this._shiftIfNeeded()
      return
    }
  } else {
    // the new entry is not the current one
    if (this._data.length && this._pos === this._data.length - 1) {
      console.log('should not get here')
      return
    } else {
      this._data.push(oNext)
      this._pos = this._pos + 1
      console.log('pushing ' + oNext + 'into ' + JSON.stringify(this._data))
      this._shiftIfNeeded()
      console.log('after push ' + this._pos + '/' + JSON.stringify(this._data))
      return
    }
  }
}

History.prototype.set = function (oCurrent) {
  if (oCurrent !== this.get()) {
    this._current = oCurrent
  }
}

History.prototype.backward = function () {
  if (this._data.length === 0) {
    return this.get()
  }
  if (this._state === 'pushed') {
    this._state = 'history'
    if (this._pos < this._data.length) {
      return this.get()
    }
    this._pos = Math.max(0, this._pos - 1)
    return this.get()
  }
  this._state = 'history'
  this._pos = Math.max(0, this._pos - 1)
  console.log('pos after backward ' + this._pos)
  return this.get()
}

module.exports = History
