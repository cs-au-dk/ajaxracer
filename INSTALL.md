# AjaxRacer: Install Instructions

*The following install instructions have been tested on Ubuntu 14.04.5. A VM where AjaxRacer and all of its dependencies have been installed is provided at <https://drive.google.com/open?id=1CP65UsDGsLc5t7S0mlGaALPyTzn_vBwv>.*

## Prerequisites

### Misc. prerequisites

```
sudo apt update
sudo apt install curl git graphviz
```

### Node.js v8.9.4 and NPM packages

1) Install Node.js and the NPM package manager

```
curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -
sudo apt-get install -y nodejs
```

2) Install Node.js v8.9.4 using the NPM package *n*

```
sudo npm install -g n
sudo n 8.9.4
```

3) Verify that the Node.js v8.9.4 is installed by running `node --version`

4) Install the following NPM packages

```
sudo npm install -g http-server lite-server @angular/cli@1.4.1
```

### Google Chrome and Protractor v5.2.0

1) Install Google Chrome from <https://www.google.com/chrome>

2) Install Protractor using NPM

```
sudo npm install -g protractor@5.2.0
sudo webdriver-manager update
```


### mitmproxy v0.17

1) Install mitmproxy v0.17:

   ```
   sudo apt install python-pip python-dev libffi-dev libssl-dev libxml2-dev libxslt1-dev libjpeg8-dev zlib1g-dev
   sudo pip install -U pip
   sudo pip install mitmproxy==0.17
   ```

   *Troubleshooting*: If the last command fails with an error, try to reinstall Python 2.7 (this should remove some packages that will be installed with mitmproxy):

   ```
   sudo apt remove python-2.7
   sudo apt install python-2.7
   ```

   It may be necessary to run `sudo apt-get install ubuntu-desktop` to prevent a blank screen after rebooting.

2) Install the mitmproxy certificate (needed for AjaxRacer to work with web applications that use SSL):

   A. Start mitmproxy by issuing the following command: `mitmdump -p 8080`

   B. Open <http://mitm.it/> in Google Chrome by issuing the following command *after closing all instances of Google Chrome*:

      `google-chrome-stable http://mitm.it/ --proxy-server="127.0.0.1:8080"`

   C. Download the mitmproxy certificate mitmproxy-ca-cert.pem for Ubuntu from <http://mitm.it/> by clicking on the button "Other"

   D. Install the mitmproxy certificate: Open chrome://settings/certificates in Google Chrome, click on "Authorities", and import the certificate mitmproxy-ca-cert.pem. In addition, issue the following commands.

      ```
      sudo cp ~/Downloads/mitmproxy-ca-cert.pem /usr/local/share/ca-certificates/mitmproxy-ca-cert.crt
      sudo update-ca-certificates
      ```

   E. Test that the mitmproxy certificate is installed correctly by running the following command.

      `google-chrome-stable https://github.com/cs-au-dk/ajaxracer --proxy-server="127.0.0.1:8080"`

      If mitmproxy has not been setup properly, Google Chrome will show a warning saying "Your connection is not private".


## Install instructions

Issue the following commands to install AjaxRacer.
```
git clone https://github.com/cs-au-dk/ajaxracer.git
cd ajaxracer
npm install
(cd report/; npm install)
```


## Verifying that everything works

Run AjaxRacer on one of the tests too check that AjaxRacer and its dependencies have been installed correctly by issuing following command (this will take a few minutes):

`./ajaxracer.js --run-id test --url test/ajax_nondeterministic_ui/index.html`

Then run the following command to serve the report on a local http-server (this will build the web site, which takes a few minutes):

`npm run report`

Finally, open the URL <http://localhost:3000/> in a browser to view the generated report.


## Usage

See [README.md](README.md).
