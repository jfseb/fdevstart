
var AM = require('./modules/account-manager');
var EM = require('./modules/email-dispatcher');

var SR = require('./modules/getstats');

var debug = require('debug');
var debuglog = debug('routes');
var uuid = require('node-uuid');

var cookieTime = 32*24*60*60; // 32 days in seconds

module.exports = function(app) {

// main login page
  app.get('/', function(req, res){
		// check if the user's credentials are saved in a cookie //
    if (req.cookies.user == undefined || req.cookies.pass == undefined){
      res.redirect('/home');
    }	else{
			// attempt automatic login //
      AM.autoLogin(req.cookies.user, req.cookies.pass, function(o){
        if (o != null){
				    req.session.user = o;
          req.session.altData = { 'ticket' : '1234' };
          res.redirect('/home');
        }	else{
          res.render('login', { title: 'Hello - Please Login To Your Account' });
        }
      });
    }
  });

  app.get('/login', function(req, res){
	// check if the user's credentials are saved in a cookie //
    if (req.cookies.user == undefined || req.cookies.pass == undefined){
      res.render('login', { pagetitle : 'Login', title: 'Hello - Please Login To Your Account' });
    }	else{
	// attempt automatic login //
      AM.autoLogin(req.cookies.user, req.cookies.pass, function(o){
        if (o != null){
				    req.session.user = o;
          req.session.altData = { 'ticket' : '1234' };
          res.redirect('/home');
        }	else{
          res.render('login', { title: 'Hello - Please Login To Your Account' });
        }
      });
    }
  });

  app.post('/login', function(req, res){
    AM.manualLogin(req.body['Username'], req.body['Password'], function(e, o){
      if (!o){
        res.status(400).send(e);
      }	else{
        debuglog('got user' + JSON.stringify(o));
        req.session.user = o;
        if (req.body['remember-me'] == 'true'){
          //console.log('seeting cookie time to ' + cookieTime + ' ' + new Date(Date.now()+cookieTime) );
          res.cookie('user', o.user, { expires : new Date(Date.now()+cookieTime*1000) });
          res.cookie('pass', o.pass, { expires : new Date(Date.now()+cookieTime*1000) });
        }
        res.status(200).send(o);
      }
    });
  });

  app.post('/', function(req, res){
    AM.manualLogin(req.body['Username'], req.body['Password'], function(e, o){
      if (!o){
        res.status(400).send(e);
      }	else{
        req.session.user = o;
        if (req.body['remember-me'] == 'true'){
          res.cookie('user', o.user, {  expires : new Date(Date.now()+cookieTime*1000) });
          res.cookie('pass', o.pass, {  expires : new Date(Date.now()+cookieTime*1000) });
        }
        res.status(200).send(o);
      }
    });
  });

  app.get('/home', function(req, res) {
    if (false && req.session.user == null){
	// if user is not logged-in redirect back to login page //
      res.redirect('/');
    }	else{
      debuglog('at home ' + JSON.stringify(req.session));
      res.render('home', {
        user : (req.session.user && req.session.user.user) || undefined,
        title : 'abot',
        conversationid : uuid.v4(),
        udata : req.session.user,
        altData : req.session.altData
      });
    }
  });

  app.get('/about', function(req, res) {
    res.render('about', {
      pagetitle : 'about',
      user : (req.session.user && req.session.user.user) || undefined,
      title : 'wosap about',
      udata : req.session.user,
      altData : req.session.altData
    });
  });

  app.get('/whatsnew', function(req, res) {
    res.render('whatsnew', {
      pagetitle : 'whatsnew',
      user : (req.session.user && req.session.user.user) || undefined,
      title : 'wosap: what\'s new',
      udata : req.session.user,
      altData : req.session.altData
    });
  });


  app.get('/termsofuse', function(req, res) {
    res.render('termsofuse', {
      pagetitle : 'Terms of use',
      user : (req.session.user && req.session.user.user) || undefined,
      title : 'abot',
      udata : req.session.user,
      altData : req.session.altData
    });
  });

  app.get('/legal_en', function(req, res) {
    res.render('legal_en', {
      pagetitle : 'Legal Disclosure, Disclaimer and Privacy Statement',
      user : (req.session.user && req.session.user.user) || undefined,
      title : 'abot',
      udata : req.session.user,
      altData : req.session.altData
    });
  });

  app.get('/legal_de', function(req, res) {
    res.render('legal_de', {
      pagetitle : 'Impressum, Haftungsausschluss und Datenschutzerkl&auml;rung',
      user : (req.session.user && req.session.user.user) || undefined,
      title : 'abot',
      udata : req.session.user,
      altData : req.session.altData
    });
  });

// logged-in user homepage //


  app.get('/settings', function(req, res) {
    if (req.session.user == null){
	// if user is not logged-in redirect back to login page //
      res.redirect('/');
    }	else{
      res.render('settings', {
        pagetitle : 'settings',
        userid : (req.session.user && req.session.user.user) || '',
        title : 'Control Panel',
        udata : req.session.user,
        altData : req.session.altData
      });
    }
  });

  app.post('/settings', function(req, res){
    if (req.session.user == null){
      res.redirect('/');
    }	else {
      debuglog('here the user' + JSON.stringify(req.session.user));
      AM.updateAccount({
        id		: req.session.user.id,
        user	: req.body['Username'],
        email	: req.body['email'],
        pass	: req.body['Password']
      }, function(e, o){
        if (e){
          res.status(400).send('error-updating-account');
        }	else{
          req.session.user = o;
			// update the user's login cookies if they exists //
          if (req.cookies.user != undefined && req.cookies.pass != undefined){
            res.cookie('user', o.user, {  expires : new Date(Date.now()+cookieTime*1000) });
            res.cookie('pass', o.pass, {  expires : new Date(Date.now()+cookieTime*1000) });
          }
          res.status(200).send('ok');
        }
      });
    }
  });

  app.post('/logout', function(req, res){
    res.clearCookie('user');
    res.clearCookie('pass');
    req.session.destroy(function(e){ res.status(200).send('ok'); });
  });

  app.get('/logoff', function(req, res){
    res.clearCookie('user');
    res.clearCookie('pass');
    req.session.destroy(function(e){
      res.redirect('/');
	    });
  });

// creating new accounts //

  app.get('/signup', function(req, res) {
    res.render('signup', {
      pagetitle : 'Singup',
      title: 'Signup' });
  });

  app.post('/signup', function(req, res){
    AM.addNewAccount({
      email 	: req.body['email'],
      user 	: req.body['Username'],
      pass	: req.body['Password']
    }, function(e){
      if (e){
        res.status(400).send(e);
      }	else{
        res.status(200).send('ok');
      }
    });
  });

// password reset //

  app.post('/lost-password', function(req, res){
	// look up the user's account via their email //
    AM.getAccountByEmail(req.body['email'], function(o){
      if (o){
        EM.dispatchResetPasswordLink(o, function(e, m){
				// this callback takes a moment to return //
				// TODO add an ajax loader to give user feedback //
          if (!e){
            res.status(200).send('ok');
          }	else{
            for (k in e) debuglog('ERROR : ', k, e[k]);
            res.status(400).send('unable to dispatch password reset');
          }
        });
      }	else{
        res.status(400).send('email-not-found');
      }
    });
  });

  app.get('/reset-password', function(req, res) {
    var email = req.query['e'];
    var passH = req.query['p'];
    AM.validateResetLink(email, passH, function(e){
      if (e != 'ok'){
        res.redirect('/');
      } else{
	// save the user's email in a session instead of sending to the client //
        req.session.reset = { email:email, passHash:passH };
        res.render('reset', { title : 'Reset Password' });
      }
    });
  });

  app.post('/reset-password', function(req, res) {
    var nPass = req.body['Password'];
	// retrieve the user's email from the session to lookup their account and reset password //
    var email = req.session.reset.email;
	// destory the session immediately after retrieving the stored email //
    req.session.destroy();
    AM.updatePassword(email, nPass, function(e, o) {
      if (o) {
        res.status(200).send('ok');
      }	else {
        res.status(400).send('unable to update password');
      }
    });
  });

// TODO disable
// view & delete accounts //

  app.get('/print', function(req, res) {
    AM.getAllRecords( function(e, accounts){
      res.render('print', { title : 'Account List', accts : accounts });
    });
  });
  app.get('/prints', function(req, res) {
    SR.getStats( function(a, accounts){
      console.log('here res ' + JSON.stringify(accounts));
      res.render('prints', { title : 'stats', stats : accounts });
    });
  });

  app.post('/delete', function(req, res){
    AM.deleteAccount(req.body.id, function(e, obj){
      if (!e){
        res.clearCookie('user');
        res.clearCookie('pass');
        req.session.destroy(function(e){ res.status(200).send('ok'); });
      }	else{
        res.status(400).send('record not found');
      }
	    });
  });

  ['Cosmos','IUPAC','Philosophers_elements', 'SOBJ_Tables',  'Fiori_Backend_Catalogs', 'TWF_fields','TWF_countries',  'SAP_Transaction_codes', 'FioriBOM','GeneticDNA'].forEach(function(sPage) {
    app.get('/domains/' + sPage, function(req, res) {
      res.render('models/' + sPage, {
        pagetitle : 'domain ' + sPage,
        user : (req.session.user && req.session.user.user) || undefined,
        title : 'domain ' + sPage,
        udata : req.session.user,
        altData : req.session.altData
      });
    });
  });

// TODO disable
/*
  app.get('/reset', function(req, res) {
    AM.delAllRecords(function(){
      res.redirect('/print');
    });
  });
*/
  app.get('*', function(req, res) { res.render('404', { title: 'Page Not Found'}); });

};
