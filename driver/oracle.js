// External
var util = require('util');

/**
 * Returns a screenshot of the web page.
 */
function takeScreenshot() {
  return browser.executeScript(
      'return Math.min(10000, Math.max(document.body.scrollHeight,' +
                                      'document.body.offsetHeight,' +
                                      'document.documentElement.clientHeight,' +
                                      'document.documentElement.scrollHeight,' +
                                      'document.documentElement.offsetHeight));')
    .then(function (documentHeight) {
      // If the size of the screenshot to be taken is smaller than
      // the height of the window, then resize the window.
      var onWindowResized = new Promise((resolve, reject) => {
        console.log(util.format('Resizing window to 1600x%s', documentHeight));
        browser.driver.manage().window().setSize(1600, documentHeight);

        // Give the window some time to resize before continuing
        sleep().then(resolve);
      });

      // Scroll to the current position
      var scroll = onWindowResized.then(
        () => browser.executeScript('window.scrollTo(0, 0);'));

      // Take the screenshot
      var screenshot = scroll.then(() => sleep(2000)).then(() => {
        console.log('Taking screenshot');
        return browser.takeScreenshot();
      });

      // Continue until the screenshot have been taken
      return screenshot.then((png) => {
        console.log('Done');
        return new Buffer(png, 'base64');
      });
    });
}

/**
 * A simple utility function that returns a promise which resolves after the
 * duration `delay` (ms) has elapsed.
 */
function sleep(delay = 1000) {
  return new Promise((resolve, reject) => setTimeout(resolve, delay));
}

module.exports = {
  takeScreenshot: takeScreenshot
};
