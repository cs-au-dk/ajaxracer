module.exports = {
  "manualEventSequence": [
    {
      "description": "Enter \"hel\" into the search form field",
      "selector": "input.app-search",
      "type": "keyup",
      "event": {
        "code": "KeyL",
        "ctrlKey": false,
        "key": "l",
        "metaKey": false,
        "repeat": false,
        "shiftKey": false,
        "which": 76
      },
      "prerequisites": [
        {
          "selector": "input.app-search",
          "type": "set-text",
          "value": "hel"
        }
      ]
    },
    {
      "description": "Enter \"hell\" into the search form field",
      "selector": "input.app-search",
      "type": "keyup",
      "event": {
        "code": "KeyL",
        "ctrlKey": false,
        "key": "l",
        "metaKey": false,
        "repeat": false,
        "shiftKey": false,
        "which": 76
      },
      "prerequisites": [
        {
          "selector": "input.app-search",
          "type": "set-text",
          "value": "hell"
        }
      ]
    }
  ]
};
