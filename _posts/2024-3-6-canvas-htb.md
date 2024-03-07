---
layout: post
title: Canvas HackTheBox Challenge - Writeup
categories: [HackTheBox Challenge]
tags: [hackthebox,hackthebox easy,misc,hackthebox challenge]
img_path: /images/htb/challenges/canvas
---

> We want to update our website but we are unable to because the developer who coded this left today. Can you take a look?

**Challenge created by:** [artikrh](https://app.hackthebox.com/users/41600)

After initially opening the zip there are a few files/folders that are a very typical website structure:
```
$ ls
css/ dashboard.html index.html js/
```

All of the HTML files are quite bland and empty, but the JS file catches my eye:

```js
var _0x4e0b=['\x74\x6f\x53\x74\x72\x69\x6e\x67','\x75\x73\x65\x72\x6e\x61\x6d\x65',...
```

It's all obfuscated, so let's try de-obfuscate that code. Looking online I find this [deobfuscator](https://deobfuscate.io/) but when I go to paste the code I get a message:

![notif.png](notif.png)

Oh! The deobfuscator has analysed that this code was likely obfuscated with `Obfuscator.io`, so let's go to [the deobfuscator for that specific one](https://obf-io.deobfuscate.io/).

![deobfus.png](deobfus.png)

Now we have nice clear, readable code... kind of.

```js
var _0x4e0b = ["toString", "username", "console", "getElementById", "log", "bind", "disabled", "apply", "admin", "prototype", "{}.constructor(\"return this\")( )", " attempt;", "value", "constructor", "You have left ", "trace", "return /\" + this + \"/", "table", "length", "__proto__", "error", "Login successfully"];
(function (_0x173c04, _0x4e0b6e) {...
```

Looking through the code though, this specific portion catches my eye at the end.

```js
var res = String.fromCharCode(0x48, 0x54, 0x42, 0x7b, 0x57, 0x33, 0x4c, 0x63, 0x30, 0x6d, 0x33, 0x5f, 0x37, 0x30, 0x5f, 0x4a, 0x34, 0x56, 0x34, 0x35, 0x43, 0x52, 0x31, 0x70, 0x37, 0x5f, 0x64, 0x33, 0x30, 0x62, 0x46, 0x75, 0x35, 0x43, 0x34, 0x37, 0x31, 0x30, 0x4e, 0x7d, 0xa);
```

It seems to contain a string! So let's see what it is. The easiest way to do so is that, as this code has 0 execution properties, we can open up console in out browser and run it there to see what it resolves to.

![flag.png](flag.png)

And there's our flag! <mark>HTB{W3Lc0m3_70_J4V45CR1p7_d30bFu5C4710N}</mark>

![Success](submitted.png)

## Thanks for reading!
Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev).

You can also find my other contacts on the [whoami](../about) page.