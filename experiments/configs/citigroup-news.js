module.exports = {
  "manualEventSequence": [
    {
      "description": "Filter by year 2017",
      "selector": "#press-year",
      "type": "change",
      "prerequisites": [
        {
          "selector": "#press-year",
          "type": "set-index",
          "value": 1
        }
      ]
    },
    {
      "description": "Filter by year 2016",
      "selector": "#press-year",
      "type": "change",
      "prerequisites": [
        {
          "selector": "#press-year",
          "type": "set-index",
          "value": 2
        }
      ]
    }
  ]
};
