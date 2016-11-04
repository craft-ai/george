require('dotenv').load();

const _ = require('lodash');
const callr = require('callr');
const express = require('express');
const bodyParser = require('body-parser');
const bot = require('./bot');
const exphbs  = require('express-handlebars');
const Handlebars = require('handlebars');

const CALLR_SMS_RECEPTION_ENDPOINT = `${process.env.URL}/sms_webhook`;
const CALLR_BOT_PHONENUMBER = process.env.CALLR_BOT_PHONENUMBER;
let callrClient = new callr.api(process.env.CALLR_USER, process.env.CALLR_PASSWORD);

const app = express();
app.set('port', (process.env.PORT || 5000));
app.engine('handlebars', exphbs({defaultLayout: 'home'}));
app.set('view engine', 'handlebars');

app.use(bodyParser.urlencoded({ extended: false }))

// parse application/json
app.use(bodyParser.json())

app.get('/', function(req, res) {
  res.render('home');
});

app.post('/sms_webhook', function(req, res) {
  const senderPhoneNumber = req.body.data.from;
  const request = req.body.data.text;
  bot(senderPhoneNumber)(request)
    .then(botRes => {
      console.log(botRes);
      callrClient.call('sms.send', CALLR_BOT_PHONENUMBER, senderPhoneNumber, botRes, {
        webhook: {
          endpoint: CALLR_SMS_RECEPTION_ENDPOINT
        }
      })
      .success(function(data) {
        // success callback
        console.log('Response:', data);
      })
      .error(function(error) {
        console.error("\nError:", error.message);
        console.error('Code:', error.code);
        console.error('Data:', error.data);
      });
      res.send();
    })
    .catch((err) => console.log('err', err));
});

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
