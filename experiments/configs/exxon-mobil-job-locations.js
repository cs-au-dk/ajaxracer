module.exports = {
  "original": "https://jobs.exxonmobil.com/content/All-Job-Locations/?locale=en_US",
  "manualEventSequence": [
    {
      "description": "Search for the term \"Europe\"",
      "selector": "#mapsearch button",
      "type": "click",
      "prerequisites": [
        {
          "selector": "#map-query",
          "type": "set-text",
          "value": "Europe"
        }
      ]
    },
    {
      "description": "Search for the term \"United States\"",
      "selector": "#mapsearch button",
      "type": "click",
      "prerequisites": [
        {
          "selector": "#map-query",
          "type": "set-text",
          "value": "United States"
        }
      ]
    }
  ]
};
