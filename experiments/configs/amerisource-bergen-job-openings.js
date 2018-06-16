module.exports = {
  "manualEventSequence": [
    {
      "description": "Go to page 2",
      "selector": ".pager li:nth-child(2) a",
      "type": "click"
    },
    {
      "description": "Click on the \"United States\" checkbox",
      "selector": "#LOCATION-level-1-item-0",
      "type": "change",
      "prerequisites": [
        {
          "description": "Click on the \"Filter by\" button, if the form controls are hidden",
          "selector": "#filterTrigger",
          "type": "click",
          "if": "window.getComputedStyle(document.querySelector(\"#filter-panel\")).display === \"none\""
        },
        {
          "description": "Toggle the value of the \"United States\" checkbox",
          "selector": "#LOCATION-level-1-item-0",
          "type": "toggle"
        }
      ]
    },
    {
      "description": "Click on the \"Part-time\" checkbox",
      "selector": "#JOB_SCHEDULE-item-1",
      "type": "change",
      "prerequisites": [
        {
          "description": "Click on the \"Filter by\" button, if the form controls are hidden",
          "selector": "#filterTrigger",
          "type": "click",
          "if": "window.getComputedStyle(document.querySelector(\"#filter-panel\")).display === \"none\""
        },
        {
          "description": "Toggle the value of the \"Part-time\" checkbox",
          "selector": "#JOB_SCHEDULE-item-1",
          "type": "toggle"
        }
      ]
    },
    {
      "description": "Search for the \"pharmacy\" keyword",
      "selector": "#search",
      "type": "click",
      "prerequisites": [
        {
          "description": "Enter the term \"pharmacy\" into the \"Keyword\" form field",
          "selector": "#KEYWORD",
          "type": "set-text",
          "value": "pharmacy"
        }
      ]
    },
    {
      "description": "Sort by \"Job Title\"",
      "selector": "#sortBySelect",
      "type": "change",
      "prerequisites": [
        {
          "description": "Select the option \"Job Title\"",
          "selector": "#sortBySelect",
          "type": "set-index",
          "value": 5
        }
      ]
    }
  ]
};
