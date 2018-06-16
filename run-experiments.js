#!/usr/bin/env node

// Internal
var ajaxracer = require('./ajaxracer.js');
var builder = require('./src/utils/builder.js');

// External
var argv = require('yargs')
  .usage('Usage: ./run-experiments.js [--quick] [--rerun] [--skip-phase-2]')
  .option('filter', {
    default: '',
    type: 'string'
  })
  .option('headless', {
    default: true,
    type: 'boolean'
  })
  .option('quick', {
    default: false,
    describe: 'Skip experiments that are known to take longer',
    type: 'boolean'
  })
  .options('repetitions', {
    default: 1,
    describe: 'Number of times the experiments should be repeated',
    type: 'number'
  })
  .option('rerun', {
    default: false,
    describe: 'Rerun experiments that have already been run previously',
    type: 'boolean'
  })
  .option('skip-phase-2', {
    default: false,
    describe: 'Skip Phase 2',
    type: 'boolean'
  })
  .help()
  .argv;
var colors = require('colors');
var util = require('util');

var experiments = [
  {
    quick: false,
    runId: 'amerisourcebergen',
    url: 'https://abccareers.taleo.net/careersection/2/jobsearch.ftl?lang=en'
  },
  {
    quick: true,
    runId: 'apple-accessibility-iphone',
    url: 'https://www.apple.com/accessibility/iphone/'
  },
  {
    quick: true,
    runId: 'apple-buy-macbook',
    url: 'https://www.apple.com/shop/buy-mac/macbook'
  },
  {
    quick: true,
    runId: 'apple-customize-macbook',
    url: 'https://www.apple.com/shop/buy-mac/macbook?product=MNYF2LL/A&step=config'
  },
  {
    quick: true,
    runId: 'apple-search-jobs',
    url: 'https://jobs.apple.com/us/search'
  },
  {
    quick: true,
    runId: 'apple-search-support',
    url: 'https://support.apple.com/kb/index?page=search&q=iphone&locale=en_US'
  },
  {
    quick: false,
    runId: 'bankofamerica',
    url: 'https://locators.bankofamerica.com/search?q=Mountain%20View'
  },
  {
    quick: false,
    runId: 'berkshirehathaway',
    url: 'http://www.bhhsneprime.com/listing/listingsearch.aspx'
  },
  // Website has changed.
  /*{
    quick: false,
    runId: 'chevron',
    url: 'http://www.chevronwithtechron.com/findastation.aspx?address=Mountian%20View'
  },*/
  {
    quick: true,
    runId: 'citigroup',
    url: 'http://www.citigroup.com/citi/news/news_list_view.html'
  },
  {
    quick: true,
    runId: 'exxon',
    url: 'https://rmk-map.jobs2web.com/map/?esid=OxQKsixfDEW3masrwIovQg%3D%3D&centerpoint=25,5&mapzoom=2'
  },
  // Website has changed.
  /*{
    quick: true,
    runId: 'fanniemae',
    url: 'https://www.fanniemae.com/search?output=xml_no_dtd&client=fm_cportal_prod&proxystylesheet=fm_cportal_prod&site=fm_cportal_prod'
  },*/
  {
    quick: true,
    runId: 'grainger-home',
    url: 'https://www.grainger.com/'
  },
  {
    quick: true,
    runId: 'mckesson-home',
    url: 'http://www.mckesson.com/'
  },
  // Website has changed.
  /*{
    quick: true,
    runId: 'mckesson-blog-archive',
    url: 'http://www.mckesson.com/blog-archive/'
  },*/
  {
    quick: true,
    runId: 'mckesson-event-calendar',
    url: 'http://www.mckesson.com/about-mckesson/event-calendar/'
  },
  {
    quick: false,
    runId: 'mckesson-press-releases',
    url: 'http://www.mckesson.com/about-mckesson/newsroom/press-releases/'
  },
  {
    quick: true,
    runId: 'verizonwireless-allow',
    url: 'https://www.verizonwireless.com/stores/storesearchresults/?allow=1&lat=42.339904&long=-71.089889&result=all&q=02115'
  },
  {
    quick: true,
    runId: 'wellsfargo-home',
    url: 'https://www.wellsfargo.com/'
  },
  {
    quick: true,
    runId: 'wellsfargo-search',
    url: 'https://www.wellsfargo.com/search/search'
  }
].reverse();

var options = {
  build: false,
  headless: argv.headless,
  skipPhase2: argv.skipPhase2,
  rerun: argv.rerun
};

function runExperiments(experiments, repetition) {
  if (experiments.length > 0) {
    var experiment = experiments.pop();
    if (argv.filter && experiment.runId.indexOf(argv.filter) < 0) {
      return runExperiments(experiments, repetition);
    }
    if (argv.quick && !experiment.quick) {
      return runExperiments(experiments, repetition);
    }

    var runId = util.format('%s-%s', experiment.runId, repetition);

    console.log(
      util.format('RUNNING EXPERIMENT %s\n', runId.toUpperCase()).blue.bold);

    return ajaxracer(runId, experiment.url, options)
      .then(() => runExperiments(experiments, repetition))
      .catch(() => runExperiments(experiments, repetition));
  }
  return Promise.resolve();
}

function runRepetitions(experiments, repetition, repetitions) {
  if (repetition <= repetitions) {
    console.log(util.format(
      'RUNNING REPETITION %s OF %s\n', repetition, repetitions).blue.bold);

    return runExperiments(Array.from(experiments), repetition)
      .then(() => runRepetitions(experiments, repetition + 1, repetitions));
  }
  return Promise.resolve();
}

function main(experiments, repetitions) {
  builder.build().then(() => runRepetitions(experiments, 1, repetitions))
                 .then(() => {
                   console.log('DONE'.blue.bold);
                   process.exit(0);
                 }, (err) => {
                   console.error(err.stack.red.bold);
                   process.exit(1);
                 });
}

main(experiments, argv.repetitions);
