
function LoginValidator()
{
// bind a simple alert window to this controller to display any errors //
  this.loginErrors = $('.modal-alert');

  this.showLoginError = function(t, m)
	{
    $('.modal-alert .modal-header h4').text(t);
    $('.modal-alert .modal-body').html(m);
    this.loginErrors.modal('show');
  };
}

LoginValidator.prototype.validateForm = function()
{
  if ($('#Username').val() == ''){
    this.showLoginError('Whoops!', 'Please enter a valid username');
    return false;
  }	else if ($('#Password').val() == ''){
  this.showLoginError('Whoops!', 'Please enter a valid password');
  return false;
}	else{
  return true;
}
};