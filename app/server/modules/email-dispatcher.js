
var EM = {};
module.exports = EM;

EM.server = require("emailjs/email").server.connect(
{
	host 	    : process.env.ABOT_EMAIL_HOST || 'smtp.gmail.com',
	user 	    : process.env.ABOT_EMAIL_USER || 'xxx.yyy@gmail.com',
	password    : process.env.ABOT_EMAIL_PASS || '1234',
	ssl		    : true
});

EM.dispatchResetPasswordLink = function(account, callback)
{
	EM.server.send({
		from         : 'jfseb-abot <do-not-reply@gmail.com>',
		to           : account.email,
		subject      : 'Password Reset',
		text         : 'something went wrong... :(',
		attachment   : EM.composeEmail(account)
	}, callback );
}

EM.composeEmail = function(o)
{
	var link = process.env.ABOT_SERVER + '/reset-password?e='+o.email+'&p='+o.pass;
	var html = "<html><body>";
		html += "Welcome back  "+o.user+",<br><br>";
		html += "<br>";
		html += "<a href='"+link+"'>Click here to reset your password</a><br><br>";
		html += "Cheers,<br>"
		html += "the <a href='" + process.env.ABOT_SERVER + "/home'>wosap</a><br><br>";
		html += "</body></html>";
	return  [{data:html, alternative:true}];
}