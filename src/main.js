var callr = require('callr');
var express = require('express');

var app = express();
var api = new callr.api(process.env.CALLR_USER, process.env.CALLR_PASSWORD);

api.call('sms.send', '', process.env.TEL_NUMBER, 'Hello world!', { flash_message: false }).success(function(data) {
    // success callback
    console.log('Response:', data);
})
.error(function(error) {
  console.error("\nError:", error.message);
  console.error('Code:', error.code);
  console.error('Data:', error.data);
});

var type = 'sms.mo';
var endpoint = 'https://george-the-dentalist.herokuapp.com/sms_webhook';
var options = null;

api.call('webhooks.subscribe', type, endpoint, options).success(function(response) {
  console.log('response', response);
})
.error(function(error) {
  console.error("\nError:", error.message);
  console.error('Code:', error.code);
  console.error('Data:', error.data);
});

app.set('port', (process.env.PORT || 5000));

app.get('/', function(req, res) {
  res.send('<div><h1>George the dentalist welcomes you!</h1><iframe src="//giphy.com/embed/2nzUAOGw3i7w4?html5=true" width="480" height="480" frameBorder="0" class="giphy-embed" allowFullScreen></iframe><p><a href="http://giphy.com/gifs/french-movie-michel-hazanavicius-2nzUAOGw3i7w4"></a></p></div>');
});

app.get('/sms_webhook', function(req, res) {
  api.call('sms.send', '', process.env.TEL_NUMBER, 'Envoie moi un fax !!', { flash_message: false }).success(function(data) {
    // success callback
    console.log('Response:', data);
  })
  .error(function(error) {
    console.error("\nError:", error.message);
    console.error('Code:', error.code);
    console.error('Data:', error.data);
  });
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
