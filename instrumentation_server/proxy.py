import argparse
import codecs
import gzip
import hashlib
import json
import inspect
import io
import os
import random
import re
import StringIO
import subprocess
import sys
import time
import traceback

from distutils.version import LooseVersion
from PIL import Image
from subprocess import CalledProcessError, Popen, PIPE, STDOUT
from threading import Timer

p = Popen(['mitmdump --version'], stdout=PIPE, stdin=PIPE, stderr=STDOUT, shell=True)
stdout = p.communicate()[0]
mitmversion = stdout.decode()[9:] # remove "mitmdump "

if LooseVersion(mitmversion) >= LooseVersion("0.17"):
  from mitmproxy.script import concurrent
else:
  from libmproxy.script import concurrent

ajaxracer_dir = os.path.join(os.path.dirname(__file__), '..')
instrumentation_script = os.path.join(ajaxracer_dir, 'src/instrumentation/instrument.js')

class bcolors:
  HEADER = '\033[95m'
  OKBLUE = '\033[94m'
  OKGREEN = '\033[92m'
  WARNING = '\033[93m'
  FAIL = '\033[91m'
  ENDC = '\033[0m'
  BOLD = '\033[1m'
  UNDERLINE = '\033[4m'

analysis_argv = None
use_cache = False

html_re = re.compile('^(<!doctype)|(<html)', re.I)
sanitize_re = re.compile('(\~)|(\s)', re.I)
xml_re = re.compile('^<\?xml', re.I)

def handle_html(flow, content):
  if len(content.strip()) == 0:
    return ''
  return instrument(flow, content, 'html')

def handle_js(flow, content):
  return instrument(flow, content, 'js')

def looks_like_html(text):
  no_whitespace = text.replace('\xef\xbb\xbf', '') # remove zero white space characters
  if bool(re.match(xml_re, no_whitespace)):
    lines = no_whitespace.split('\n', 1)
    if len(lines) >= 2:
      no_whitespace = lines[1]
    else:
      return False
  return bool(re.match(html_re, no_whitespace))

def looks_like_javascript(text):
  return not looks_like_json(text) and 'SyntaxError' not in execute(os.path.join(ajaxracer_dir, 'instrumentation_server/js_detector.js'), [], text, None, True)['stdout']

def looks_like_json(text):
  try:
    json.loads(text)
    return True
  except:
    return False

def instrument(flow, content, ext):
  try:
    url = flow.request.url
    name = re.sub(sanitize_re, '', os.path.splitext(flow.request.path_components[-1])[0] if len(flow.request.path_components) else 'index')

    hash = hashlib.md5(content).hexdigest()
    fileName = 'cache/' + flow.request.host + '/' + hash + '/' + name + '.' + ext
    instrumentedDir = 'cache/' + flow.request.host + '/' + hash + '/'
    instrumentedFileName = instrumentedDir + name + '.' + ext
    if not os.path.exists('cache/' + flow.request.host + '/' + hash):
      os.makedirs('cache/' + flow.request.host + '/' + hash)
    if not use_cache or not os.path.isfile(instrumentedFileName):
      # print('Cache miss: ' + fileName + ' from ' + url)
      with open(fileName, 'w') as file:
        if content.startswith(codecs.BOM_UTF16):
          file.write(content.decode('utf-16').encode('utf-8'))
        elif content.startswith(codecs.BOM_UTF16_BE):
          file.write(content.decode('utf-16-be').encode('utf-8'))
        elif content.startswith(codecs.BOM_UTF16_LE):
          file.write(content.decode('utf-16-le').encode('utf-8'))
        else:
          file.write(content)
      args = ['--kind', ext, '--o', instrumentedFileName, '--url', url]
      if ext == 'html' and analysis_argv != None:
        args = args + ['--argv', analysis_argv]
      execute(instrumentation_script, args, content)
    else:
      print('Cache hit: ' + fileName + ' from ' + url)
    with open (instrumentedFileName, "r") as file:
      data = file.read()
    return data
  except:
    print('Exception in processFile() @ proxy.py')
    exc_type, exc_value, exc_traceback = sys.exc_info()
    lines = traceback.format_exception(exc_type, exc_value, exc_traceback)
    print(''.join(lines))
    return content

if LooseVersion(mitmversion) >= LooseVersion("0.18"):
  def start():
    _start(sys.argv)
else:
  def start(context, argv):
    _start(argv)

def _start(argv):
  global analysis_argv, use_cache

  parser = argparse.ArgumentParser()
  parser.add_argument('--cache', action='store_true', help='enable caching', default=False)
  parser.add_argument('--argv', type=str, help='arguments for analysis', default=None)
  args, extra_arguments = parser.parse_known_args(argv)

  analysis_argv = args.argv
  use_cache = args.cache

if LooseVersion(mitmversion) >= LooseVersion("0.18"):
  def request(flow):
    _request(flow)
else:
  def request(context, flow):
    _request(flow)

def _request(flow):
  accept_encoding_key = 'Accept-Encoding'
  for key in flow.request.headers.keys():
    if key.lower() == 'accept-encoding':
      accept_encoding_key = key
      break

  # Unable to decode e.g. "br"
  flow.request.headers[accept_encoding_key] = 'gzip'

if LooseVersion(mitmversion) >= LooseVersion("0.18"):
  @concurrent
  def response(flow):
    _response(flow)
else:
  @concurrent
  def response(context, flow):
    _response(flow)

def _response(flow):
  url = flow.request.url

  if flow.error:
    print('Error: ' + str(flow.error))
  elif url != 'http://localhost:8080/out/analysis.js':
    try:
      flow.response.decode()

      content_type = None

      content_encoding_key = 'Content-Encoding'
      content_type_key = 'Content-Type'
      cors_key = "Access-Control-Allow-Origin"
      acac_key = "Access-Control-Allow-Credentials"
      csp_key = None
      location_key = None
      origin_key = "Origin"
      set_cookie_key = None

      if flow.response.status_code == 204:
        # No Content and a JavaScript request: change the status code such
        # that the code is instrumented (necessary for the 'script execute' hook)
        flow.response.status_code = 200
        content_type = 'text/javascript'

      if flow.request.path.endswith('.js'):
        content_type = 'text/javascript'
      elif flow.request.path.endswith('.html'):
        content_type = 'text/html'

      for key in flow.response.headers.keys():
        if key.lower() == 'access-control-allow-origin':
          cors_key = key
        if key.lower() == 'access-control-allow-credentials':
          acac_key = key
        elif key.lower() == 'content-encoding':
          content_encoding_key = key
        elif key.lower() == 'content-security-policy':
          csp_key = key
        elif key.lower() == 'location':
          location_key = key
        elif key.lower() == 'origin':
          origin_key = key
        elif key.lower() == 'set-cookie':
          set_cookie_key = key
        elif key.lower() == 'content-type':
          content_type_key = key
          if not content_type:
            content_type = flow.response.headers[key].lower()

      content_type = infer_content_type(url, flow.response.content, content_type)
      if content_type == 'text/html':
        flow.response.content = compress(handle_html(flow, flow.response.content))
        flow.response.headers[content_encoding_key] = 'gzip'
        flow.response.headers[content_type_key] = 'text/html'
      elif content_type == 'text/javascript':
        # set 500 to generate an error event, if the server returned
        # an HTML error page for the script...
        if looks_like_html(flow.response.content):
          flow.response.status_code = 500
          flow.response.content = compress('console.error("Unexpected: response that looks like HTML with content type text/javascript");')
        else:
          flow.response.content = compress(handle_js(flow, flow.response.content))
        flow.response.headers[content_encoding_key] = 'gzip'
        flow.response.headers[content_type_key] = 'text/javascript'
      elif content_type == 'image/gif':
        # remove animation from gif, for consistent screenshot oracle
        image = Image.open(io.BytesIO(flow.response.content))
        try:
          transparency = image.info['transparency']
          out = io.BytesIO()
          image.save(out, format='GIF', transparency=transparency)
          flow.response.content = out.getvalue()
        except:
          None

      # To prevent redirect loops
      if location_key and flow.request.url == flow.response.headers[location_key]:
        flow.response.headers.pop(location_key, None)
        flow.response.status_code = 500

      # Disable the content security policy since it may prevent instrumented code from executing
      if csp_key:
        flow.response.headers.pop(csp_key, None)
    except:
      print('Exception in response() @ proxy.py')
      exc_type, exc_value, exc_traceback = sys.exc_info()
      lines = traceback.format_exception(exc_type, exc_value, exc_traceback)
      print(''.join(lines))

def infer_content_type(url, data, content_type, infer=False):
  stripped = data.strip()
  if content_type:
    if content_type.find('html') >= 0:
      if len(stripped) == 0 or looks_like_html(stripped):
        return 'text/html'
      print(bcolors.WARNING + 'Warning: \'%s\' does not look like HTML, but Content-Type was \'%s\'' % (url, content_type) + bcolors.ENDC)
      print('Source: %s' % (stripped if len(stripped) < 100 else stripped[:100]))
      if looks_like_javascript(stripped):
        return 'text/javascript'
    elif looks_like_html(stripped):
      print(bcolors.WARNING + 'Warning: \'%s\' looks like HTML, but Content-Type was \'%s\'' % (url, content_type) + bcolors.ENDC)
      print('Source: %s' % (stripped if len(stripped) < 100 else stripped[:100]))

    if content_type.find('javascript') >= 0:
      if len(stripped) > 0:
        if looks_like_json(stripped):
          print(bcolors.WARNING + 'Warning: \'%s\' looks like JSON, but Content-Type was \'%s\'' % (url, content_type) + bcolors.ENDC)
          print('Source: %s' % (stripped if len(stripped) < 100 else stripped[:100]))
          return 'text/json'
        elif not looks_like_javascript(stripped):
          return None # dunno!
      return 'text/javascript'
    elif len(stripped) > 0 and not looks_like_json(stripped) and looks_like_javascript(stripped):
      print(bcolors.WARNING + 'Warning: \'%s\' looks like JavaScript, but Content-Type was \'%s\'' % (url, content_type) + bcolors.ENDC)
      print('Source: %s' % (stripped if len(stripped) < 100 else stripped[:100]))
      return 'text/javascript'
    elif content_type.find('image/gif') >= 0: # e.g., "image/gif; charset=utf-8"
      return 'image/gif'
  elif stripped:
    if looks_like_html(stripped):
      print(bcolors.WARNING + 'Warning: \'%s\' looks like HTML, but Content-Type was missing' % (url) + bcolors.ENDC)
      print('Source: %s' % (stripped if len(stripped) < 100 else stripped[:100]))
    elif looks_like_javascript(stripped):
      print(bcolors.WARNING + 'Warning: \'%s\' looks like JavaScript, but Content-Type was missing' % (url) + bcolors.ENDC)
      print('Source: %s' % (stripped if len(stripped) < 100 else stripped[:100]))

  return content_type

def compress(input):
  out = StringIO.StringIO()
  with gzip.GzipFile(fileobj=out, mode="w") as f:
    f.write(input)
  return out.getvalue()

def encode_input(input):
  if input.startswith(codecs.BOM_UTF16):
    return input.decode('utf-16').encode('utf-8')
  elif input.startswith(codecs.BOM_UTF16_BE):
    return input.decode('utf-16-be').encode('utf-8')
  elif input.startswith(codecs.BOM_UTF16_LE):
    return input.decode('utf-16-le').encode('utf-8')
  return input

def execute(script, args, stdin=None, env=None, quiet=False):
  """Execute script and print output"""
  try:
    cmd = ["node", script] + args
    sub_env = os.environ.copy()
    if (env):
      for key in env.keys():
        sub_env[key] = env[key]
    # print(' '.join(cmd))
    p = Popen(cmd, env=sub_env, stdin=PIPE, stdout=PIPE, stderr=subprocess.STDOUT)
    stdout = p.communicate(input=encode_input(stdin) if stdin else None)[0]
    if not quiet and len(stdout) > 0:
      print(stdout)
    return { 'stdout': stdout, 'returncode': p.returncode }
  except subprocess.CalledProcessError, e:
    print(e.output)
  return { 'stdout': e.output, 'returncode': 1 }
