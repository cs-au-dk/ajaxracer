module.exports = {
  "manualEventSequence": [
    {
      "description": "Sort by \"City\"",
      "selector": ".search-results-sorter li[data-original-index=\"2\"] a",
      "type": "click",
      "prerequisites": [
        {
          "description": "Click on \"Sort by: Price\"",
          "selector": ".search-results-sorter button[data-id=\"search-results-sorttype\"]",
          "type": "click"
        }
      ]
    },
    {
      "description": "Filter by 4+ bedrooms",
      "selector": "input[name*=MinBedrooms][value=\"4\"] + span",
      "type": "click",
      "prerequisites": [
        {
          "selector": "#ddbtn-criteria-beds",
          "type": "click"
        }
      ]
    },
    {
      "description": "Filter by 12+ bedrooms",
      "selector": "input[name*=MinBedrooms][value=\"12\"] + span",
      "type": "click",
      "prerequisites": [
        {
          "selector": "#ddbtn-criteria-beds",
          "type": "click"
        }
      ]
    },
    {
      "description": "Click on \"Map\"",
      "selector": "#search-results-displaytype-map",
      "type": "click"
    }
  ],
  "postprocessing": [
    "(function (x) { x && x.remove(); })(document.querySelector(\".results-refresh-date-disclaimer\"))"
  ],
  "forceLoadingAfterWindowLoad": true,
  "maxTimerDuration": 2000,
  "maxTimerChainLength": 200,
  "waitForPromises": false
};
