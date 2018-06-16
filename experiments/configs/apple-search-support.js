module.exports = {
  "manualEventSequence": [
    {
      "description": "Click on the \"Support Articles\" button",
      "selector": ".SearchResults .SUPPORT_ARTICLES",
      "type": "click",
      "prerequisites": [
        {
          "description": "Show the filtering options",
          "selector": "button.SearchFilterToggle",
          "type": "click",
          "if": "document.querySelector(\"#searchFilterPanel\").hasClassName(\"is-expanded\") === false"
        }
      ]
    },
    {
      "description": "Click on the \"Communities\" button",
      "selector": ".SearchResults .DISCUSSIONS",
      "type": "click",
      "prerequisites": [
        {
          "description": "Show the filtering options",
          "selector": "button.SearchFilterToggle",
          "type": "click",
          "if": "document.querySelector(\"#searchFilterPanel\").hasClassName(\"is-expanded\") === false"
        }
      ]
    }
  ],
  "skipTimerRegistrations": [
    "PPVevent"
  ],
  "waitForPromises": false
};
