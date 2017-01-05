/* When the user clicks on the button,
toggle between hiding and showing the dropdown content */
function doExpand() {
  console.log('do expand');
  document.getElementById('aDropDown').classList.toggle('show');
  console.log('expanded');
}

// Close the dropdown if the user clicks outside of it
window.onclick = function(e) {
  if (!e.target.matches('.dropbtn')) {
    var dropdowns = document.getElementsByClassName('dropdown-content');
    for (var d = 0; d < dropdowns.length; d++) {
      var openDropdown = dropdowns[d];
      console.log('remove show');
      if (openDropdown.classList.contains('show')) {
        openDropdown.classList.remove('show');
      }
    }
  }
};

// code from source

function require() {
  return function() {
    return function() {};
  };
}
window.module = {};

// code from history
var debug = require('debug')('history');

function History(options) {
  this._default = options && options.default || '';
  this._data = [];
  this._save = options && options.save;
  this._length = options && options.length || 20;
  this._pos = (typeof options.pos === 'number') ? options.pos : (this._data.length);
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
    if (this._data.length) {
      debug('this.data leng' + this._data[this._data.length - 1]);
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


/// end of history

// code from source;

window.MyHistory = module.exports;
module = undefined;
    // You can also require other files to run in this process
    //var hs = require('./gen/utils/history.js');
    //var as = require('./gen/utils/appdata.js');
    //var ad = new as.PersistenceHandle("fdevstart","history.json")
function saveHistory(oData) {
  window.localStorage.setItem('fdevStart', JSON.stringify(oData));
}
function loadHistory(cb) {
  try {
    var u = window.localStorage.getItem('fdevStart');
    u = u && JSON.parse(u);
  } catch (e) {
    u = undefined;
  }
  cb(undefined, u);
}

window.inputHistory = new  window.MyHistory({
  length : 80,
  save: saveHistory,
  load: loadHistory
});


// textagg
!function(e,t){'function'==typeof define&&define.amd?define([],t):'object'==typeof module&&module.exports?module.exports=t():e.Autogrow=t();}(this,function(){return function(e,t){var o=this;
  void 0===t&&(t=999),o.getOffset=function(e){for(var t=window.getComputedStyle(e,null),o=['paddingTop','paddingBottom'],n=0,i=0;i<o.length;i++)n+=parseInt(t[o[i]]);
    return n;},o.autogrowFn=function(){var t=0,i=!1;
      return e.scrollHeight-n>o.maxAllowedHeight?(e.style.overflowY='scroll',t=o.maxAllowedHeight):(e.style.overflowY='hidden',e.style.height='auto',t=e.scrollHeight-n,i=!0),e.style.height=t+'px',i;};
  var n=o.getOffset(e);
  o.rows=e.rows||1,o.lineHeight=e.scrollHeight/o.rows-n/o.rows,o.maxAllowedHeight=o.lineHeight*t-n,e.addEventListener('input',o.autogrowFn);};});


//

// https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values
// "Enter"
// "ArrowUp"
// "ArrowDown"

var Autogrow = window.Autogrow;
//require('./lib/textareaag.js');
//Then initialize the magic:

var textarea = document.getElementById('growme');
var growingTextarea = new Autogrow(textarea);

// keyup
// change
// paste
function updateText(eText) {
  var u = textarea.value;
}


function makeLi(value, sType) {
  if(sType !== 'request' && sType !== 'response') {
    throw new Error('illegal type');
  }
  var li = document.createElement('li');
  var div = document.createElement('div');
  li.appendChild(div);
  li.classList.add('common');
  li.classList.add(sType);
  div.classList.add('common');
  div.classList.add(sType);
  div.innerText = value;
  textarea.parentNode.parentNode.insertBefore(li,textarea.parentNode);
  window.scrollTo(0,document.body.scrollHeight);
}

function makeResponse(sLine) {
  makeLi(sLine,'response');
}

function makeRequest(sLine) {
  makeLi(sLine,'request');
}

//htmlconnector.setAnswerHook(function(sLine) {
//    makeResponse(sLine);
//});

function moveCaretToEnd(el) {
  if (typeof el.selectionStart == 'number') {
    el.selectionStart = el.selectionEnd = el.value.length;
  } else if (typeof el.createTextRange != 'undefined') {
      el.focus();
      var range = el.createTextRange();
      range.collapse(false);
      range.select();
    }
}
function moveCursorToEnd(textarea) {
  moveCaretToEnd(textarea);
    // Work around Chrome's little problem
  window.setTimeout(function() {
    moveCaretToEnd(textarea);
  }, 1);
}

textarea.addEventListener('change',updateText);
textarea.addEventListener('paste',updateText);
textarea.addEventListener('keyup',updateText);

textarea.addEventListener('keydown',function(e) {
  if (e.key === 'F12') {
    //remote.getCurrentWindow().webContents.toggleDevTools();
  }
  if (e.key === 'Enter') {
    var value = textarea.value;
    inputHistory.push(value);
    textarea.value = '';
    var li = document.createElement('li');
    var div = document.createElement('div');
    li.appendChild(div);
    li.classList.add('common');
    li.classList.add('request');
    div.classList.add('common');
    div.classList.add('request');
    div.innerText = value;
    textarea.parentNode.parentNode.insertBefore(li,textarea.parentNode);
    setTimeout(function() {
      textarea.value = '';
      htmlconnector.processMessage(value.substring(0,140));
    }, 10);
  }
  else
 if ( e.key === 'ArrowUp') {
   inputHistory.backward();
   textarea.value = inputHistory.get();
   moveCursorToEnd(textarea);
 }
 else
 if ( e.key === 'ArrowDown') {
   var res = inputHistory.forward();
   textarea.value = inputHistory.get();
   moveCursorToEnd(textarea);
 } else {


 }
  //alert("got a keypress" + JSON.stringify({ key : e.key}) + " x " + e.keyCode + " / " +
  //(e.key === "ArrowUp" )
  //);
}, false);


document.addEventListener('DOMContentLoaded', function(event) {
  //do work
    // WebSocket
  var socket = io.connect();
  socket.on('wosap', function (data) {
    makeResponse(data.text);
    if(data.command && data.command.url) {
      window.open(data.command.url); // ,'_blank');
    }
    /*
      var zeit = new Date(data.zeit);
      $('#content').append(
            $('<li></li>').append(
                // Uhrzeit
                $('<span>').text('[' +
                    (zeit.getHours() < 10 ? '0' + zeit.getHours() : zeit.getHours())
                    + ':' +
                    (zeit.getMinutes() < 10 ? '0' + zeit.getMinutes() : zeit.getMinutes())
                    + '] '
                ),
                // Name
                $('<b>').text(typeof(data.name) != 'undefined' ? data.name + ': ' : ''),
                // Text
                $('<span>').text(data.text))
        );
        // nach unten scrollen
      $('body').scrollTop($('body')[0].scrollHeight);

  */
  });
    // Nachricht senden
  function processMessage(sString){
        // Eingabefelder auslesen
    var name = 'unkown';
    var text = sString;
    var conversationid = document.getElementsByName('conversationid')[0].content;
      // send
    socket.emit('wosap', { name: name, text: text, conversationid : conversationid });
  }
    // bei einem Klick
  window.htmlconnector = {
    processMessage : processMessage
  };
});
