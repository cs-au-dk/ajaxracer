module.exports = {
  "manualEventSequence": [
    {
      "description": "Select the \"App Store\" business line filter",
      "selector": "#division-APPST",
      "type": "click",
      "prerequisites": [
        {
          "selector": "#sn-businessline a",
          "type": "click"
        }
      ]
    },
    {
      "description": "Select the \"iPhone\" business line filter",
      "selector": "#division-IPHN",
      "type": "click",
      "prerequisites": [
        {
          "selector": "#sn-businessline a",
          "type": "click"
        }
      ]
    }
  ],
  "waitForPromises": false
};
