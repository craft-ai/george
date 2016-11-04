require('dotenv').load();

let readline = require('readline');
let bot = require('./bot');

const CONVERSATION_TOKEN = Math.floor((Math.random() * 1000) + 1).toString()

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

process.stdin.setEncoding('utf8')

function printPrompt() {
  console.log();
  process.stdout.write('> ');
}

rl.on('SIGINT', () => { 
  rl.close()
})

printPrompt();

rl.on('line', input => {
  console.log()
  bot(CONVERSATION_TOKEN)(input)
  .then(res => {
    console.log(res);
    printPrompt();
  })
  .catch(err => {
    console.log(err);
    printPrompt();
  });
})
