module.exports = {
  "_manualEventSequence": [
    { "selector": "span.rlsMapPageNext", "type": "click" },
    { "selector": "span.rlsMapPagePrev", "type": "click" }
  ],
  "manualEventSequence": [
    {
      "description": "Go to page 2",
      "selector": "a.rlsMapPageNum[data-pagenum=\"2\"]",
      "type": "click"
    },
    {
      "description": "Search for the term \"San Francisco\"",
      "selector": "#rioSearchButton",
      "type": "click",
      "prerequisites": [
        {
          "selector": "#rioSearchInput",
          "type": "set-text",
          "value": "San Francisco"
        }
      ]
    },
    {
      "description": "Search for the term \"Mountain View\"",
      "selector": "#rioSearchButton",
      "type": "click",
      "prerequisites": [
        {
          "selector": "#rioSearchInput",
          "type": "set-text",
          "value": "Mountain View"
        }
      ]
    },
  ]
};
