/**
 * Standardised allergen and dietary dataset for menu items.
 *
 * Source basis:
 * - South African allergen labelling guidance
 * - South African food labelling regulations
 * - Codex/FAO-WHO food allergen management guidance
 *
 * This dataset is used to ensure vendors select consistent allergen
 * and dietary values instead of typing unstructured text.
 */

export const ALLERGEN_OPTIONS = [
  {
    id: 'cow_milk',
    label: "Cow's Milk",
    description: 'Milk and milk-derived ingredients.'
  },
  {
    id: 'egg',
    label: 'Egg',
    description: 'Egg and egg-derived ingredients.'
  },
  {
    id: 'fish',
    label: 'Fish',
    description: 'Fish and fish-derived ingredients.'
  },
  {
    id: 'crustaceans_molluscs',
    label: 'Crustaceans and Molluscs',
    description: 'Shellfish such as prawns, crab, lobster, mussels, oysters and squid.'
  },
  {
    id: 'peanuts',
    label: 'Peanuts',
    description: 'Peanuts and peanut-derived ingredients.'
  },
  {
    id: 'tree_nuts',
    label: 'Tree Nuts',
    description: 'Tree nuts such as almonds, cashews, walnuts, pecans, pistachios and hazelnuts.'
  },
  {
    id: 'soya',
    label: 'Soya',
    description: 'Soybeans and soya-derived ingredients.'
  },
  {
    id: 'significant_cereals',
    label: 'Gluten / Significant Cereals',
    description: 'Wheat, rye, barley, oats and related hybrid cereals.'
  },
  {
    id: 'sulphites',
    label: 'Sulphites',
    description: 'Sulphites and sulphur dioxide used as preservatives.'
  }
];

export const DIETARY_TAG_OPTIONS = [
  {
    id: 'halal',
    label: 'Halal',
    description: 'Suitable for halal dietary requirements.'
  },
  {
    id: 'vegan',
    label: 'Vegan',
    description: 'Contains no animal-derived ingredients.'
  },
  {
    id: 'vegetarian',
    label: 'Vegetarian',
    description: 'Contains no meat or fish.'
  },
  {
    id: 'nut_free',
    label: 'Nut-Free',
    description: 'Marked as not containing peanuts or tree nuts.'
  },
  {
    id: 'gluten_free',
    label: 'Gluten-Free',
    description: 'Marked as not containing gluten or significant cereals.'
  },
  {
    id: 'dairy_free',
    label: 'Dairy-Free',
    description: "Marked as not containing cow's milk or dairy-derived ingredients."
  },
  {
    id: 'egg_free',
    label: 'Egg-Free',
    description: 'Marked as not containing egg or egg-derived ingredients.'
  },
  {
    id: 'seafood_free',
    label: 'Seafood-Free',
    description: 'Marked as not containing fish, crustaceans or molluscs.'
  }
];

export const DIETARY_SOURCE_INFO = {
  title: 'South African and internationally recognised allergen/dietary reference data',
  description:
    'Menu item allergen and dietary fields are standardised using South African common allergen labelling guidance and internationally recognised Codex/FAO-WHO allergen management guidance.',
  sources: [
    {
      name: 'South African food labelling regulations / common allergen guidance',
      note: 'Used for common allergen categories such as milk, egg, peanuts, tree nuts, soya, fish, crustaceans and molluscs, and significant cereals.'
    },
    {
      name: 'Codex Alimentarius CXC 80-2020 Food Allergen Management guidance',
      note: 'Used as internationally recognised guidance for allergen management and labelling.'
    }
  ]
};