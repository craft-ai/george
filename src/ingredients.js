const _ = require('lodash');

const INGREDIENTS = {
  BEEF_PATTY: 'Beef Patty',
  LETTUCE: 'Lettuce',
  CHEESE: 'Cheese'
}

const INGREDIENTS_VARIANTS = {
  BEEF_PATTY: [
    'beef_patty',
    'beef',
    'steak'
  ],
  LETTUCE: [
    'lettuce',
    'salad'
  ],
  CHEESE: [
    'cheddar',
    'cheese'
  ]
}

function retrieveIngredient(value) {
  if (_.isUndefined(value)) {
    return undefined;
  }
  const simplifiedValue = _.snakeCase(_.lowerCase(value));
  const ingredientKey = _.findKey(INGREDIENTS_VARIANTS, variants => _.includes(variants, simplifiedValue));

  if (_.isUndefined(ingredientKey)) {
    return undefined;
  }
  else {
    return INGREDIENTS[ingredientKey]
  }
}

module.exports = {
  INGREDIENTS,
  retrieveIngredient
}
