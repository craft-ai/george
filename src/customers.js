const craftai = require('craft-ai').createClient;
const { INGREDIENTS } = require('./ingredients');
const _ = require('lodash');

const craftaiClient = craftai({
  owner: process.env.CRAFT_OWNER,
  token: process.env.CRAFT_TOKEN
});

let customers = {};

const CHEESE_AGENT_CONFIGURATION = {
  context: {
    beef_patty_qty: {
      type: 'continuous'
    },
    cheese_qty: {
      type: 'enum'
    }
  },
  output: [
    'cheese_qty'
  ],
  time_quantum: 60,
};

const LETTUCE_AGENT_CONFIGURATION = {
  context: {
    beef_patty_qty: {
      type: 'continuous'
    },
    cheese_qty: {
      type: 'continuous'
    },
    lettuce_qty: {
      type: 'enum'
    }
  },
  output: [
    'lettuce_qty'
  ],
  time_quantum: 60,
};


function getCustomers() {
  return customers;
}

function addCustomer(customer) {
  customer.state = 'START';

  customer.craftaiAgents = {
    lettuceAgent: `CUSTOMER_${customer.phoneNumber}_LETTUCE_AGENT`,
    cheeseAgent: `CUSTOMER_${customer.phoneNumber}_CHEESE_AGENT`
  }

  // Create the agent if necessary
  return Promise.all([
    craftaiClient.createAgent(LETTUCE_AGENT_CONFIGURATION, customer.craftaiAgents.lettuceAgent).catch(e => {
      console.log(e);
      return Promise.resolve();
    }),
    craftaiClient.createAgent(CHEESE_AGENT_CONFIGURATION, customer.craftaiAgents.cheeseAgent).catch(e => {
      console.log(e);
      return Promise.resolve();
    })
  ])
  .then(() => {
    customers[customer.phoneNumber] = customer;
    console.log('customers', customers);
  });
}

function updateCustomer(customer) {
  customers[customer.phoneNumber] = customer;
}

function getCustomer(phoneNumber) {
  return customers[phoneNumber];
}

module.exports = {
  addCustomer: addCustomer,
  updateCustomer: updateCustomer,
  getCustomer: getCustomer,
  getCustomers: getCustomers
}
