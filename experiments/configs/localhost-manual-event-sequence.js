module.exports = {
  "manualEventSequence": [
    {
      "selector": "#button",
      "type": "click",
      "prerequisites": [
        {
          "selector": "#input",
          "type": "set-text",
          "value": "abc"
        }
      ]
    },
    {
      "selector": "#button",
      "type": "click",
      "prerequisites": [
        {
          "selector": "#input",
          "type": "set-text",
          "value": "def"
        }
      ]
    }
  ]
};
