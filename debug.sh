#!/bin/bash

maxTimerDuration="2000"
maxTimerChainLength="100"
skipIntervalRegistrations="[]"
skipTimerRegistrations="[]"
waitForPromises="true"

while [ $# -gt 0 ]; do
  case "$1" in
    --h)
      echo "Usage: ./debug.sh [--max-timer-duration <ms>] [--no-wait-for-promises]"
      exit 0
      ;;
    --max-timer-chain-length)
      shift
      maxTimerChainLength="$1"
      ;;
    --max-timer-duration)
      shift
      maxTimerDuration="$1"
      ;;
    --skip-interval-registration)
      shift
      skipIntervalRegistrations="[\"$1\"]"
      ;;
    --skip-timer-registration)
      shift
      skipTimerRegistrations="[\"$1\"]"
      ;;
    --no-wait-for-promises)
      waitForPromises="false"
      ;;
    *)
      echo "Warning: Ignoring invalid argument: $1."
  esac
  shift
done

# 1) Start the HTTP server
http-server -p 8080 </dev/null >/dev/null 2>&1 &

# 2) Open Google Chrome
if [[ "$OSTYPE" == "darwin"* ]]; then
  open -a 'Google Chrome' --args http://localhost:8080/ --proxy-server="127.0.0.1:8081" --proxy-bypass-list="" \
                          --disable-application-cache --disk-cache-size=0 --media-cache-size=0 \
      </dev/null >/dev/null 2>&1 &
else
  # use nohup to completely detach the process from the terminal
  nohup google-chrome-stable http://localhost:8080/ --proxy-server="127.0.0.1:8081" --proxy-bypass-list="" \
                                                    --disable-application-cache --disk-cache-size=0 \
                                                    --media-cache-size=0 \
      </dev/null >/dev/null 2>&1 &
fi

# 3) Build the implementation
./src/utils/builder.js

# 4) Start the proxy server (blocking)
mitmdump --anticache --no-http2 -p 8081 -s "instrumentation_server/proxy.py --argv '{\"phase\":3,\"config\":{\"skipIntervalRegistrations\":${skipIntervalRegistrations},\"skipTimerRegistrations\":${skipTimerRegistrations},\"maxTimerDuration\":${maxTimerDuration},\"maxTimerChainLength\":${maxTimerChainLength},\"waitForPromises\":${waitForPromises}}}'"
