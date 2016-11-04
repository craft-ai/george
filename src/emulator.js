require('dotenv').load();

let readline = require('readline');
let bot = require('./bot');
let customers = require('./customers');


const TEST_CUSTOMER = {
  phoneNumber: '0000000000',
  name: 'Marie',
}

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

// Let's start!
const BOT = bot(TEST_CUSTOMER.phoneNumber);
customers.addCustomer(TEST_CUSTOMER)
.then(() => BOT())
.then(res => {
  console.log(res);
  printPrompt();
})
.catch(err => {
  console.log(err);
  printPrompt();
});

rl.on('line', input => {
  console.log()
  BOT(input)
  .then(res => {
    console.log(res);
    printPrompt();
  })
  .catch(err => {
    console.log(err);
    printPrompt();
  });
})
