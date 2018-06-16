module.exports = {
  "manualEventSequence": [
    {
      "description": "Click on the \"Enter Location or ZIP code\" form field",
      "selector": "#search", "type": "click"
    },
    {
      "description": "Click on the \"Enter Origin\" form field",
      "selector": "#startLocation", "type": "click"
    },
    {
      "description": "Click on the \"Enter Destination\" form field",
      "selector": "#endLocation", "type": "click"
    },
    {
      "description": "Click on the \"ExtraMile Station\" button",
      "selector": "#collapseFilter a:nth-child(1)", "type": "click"
    },
    {
      "description": "Click on the \"Car Wash Locations\" button",
      "selector": "#collapseFilter a:nth-child(2)", "type": "click"
    },
    {
      "description": "Click on the \"Clear filters\" link",
      "selector": "#clearFilters a:nth-child(1)", "type": "click"
    },
    {
      "description": "Click on the \"Traffic\" link",
      "selector": "#trafficBtn", "type": "click"
    },
    {
      "description": "Search for \"San Francisco\"",
      "selector": ".search-button input", "type": "click",
      "prerequisites": [
        {
          "selector": "#search", "type": "set-text", "value": "San Francisco"
        }
      ]
    },
    {
      "description": "Search for \"Sunnyvale\"",
      "selector": ".search-button input", "type": "click",
      "prerequisites": [
        {
          "selector": "#search", "type": "set-text", "value": "Sunnyvale"
        }
      ]
    }
  ]
};
