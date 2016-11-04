const _ = require('lodash');
const craftai = require('craft-ai').createClient;
const customers = require('./customers');
const recastai = require('recastai');
const { INGREDIENTS, retrieveIngredient } = require('./ingredients');
const moment = require('moment');

const recastaiClient = new recastai.Client(process.env.RECAST_TOKEN);
const craftaiClient = craftai({
  owner: process.env.CRAFT_OWNER,
  token: process.env.CRAFT_TOKEN,
  url: process.env.CRAFT_URL
});

function addIngredient(order, ingredient, count) {
  const updatedOrder = order || {};
  updatedOrder[ingredient] = (updatedOrder[ingredient] || 0) + count;
  return updatedOrder;
}

function submitOrder(customer, order) {
  return Promise.all([
    craftaiClient.addAgentContextOperations(customer.craftaiAgents.cheeseAgent, [
      {
        timestamp: moment.unix(),
        context: {
          beef_patty_qty: customer.currentOrder[INGREDIENTS.BEEF_PATTY] || 0,
          cheese_qty: `${customer.currentOrder[INGREDIENTS.CHEESE]}` || '0'
        }
      }
    ]),
    craftaiClient.addAgentContextOperations(customer.craftaiAgents.lettuceAgent, [
      {
        timestamp: moment.unix(),
        context: {
          beef_patty_qty: customer.currentOrder[INGREDIENTS.BEEF_PATTY] || 0,
          cheese_qty: customer.currentOrder[INGREDIENTS.CHEESE] || 0,
          lettuce_qty: `${customer.currentOrder[INGREDIENTS.LETTUCE]}` || '0'
        }
      }
    ])
  ])
  .catch(e => console.log(e));
}

function stringFromOrder(order) {
  return _.map(order, (value, item) => `- "${item}" x${value}`).join('\n');
}

const STATES = {
  START: {
    'initial': ({customer}) => ({
      reply: `Hi ${customer.name}, I'm George! I can take your burger order.`,
      customer: _.assign(customer, {
        state: 'START'
      })
    }),
    'greetings': ({customer}) => ({
      reply: `Hi ${customer.name}!`,
      customer: _.assign(customer, {
        state: 'START'
      })
    }),
    'start-order': ({customer}) => ({
      reply: `Let's got, what do you want in your burger?`,
      customer: _.assign(customer, {
        state: 'TAKE_ORDER',
        currentOrder: {}
      })
    }),
    'burger-ingredients': ({customer, res}) => {
      const ingredientEntity = res.get('ingredient');
      const ingredient = ingredientEntity && retrieveIngredient(ingredientEntity.value);
      if (_.isUndefined(ingredient)) {
        return {
          reply: `Sorry, I did not understand the ingredient you are trying to add, please retry...`,
          customer: customer
        }
      }
      const countEntity = res.get('number');
      const count = countEntity ? countEntity.scalar : 1;

      customer.currentOrder = addIngredient(customer.currentOrder, ingredient, count);
      customer.state = 'TAKE_ORDER';

      return {
        reply: `Starting a burger with "${ingredient}" x${count}.`,
        customer
      };
    },
    'default': ({customer}) => ({
      reply: `Sorry, I did not quite get that.`,
      customer: _.assign(customer, {
        state: 'START'
      })
    })
  },
  TAKE_ORDER: {
    'greetings': ({customer}) => ({
      reply: `Let's resume your order ${customer.name}.\n${stringFromOrder(customer.currentOrder)}.`,
      customer: _.assign(customer, {
        state: 'TAKE_ORDER'
      })
    }),
    'start-order': ({customer}) => ({
      reply: `We are currently in the order, let's resume.`,
      customer: _.assign(customer, {
        state: 'TAKE_ORDER'
      })
    }),
    'burger-ingredients': ({customer, res}) => {
      const ingredientEntity = res.get('ingredient');
      const ingredient = ingredientEntity && retrieveIngredient(ingredientEntity.value);
      if (_.isUndefined(ingredient)) {
        return {
          reply: `Sorry, I did not understand the ingredient you are trying to add, please retry...`,
          customer: customer
        }
      }
      const countEntity = res.get('number');
      const count = countEntity ? countEntity.scalar : 1;

      customer.currentOrder = addIngredient(customer.currentOrder, ingredient, count);
      customer.state = 'TAKE_ORDER';

      return {
        reply: `Adding "${ingredient}" x${count}, order is now:\n${stringFromOrder(customer.currentOrder)}\nAre you done?`,
        customer
      };
    },
    'yes': ({customer}) => {
      submitOrder(customer, customer.currentOrder);
      return {
        reply: 'Your order has been submitted.',
        customer: _.assign(customer, {
          state: 'START',
          currentOrder: {} // resetting the order
        })
      };
    },
    'no': ({customer}) => ({
      reply: 'What do you want me to change?',
      customer: _.assign(customer, {
        state: 'TAKE_ORDER'
      })
    }),
    'default': ({customer}) => ({
      reply: `Sorry, I did not quite get that, let's resume your order.`,
      customer: _.assign(customer, {
        state: 'TAKE_ORDER'
      })
    })
  }
}

function selectAction(input) {
  if (input) {
    return recastaiClient.textRequest(input)
    .then(res => {
      const intent = res.intent();
      return {
        action: intent ? intent.slug : 'default',
        res
      };
    })
  }
  else {
    return Promise.resolve({action: 'initial'});
  }
}

function applyAction({action, customer, additionalData, res}) {
  const actionImpl = STATES[customer.state][action] || STATES[customer.state]['default'];
  if (_.isFunction(actionImpl)) {
    return actionImpl({ customer, additionalData, res});
  }
  else {
    return applyAction({
      action: actionImpl,
      customer,
      additionalData,
      res
    });
  }
}

module.exports = phoneNumber => input => {
  const currentCustomer = customers.getCustomer(phoneNumber);
  return selectAction(input)
  .then(({ action, res }) => {
    const { reply, customer } = applyAction({
      action,
      customer: currentCustomer,
      res
    });
    customers.updateCustomer(customer);
    return reply;
  });
}
