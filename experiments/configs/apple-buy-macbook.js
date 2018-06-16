module.exports = {
  "manualEventSequence": [
    {
      "description": "Search for delivery options to \"94040\"",
      "selector": "button[data-autom=\"viewOptionsButton\"]",
      "type": "click",
      "prerequisites": [
        {
          "description": "Click on the \"Delivery options\" link",
          "selector": "div.as-macbundle:first-child .as-macbtr-options:first-child .shipdeliverydates button[data-autom=\"deliveryDateChecker\"]",
          "type": "click",
          "if": "window.deliveryOptionsOpened ? false : (window.searchFieldHasBeenFocused = true)"
        },
        {
          "selector": "#postalCode",
          "type": "set-text",
          "value": "94040"
        }
      ]
    },
    {
      "description": "Search for delivery options to \"02115\"",
      "selector": "button[data-autom=\"viewOptionsButton\"]",
      "type": "click",
      "prerequisites": [
        {
          "description": "Click on the \"Delivery options\" link",
          "selector": "div.as-macbundle:first-child .as-macbtr-options:first-child .shipdeliverydates button[data-autom=\"deliveryDateChecker\"]",
          "type": "click",
          "if": "window.deliveryOptionsOpened ? false : (window.searchFieldHasBeenFocused = true)"
        },
        {
          "selector": "#postalCode",
          "type": "set-text",
          "value": "02115"
        }
      ]
    },
  ],
  "waitForPromises": false
};
