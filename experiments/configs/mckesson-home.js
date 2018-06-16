module.exports = {
  "manualEventSequence": [
    {
      "description": "Enter the search term \"kess\"",
      "selector": "#search-field",
      "type": "keyup",
      "event": {
        "code": "KeyS",
        "ctrlKey": false,
        "key": "s",
        "metaKey": false,
        "repeat": false,
        "shiftKey": false,
        "which": 83
      },
      "prerequisites": [
        {
          "description": "Close the \"Would you like to help us improve our website?\" dialog",
          "selector": "div.QSISlider img[src*=close]",
          "type": "click",
          "if": "document.querySelector(\"div.QSISlider img[src*=close]\") !== null"
        },
        {
          "description": "Click on the search field",
          "selector": "#search-field",
          "type": "click",
          "if": "document.querySelector(\".search-active\") === null"
        },
        {
          "selector": "#search-field",
          "type": "set-text",
          "value": "kess"
        }
      ]
    },
    {
      "description": "Enter the search term \"kesso\"",
      "selector": "#search-field",
      "type": "keyup",
      "event": {
        "code": "KeyO",
        "ctrlKey": false,
        "key": "o",
        "metaKey": false,
        "repeat": false,
        "shiftKey": false,
        "which": 79
      },
      "prerequisites": [
        {
          "description": "Close the \"Would you like to help us improve our website?\" dialog",
          "selector": "div.QSISlider img[src*=close]",
          "type": "click",
          "if": "document.querySelector(\"div.QSISlider img[src*=close]\") !== null"
        },
        {
          "description": "Click on the search field",
          "selector": "#search-field",
          "type": "click",
          "if": "document.querySelector(\".search-active\") === null"
        },
        {
          "selector": "#search-field",
          "type": "set-text",
          "value": "kesso"
        }
      ]
    }
  ],
  "skipTimerRegistrations": [
    "deferIframe",
    "focused.*focusTime.*blurTime",
    "sessionCamRecorder(.|\n)*setTimeout"
  ]
};
