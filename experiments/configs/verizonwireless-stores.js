module.exports = {
  "manualEventSequence": [
    {
      "description": "Use the \"Verizon company stores\" filter",
      "selector": "a.apply-filter",
      "type": "click",
      "prerequisites": [
        {
          "selector": "a.btnFilter",
          "type": "click"
        },
        {
          "selector": ".store-filter ul.method-list:nth-child(3) li:nth-child(1) .iCheck-helper",
          "type": "click",
          "if": "document.querySelector(\"input[value=Verizon_company_stores]\").checked === false"
        },
        {
          "selector": ".store-filter ul.method-list:nth-child(3) li:nth-child(2) .iCheck-helper",
          "type": "click",
          "if": "document.querySelector(\"input[value=Authorized_Retailer]\").checked === true"
        }
      ]
    },
    {
      "description": "Use the \"Authorized Retailer\" filter",
      "selector": "a.apply-filter",
      "type": "click",
      "prerequisites": [
        {
          "selector": "a.btnFilter",
          "type": "click"
        },
        {
          "selector": ".store-filter ul.method-list:nth-child(3) li:nth-child(2) .iCheck-helper",
          "type": "click",
          "if": "document.querySelector(\"input[value=Authorized_Retailer]\").checked === false"
        },
        {
          "selector": ".store-filter ul.method-list:nth-child(3) li:nth-child(1) .iCheck-helper",
          "type": "click",
          "if": "document.querySelector(\"input[value=Verizon_company_stores]\").checked === true"
        }
      ]
    }
  ],
  "skipTimerRegistrations": [
    "a\\.j\\.n\\.gb\\.La",
    "for \\(key in listeners\\)",
    "idleSecondsCounter",
    "PPVevent"
  ],
  "maxTimerDuration": 2000,
  "maxTimerChainLength": 10
};
