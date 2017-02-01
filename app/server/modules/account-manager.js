// modified account manager to use a postgres implementation for the
// password store



var crypto = require('crypto');
//var MongoDB 	= require('mongodb').Db;
//var Server 		= require('mongodb').Server;
var moment = require('moment');

/*
	ESTABLISH DATABASE CONNECTION
*/
var pglocalurl = 'postgres://joe:abcdef@localhost:5432/startupdefaults';
var dburl = process.env.DATABASE_URL || pglocalurl;

//var dbName = process.env.DB_NAME || 'node-login';
//var dbHost = process.env.DB_HOST || 'localhost'
//var dbPort = process.env.DB_PORT || 27017;

// user
// email
// passHash

//		o.name 		= newData.name;
//		o.email 	= newData.email;
//		o.country 	= newData.country;

var pg = require('pg');
pg.defaults.ssl = true;

/*
pg.connect(dburl, function(err,client,done) {
    if(err) {
        console.log(" here conn err : " + err);
    }
    client.query('SELECT * FROM sdd', function(err, result) {
      done();
*/


function cleanseSQL(s) {
  return s.replace('[^A-Z0-9.@]');
}

// these must be kept in order!
var fieldnames = ['user', 'email', 'pass', 'id', 'ts'];
var fieldnamesNew = ['user', 'email', 'pass', 'id'];

var accounts = {
  save: function (orec, flags, cb) {
		// TODO: better do a modify
    console.log('saving ' + JSON.stringify(orec));
    accounts.remove({ id: orec.id }, function (err) {
      accounts.insert(orec, flags, cb);
    });
  },
  insert: function (orec, flags, cb) {
    var columns = fieldnames.slice(0);
    if (flags.new) {
      columns = fieldnamesNew;
      if (!orec.id) {
        orec.id = getObjectId();
      }
    }
    var query = 'INSERT into users ("' + columns.join('", "') + '")  values (';
		// $1, $2, ...
    var dollarString = columns.map(function (o, iIndex) { return '$' + (iIndex + 1); }).join(', ');

    query = query + dollarString + ');';

    var values = columns.map(function (sCol) {
      return orec[sCol];
    });

		//	   var str = 'INSERT into users (' + presentFields.join(",") + ")  values ("
		//				str = str +	fieldnames.map(function (fn) {
		//						return ' \'' + (orec[fn] || "" )+ '\'';
		//				}).join(',');
		//				str = str  + ');';
    console.log(query);
    pg.connect(dburl, function (err, client, done) {
      client.query(query, values, function (err, result) {
        done();
        if (err) {
          console.error(err);
          cb(err);
        }
        else {
          console.log('inserted');
          cb(undefined, orec);
        }
      });
    });
  },
  remove: function (obj, cb) {
		// {} remove all.
    if (typeof obj === 'object' && !obj.id) {
      pg.connect(dburl, function (err, client, done) {
        if (err) {
          console.log(' here conn err : ' + err);
        }
        client.query('DELETE FROM users', function (err, result) {
          if (err) {
            console.log('ERR in DELETE ALL' + JSON.stringify(err));
            done();
            cb();
            return;
          }
          done();
          cb();
        });
      });
    }
    if (typeof obj === 'object' && obj.id) {
      pg.connect(dburl, function (err, client, done) {
        if (err) {
          console.log(' here conn err : ' + err);
        }
      //  client.query('DELETE FROM users WHERE id EQ $1::text', [obj.id], function (err, result) {
        client.query('DELETE FROM users WHERE id IN ($1)', [obj.id], function (err, result) {
          if (err) {
            console.log('ERR in DELETE with obj id ' + obj.id + ' type: ' + typeof obj.id +  ' -> ' + JSON.stringify(err));
            done();
            cb();
            return;
          }
          done();
          cb();
        });
      });
    }
  },
  findOne: function (obj, cb) {
    pg.connect(dburl, function (err, client, done) {
      if (err) {
        console.log(' here conn err : ' + err);
      }
      client.query('SELECT * FROM users', function (err, result) {
        var filterResult = result.rows.filter(function (oRow) {
          var ok = Object.getOwnPropertyNames(obj).every(function (oName) {
            return obj[oName] === oRow[oName];
          });
          if (ok) {
            return true;
          }
        });
        console.log('looking for ' + JSON.stringify(obj) + ' found' + JSON.stringify(filterResult));
        if (filterResult.length) {
          done();
          cb(undefined, filterResult[0]);
        } else {
          done();
          cb(null);
        }
      });
    });
  },

  find: function (obj, cb) {
		// { $and: [{email:email, pass:passHash}]
    pg.connect(dburl, function (err, client, done) {
      if (err) {
        console.log(' here conn err : ' + err);
      }
      client.query('SELECT * FROM users', function (err, result) {
        var filterResult = result.rows.filter(function (oRow) {
          if (obj['$and']) {
            var email = obj['$and'][0].email;
            var pass = obj['$and'][0].pass;
            return (oRow.email === email && oRow.pass == pass);
          } else if (obj['$or']) {
            console.log('or not implemented');
          } else if (Array.isArray(obj)) {
				// filter for all present values
            console.log('get every : ' + obj);
            var r = obj.every(function (o) {
              var s = Object.getOwnPropertyNames(o)[0];
              return (oRow[s] == obj[s]);
            });
            return r;
          } else if ((obj === undefined) || Object.getOwnPropertyNames(obj).length === 0) {
            return true;
          }
        });

        if (filterResult.length) {
          done();
          cb(undefined, filterResult);
        } else {
          done();
          cb(null);
        }
      });
    });
  }

};

/*
var db = new MongoDB(dbName, new Server(dbHost, dbPort, {auto_reconnect: true}), {w: 1});
db.open(function(e, d){
	if (e) {
		console.log(e);
	} else {
		if (process.env.NODE_ENV == 'live') {
			db.authenticate(process.env.DB_USER, process.env.DB_PASS, function(e, res) {
				if (e) {
					console.log('mongo :: error: not authenticated', e);
				}
				else {
					console.log('mongo :: authenticated and connected to database :: "'+dbName+'"');
				}
			});
		}	else{
			console.log('mongo :: connected to database :: "'+dbName+'"');
		}
	}
});

var accounts = db.collection('accounts');
*/

/* login validation methods */

exports.autoLogin = function (user, pass, callback) {
	/*pg.connect(dburl, function(err,client,done) {
    	if(err) {
        	console.log(" here conn err : " + err);
    	}
    	client.query('SELECT * FROM sdd', function(err, result) {
			var done = false;
      		result.rows.forEach(function(oRow) {
				if(oRow.respuserid == user) {
					if(oRow.tpara == pass) {
						callback({ user : oRow.respuserid, pass : oRow.tpara});
						done = true;
					} else {
						callback(null);
						done = true;
					}
				}
			});
			if(!done) {
				return callback(null);
			}
			done();
		});
	}); */

  accounts.findOne({ user: user }, function (e, o) {
    if (o) {
      o.pass == pass ? callback(o) : callback(null);
    } else {
      callback(null);
    }
  });
};

exports.manualLogin = function (user, pass, callback) {
	/*	pg.connect(dburl, function(err,client,done) {
    	if(err) {
        	console.log(" here conn err : " + err);
    	}
    	client.query('SELECT * FROM sdd', function(err, result) {
			var done = false;
      		result.rows.forEach(function(oRow) {
				if(oRow.respuserid == user) {
					if(oRow.tpara == pass) {
						callback({ user : oRow.respuserid, pass : oRow.tpara});
						done = true;
					} else {
						callback(null);
						done = true;
					}
				}
			});
			if(!done) {
				return callback('user-not-found');
			}
			done();
		});
	}); */
  accounts.findOne({ user: user }, function (e, o) {
    if (o == null) {
      callback('user-not-found');
    } else {
      validatePassword(pass, o.pass, function (err, res) {
        if (res) {
          callback(null, o);
        } else {
          callback('invalid-password');
        }
      });
    }
  });
};

/* record insertion, update & deletion methods */

exports.addNewAccount = function (newData, callback) {
  accounts.findOne({ user: newData.user }, function (e, o) {
    if (o) {
      callback('username-taken');
    } else {
      accounts.findOne({ email: newData.email }, function (e, o) {
        if (o) {
          callback('email-taken');
        } else {
          saltAndHash(newData.pass, function (hash) {
            newData.pass = hash;
            accounts.insert(newData, { safe: true, new: true }, callback);
          });
        }
      });
    }
  });
};

exports.updateAccount = function (newData, callback) {
  // we never output a password
  // console.log('trying to update' + newData.id + ' with ' + JSON.stringify(newData));
  accounts.findOne({ id: getObjectId(newData.id) }, function (e, o) {
    if(newData.user)  {
      o.user 	= newData.user;
    }
    o.email = newData.email;
    if (newData.pass == '') {
      accounts.save(o, { safe: true }, function (e) {
        if (e) {
          callback(e);
        }
        else {
          callback(null, o);
        }
      });
    } else {
      saltAndHash(newData.pass, function (hash) {
        o.pass = hash;
        accounts.save(o, { safe: true }, function (e) {
          if (e) {
            callback(e);
          }
          else{
					  callback(null, o);
          }
        });
      });
    }
  });
};

exports.updatePassword = function (email, newPass, callback) {
  accounts.findOne({ email: email }, function (e, o) {
    if (e) {
      callback(e, null);
    } else {
      saltAndHash(newPass, function (hash) {
        o.pass = hash;
        accounts.save(o, { safe: true }, callback);
      });
    }
  });
};

/* account lookup methods */

exports.deleteAccount = function (id, callback) {
  accounts.remove({ id: getObjectId(id) }, callback);
};

exports.getAccountByEmail = function (email, callback) {
  accounts.findOne({ email: email }, function (e, o) { callback(o); });
};

exports.validateResetLink = function (email, passHash, callback) {
  accounts.find({ $and: [{ email: email, pass: passHash }] }, function (e, o) {
    callback(o ? 'ok' : null);
  });
};

exports.getAllRecords = function (callback) {
  accounts.find({},
		function (e, res) {
  if (e) callback(e);
  else callback(null, res);
});
};

exports.delAllRecords = function (callback) {
  accounts.remove({}, callback); // reset accounts collection for testing //
};

/* private encryption & validation methods */

var generateSalt = function () {
  var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
  var salt = '';
  for (var i = 0; i < 10; i++) {
    var p = Math.floor(Math.random() * set.length);
    salt += set[p];
  }
  return salt;
};

var md5 = function (str) {
  return crypto.createHash('md5').update(str).digest('hex');
};

var saltAndHash = function (pass, callback) {
  var salt = generateSalt();
  callback(salt + md5(pass + salt));
};

var validatePassword = function (plainPass, hashedPass, callback) {
  var salt = hashedPass.substr(0, 10);
  var validHash = salt + md5(plainPass + salt);
  callback(null, hashedPass === validHash);
};

var getObjectId = function (id) {   //TODO understand this
  if (!id) {
    return Date.now().toString();
  }
  return id; // new require('mongodb').ObjectID(id);
};

var findById = function (id, callback) {
  accounts.findOne({ id: getObjectId(id) },
		function (e, res) {
  if (e) callback(e);
  else callback(null, res);
});
};

var findByMultipleFields = function (a, callback) {
	// this takes an array of name/val pairs to search against {fieldName : 'value'} //
  accounts.find({ $or: a }).toArray(
		function (e, results) {
  if (e) callback(e);
  else callback(null, results);
});
};
