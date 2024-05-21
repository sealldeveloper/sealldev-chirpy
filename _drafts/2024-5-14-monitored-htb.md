---
layout: post
title: Monitored HackTheBox Machine - Writeup
categories: [HackTheBox Machines]
tags: [hackthebox,web,hackthebox medium,linux,]
img_path: /images/htb/easy/twomillion/
image:
  path: icon.png
---

This machine was alright, I really wasn't a fan of Nagios and I still am not just due to lack of documentation and the difficulty working with it.

**Machine created by:** [TheCyberGeek](https://app.hackthebox.com/users/114053)

## Recon

Let's start with a port scan:

```
$ sudo nmap 10.10.11.221 --top-ports 2500
Starting Nmap 7.94 ( https://nmap.org ) at 2024-01-05 08:20 AEDT
Nmap scan report for 10.10.11.221
Host is up (0.015s latency).
Not shown: 2498 closed tcp ports (reset)
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
389/tcp open  ldap
443/tcp open  https
5667/tcp open  unknown
```



![Success](submitted.png)

## Thanks for reading!
Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev).

You can also find my other contacts on the [whoami](../about) page.