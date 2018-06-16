function get(url) {
  switch (url) {
    case "http://localhost:8080/test/manual_event_sequence/index.html":
      return require('./configs/localhost-manual-event-sequence.js');

    case "https://abccareers.taleo.net/careersection/2/jobsearch.ftl?lang=en":
      return require('./configs/amerisource-bergen-job-openings.js');

    case "https://www.apple.com/accessibility/iphone/":
      return require('./configs/apple-accessibility-iphone.js');

    case "https://www.apple.com/shop/buy-mac/macbook":
      return require('./configs/apple-buy-macbook.js');

    case "https://www.apple.com/shop/buy-mac/macbook?product=MNYF2LL/A&step=config":
      return require('./configs/apple-customize-macbook.js');

    case "https://jobs.apple.com/us/search":
      return require('./configs/apple-search-jobs.js');

    case "https://support.apple.com/kb/index?page=search&q=iphone&locale=en_US":
      return require('./configs/apple-search-support.js');

    case "https://locators.bankofamerica.com/search?q=Mountain%20View":
      return require('./configs/bankofamerica-search-locations.js');

    case "http://www.bhhsneprime.com/listing/listingsearch.aspx":
      return require('./configs/berkshire-hathaway-search-listings.js');

    case "http://www.chevronwithtechron.com/findastation.aspx?address=Mountian%20View":
      return require('./configs/chevron-find-a-station.js');

    case "http://www.citigroup.com/citi/news/news_list_view.html":
      return require('./configs/citigroup-news.js');

    case "https://rmk-map.jobs2web.com/map/?esid=OxQKsixfDEW3masrwIovQg%3D%3D&centerpoint=25,5&mapzoom=2":
      return require('./configs/exxon-mobil-job-locations.js');

    case "https://www.fanniemae.com/search?output=xml_no_dtd&client=fm_cportal_prod&proxystylesheet=fm_cportal_prod&site=fm_cportal_prod":
      return require('./configs/fannie-mae-search.js');

    case "https://www.grainger.com/":
      return require('./configs/grainger-home.js');

    case "http://www.mckesson.com/":
      return require('./configs/mckesson-home.js');

    case "http://www.mckesson.com/blog-archive/":
      return require('./configs/mckesson-blog-archive.js');

    case "http://www.mckesson.com/about-mckesson/event-calendar/":
      return require('./configs/mckesson-event-calendar.js');

    case "http://www.mckesson.com/about-mckesson/newsroom/press-releases/":
      return require('./configs/mckesson-press-releases.js');

    case "https://www.verizonwireless.com/stores/storesearchresults/?lat=42.339904&long=-71.089889&result=all&q=02115":
    case "https://www.verizonwireless.com/stores/storesearchresults/?allow=1&lat=42.339904&long=-71.089889&result=all&q=02115":
      return require('./configs/verizonwireless-stores.js');

    case "https://www.wellsfargo.com/":
      return require('./configs/wellsfargo-home.js');

    case "https://www.wellsfargo.com/search/search":
      return require('./configs/wellsfargo-search.js');
  }

  return {};
}

module.exports = {
  get: get
};
