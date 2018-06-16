module.exports = {
  "manualEventSequence": [
    {
      "description": "Click on the \"Vision\" tab",
      "selector": "#vision-tab",
      "type": "click",
      "prerequisites": [
        {
          "type": "scroll",
          "x": 0,
          "y": 500
        }
      ]
    },
    {
      "description": "Click on the \"Hearing\" tab",
      "selector": "#hearing-tab",
      "type": "click",
      "prerequisites": [
        {
          "type": "scroll",
          "x": 0,
          "y": 500
        }
      ]
    }
  ],
  "waitForPromises": false
};
