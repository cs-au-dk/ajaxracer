module.exports = {
  "manualEventSequence": [
    {
      "description": "Search for the term \"a\"",
      "selector": "#inputTopSearchField",
      "type": "keyup",
      "event": {
        "code": "KeyA",
        "ctrlKey": false,
        "key": "a",
        "metaKey": false,
        "repeat": false,
        "shiftKey": false,
        "which": 65
      },
      "prerequisites": [
        {
          "selector": "#inputTopSearchField",
          "type": "set-text",
          "value": "a"
        }
      ]
    },
    {
      "description": "Search for the term \"ab\"",
      "selector": "#inputTopSearchField",
      "type": "keyup",
      "event": {
        "code": "KeyB",
        "ctrlKey": false,
        "key": "b",
        "metaKey": false,
        "repeat": false,
        "shiftKey": false,
        "which": 66
      },
      "prerequisites": [
        {
          "selector": "#inputTopSearchField",
          "type": "set-text",
          "value": "ab"
        }
      ]
    }
  ]
};
