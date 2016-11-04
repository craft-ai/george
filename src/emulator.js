let readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

process.stdin.setEncoding('utf8')

const CONVERSATION_ID = Math.floor((Math.random() * 1000) + 1).toString()

console.log()
process.stdout.write('> ')

rl.on('SIGINT', () => { 
  rl.close()
})

rl.on('line', input => {
  console.log()
  console.log(input)
  console.log()
  process.stdout.write('> ');
})
