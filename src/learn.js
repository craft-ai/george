const _ = require('lodash');
const craftai = require('craft-ai').createClient;
const highland = require('highland');
const fs = require('fs');
const seedrandom = require('seedrandom');
const moment = require('moment-timezone');

var rand = seedrandom('sparkcx-hackathon');

const MONTHS = [
  '2014/11',
  '2014/12',
  '2015/01',
  '2015/02',
  '2015/03',
  '2015/04',
  '2015/05',
  '2015/06',
  '2015/07',
  '2015/08',
  '2015/09',
  '2015/10',
  '2015/11',
  '2015/12',
  '2016/01',
  '2016/02',
  '2016/03',
  '2016/04',
  '2016/05',
  '2016/06',
  '2016/07',
  '2016/08',
  '2016/09',
  '2016/10',
];

const HEADERS = _.concat([
  'Sold_To',
  'Dpt_Sold_To',
  'Ville_Sold_To',
  'Ship_To',
  'Article_Ref',
  'Article_Name',
], MONTHS);

var client = craftai({
  owner: process.env.CRAFT_OWNER,
  token: process.env.CRAFT_TOKEN,
  url: process.env.CRAFT_URL
});

const MODEL = {
  context: {
    quantity: {
      type: 'enum'
    },
    // monthInQuarter: {
    //   type: 'continuous'
    // },
    // quarter: {
    //   type: 'continuous'
    // },
    monthsSinceLastOrder: {
      type: 'continuous'
    },
    month: {
      type: 'continuous'
    },
  },
  output: [
    'quantity'
  ],
  tree_max_height: 4,
  // deactivate_sampling: true,
  deactivate_forgetting: false,
  time_quantum: 60*60*24*30,
  forgetting_timestep: 60*60*24*30,
  forgetting_max_quantums: 6,
  forgetting_similarity_forgetting_ratio: 0.8
};

function formatContextOperations(orders, product) {
  var prevOrderDate = {};
  return _.reduce(MONTHS, (monthOrders, month) => {
    _.map(orders, order => {
      if (_.isUndefined(prevOrderDate[order.Ship_To])) {
        prevOrderDate[order.Ship_To] = moment(month, 'YYYY/MM');
        return;
      }
      const date = moment(month, 'YYYY/MM');
      const numMonth = date.month();
      monthOrders.push({
        timestamp: date.unix(),
        diff: {
          month: numMonth + 1,
          // monthInQuarter: numMonth % 3 + 1,
          monthsSinceLastOrder: date.diff(prevOrderDate[order.Ship_To], 'months'),
          // quarter: numMonth < 3 ? 1 : (numMonth < 6 ? 2 : (numMonth < 9 ? 3 : 4)),
          quantity: Math.floor(parseInt(order[month]) / product.nbLot) > 0 ? (order[month] / product.nbLot).toFixed(0) : order[month],
        }
      });
      if (order[month] != '0') {
        prevOrderDate[order.Ship_To] = date;
      }
      return;
    })
    return monthOrders;
  }, []);
}

function readData(source) {
  return new Promise((resolve, reject) => {
    highland(fs.createReadStream(source))
    .split()
    .drop(1)
    .map(line =>  _.zipObject(HEADERS,line.split(';')))
    .reject(line => _.isUndefined(line['Ship_To']))
    .group('Ship_To')
    .toCallback((err, result) => {
      if (err) {
        reject(err);
      } else {
        resolve(result);
      }
    })
  })
}

function generateDecision(source, product) {
  readData(source)
  .then(customersOrders => {
    customersOrders = _.reduce(customersOrders, (resultingOrders, customerOrders, key) => {
      var orders = _.reduce(
        _.filter(customerOrders, order => order.Article_Ref == product.id),
        (recurringOrders, orders) => {
          if (_.countBy(orders, o => o == '0').false > 9) {
            recurringOrders.push(orders);
          }
          return recurringOrders;
        }
      , []);
      if (_.size(orders) > 0) {
        resultingOrders[key] = orders;
      }
      return resultingOrders;
    }, {});
    var sampleCustomerOrders = customersOrders;
    // if (_.size(customersOrders) > 100) {
    //   sampleCustomerOrders = _.filter(customersOrders, () => rand() < 0.08);
    // }
    var sampleCustomerOrders = _.filter(customersOrders, order =>
      order[0].Ship_To == '12962726' ||
      order[0].Ship_To == '12962136' ||
      order[0].Ship_To == '12981321' ||
      order[0].Ship_To == '13046312' ||
      order[0].Ship_To == '12981321' ||
      order[0].Ship_To == '13094923' ||
      order[0].Ship_To == '13046312' ||
      order[0].Ship_To == '12962880' ||
      order[0].Ship_To == '12962136' ||
      order[0].Ship_To == '12983415' );
    return Promise.all(_.map(sampleCustomerOrders, customerOrders => {
      const AGENT = 'AGENT_' + product.name + '_' + customerOrders[0].Ship_To;
      return client.destroyAgent(AGENT)
      .then(() => client.createAgent(MODEL, AGENT))
      .then(() => {
        console.log('creating agent', AGENT);
        const contextOperations = formatContextOperations(customerOrders, product);
        return client.addAgentContextOperations(AGENT, contextOperations, true)
        .then(() => console.log('context operations sent to', AGENT));
      })
      .catch(console.log);
    }))
    .then(() => console.log('All done, George!'))
    .catch(console.log);
  })
}

const SOURCE_FILE = './data/orders_france_all.csv';

const KALINOX = {name: 'BTL_KALINOX', id: 'M1850S05C7A001', nbLot: 1};
const MASK_1 = {name: 'ECOMASK_N1', id: '168400', nbLot: 35};
const MASK_0 = {name: 'ECOMASK_N0', id: '168408', nbLot: 40};

generateDecision(SOURCE_FILE, KALINOX);
