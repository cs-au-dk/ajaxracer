module.exports = {
  "manualEventSequence": [
    {
      "description": "Enter \"screwdriver\" into the search form field",
      "selector": "#search",
      "type": "keyup",
      "event": {
        "code": "KeyR",
        "ctrlKey": false,
        "key": "r",
        "metaKey": false,
        "repeat": false,
        "shiftKey": false,
        "which": 82
      },
      "prerequisites": [
        {
          "selector": "#search",
          "type": "focus",
          "if": "window.searchFieldHasBeenFocused ? false : (window.searchFieldHasBeenFocused = true)"
        },
        {
          "selector": "#search",
          "type": "set-text",
          "value": "screwdriver"
        }
      ]
    },
    {
      "description": "Enter \"screwdrivers\" into the search form field",
      "selector": "#search",
      "type": "keyup",
      "event": {
        "code": "KeyS",
        "ctrlKey": false,
        "key": "s",
        "metaKey": false,
        "repeat": false,
        "shiftKey": false,
        "which": 83
      },
      "prerequisites": [
        {
          "selector": "#search",
          "type": "focus",
          "if": "window.searchFieldHasBeenFocused ? false : (window.searchFieldHasBeenFocused = true)"
        },
        {
          "selector": "#search",
          "type": "set-text",
          "value": "screwdrivers"
        }
      ]
    }
  ]
};
