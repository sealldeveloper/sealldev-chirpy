---
layout: post
title: How to make password protected Jekyll posts
categories: [Guides]
tags: [how to,password protect,posts]
---

Gday! This is a more casual non-cybersec post on how I do my password-protected posts for this site, specifically those for active HTB machines. When a HackTheBox machine is active you are **not allowed** to share writeups and flags, etc, so I password protect the posts with the root hash to only let people in if they have the hash! This will show you how to do it (this post is assuming the Chirpy Jekyll theme for convinience purposes).

## Step 1. Setting up
So the original script we are going to use comes from a [repo by lilykonings](https://github.com/lilykonings/jekyll-password-protect) for Jekyll password proteciton. We are going to need the `gulpfile.js` and the `_layouts/encrypted.html` files and put them into our theme.

Once that's done, we are going to modify the `_layouts/encrypted.html` to be the way we like, I have my layout as follows:
```html
---
layout: post
---

<div id="encrypted_content">
  <p>This is an encrypted post, typically this is for a writeup thats not finished or for something that can't be released yet (like a HTB machine writeup).</p>
  <div class="text-center">
    <input id="encrypt_password"
           type="password"
           name="password"
           placeholder="Unlock with root flag"
           autofocus 
           class="form-control"/>
    <br>
    <br>
    <style>
      .btn-primary {
      background-color: rgb(94, 0, 182);
      border-color: rgb(94, 0, 182);
    }
    .btn-primary:hover {
      background-color: rgb(37, 0, 71);
      border-color: rgb(37, 0, 71);
    }
    </style>
    <input id="submission" type="submit" class="btn btn-primary" value="Unlock"/>
    <br>
    <div id="alert-region">
      <br>
    </div>
    <br>
    <small>Encrypted layout by <a href="https://seall.dev">seall.dev</a></small>
  </div>
  <script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/crypto-js/3.1.9-1/crypto-js.js"></script>
  <script>
    document.getElementsByClassName("shimmer")[0].className=document.getElementsByClassName("shimmer")[0].className.replace(' shimmer','');
    document.getElementById('submission').addEventListener('click', function(e) {
      e.preventDefault();
      var passphrase = document.getElementById('encrypt_password').value,
          encryptedMsg = '{{ page.encrypted }}',
          encryptedHMAC = encryptedMsg.substring(0, 64),
          encryptedHTML = encryptedMsg.substring(64),
          decryptedHMAC = CryptoJS.HmacSHA256(encryptedHTML, CryptoJS.SHA256(passphrase).toString()).toString(),
          alertHtml = '<div class="alert alert-danger" role="alert">Incorrect root flag!</div><br>';

      if (decryptedHMAC !== encryptedHMAC) {
        document.getElementById('alert-region').innerHTML += alertHtml; 
        len = document.getElementById('alert-region').children.length;
        id = Math.random(Math.random() * 999999999999999999999);
        document.getElementById('alert-region').children[len-1].id=id;
        document.getElementById('alert-region').children[len-2].id=id+1;
        setTimeout(function() {
          document.getElementById(id).parentNode.removeChild(document.getElementById(id));
          document.getElementById(id+1).parentNode.removeChild(document.getElementById(id+1));
        }, 3000);
        return false;
      }

      var plainHTML = CryptoJS.AES.decrypt(encryptedHTML, passphrase).toString(CryptoJS.enc.Utf8);
      document.getElementById('alert-region').classList = 'visually-hidden';
      document.getElementById('encrypted_content').innerHTML = plainHTML;
      return false;
    });
  </script>
  
</div>
```

## Step 2. Getting our post ready for encryption
So, let's say we have a finished writeup, and the root hash is `sealldev` (were pretending, don't use that). We need to do that in the `gulpfile.js`, on line 93 is the `.pipe(encrypt('password'))` line, change the `password` to `sealldev`.

Now, if our post is in Markdown we can't just encrypt it as is, as it loses all of the formatting the theme gives your markdown to make it nice and ✨ pretty ✨. So you have to do the following:
1. Make your post active but **do not publish it publically**.
2. Start up a local instance of your Jekyll site. I do mine with `bundle exec jekyll serve`.
3. Visit that instance, and go to the post you are going to encrypt. **IMPORTANT: Make sure to scroll through and load the entire post.**
4. **Specific to Chirpy:** Find the `<div class="content">` tag and right clicl > Copy > Inner HTML. If you are **not on Chirpy** look for your content inside a tag and do the same copying of the inner HTML.
5. With your copied content, make a new HTML file in the `_protected` folder (if it doesn't exist make it) and give it the same name as your Markdown file (or otherwise) and make sure it ends with `.html`.

Alright, were nearly there!

## Step 3. Encrypting

**Be careful**, if you overwrite your plaintext and do not have a backup you can erase your work, I keep a copy in my `_drafts` folder **always**. Now, with your file named correctly we need to do a few things.

You need to prepend the header content to your HTML file. So for example some header content could be:
```html
---
layout: post
title: Blah!
---
```

Your HTML file needs to be like this:
```html
---
layout: post
title: Blah!
---
<HTML data copied from post>
```

Now, our current layout is `post`, change it to `encrypted` to use the right layout.
```html
---
layout: encrypted
title: Blah!
---
<HTML data copied from post>
```

Ok! You are ready to encrypt! When you are ready run `gulp` in the root directory of your site, you should get hung on a `Starting 'firewall:watch'...` and after a few seconds press `Ctrl+C` to exit that, you should now in your posts have an encrypted HTML file, it might look a bit like this:
```html
---
layout: encrypted
title: Blah!

encrypted: <lots of junk>
---
```

If you visit your local instance now you should be prompted to use the password, the password will be whatever you set in the `gulpfile.js` at the time you ran it on that file, so if you followed the example earlier the password should be `sealldev`.

## Step 4. Extra Credit

Now, some small bugs I observed when doing this process was certain images would keep thier `shimmer` effect for loading, I fixed this with the JS I added in my `encrypted.html` layout so if you made your own feel free to grab it.

Furthermore if you want to have your home page (Chirpy specific again) have text render like the start of the post (otherwise its blank) you can add some text here:
```html
---
layout: encrypted
title: Blah!

encrypted: <lots of junk>
---
<ADD TEXT HERE!>
```

## Thanks for reading!
If this did help **please** leave a little note of credit on your `encrypted.html` perhaps with a link to this post.

Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev).

You can also find my other contacts on the [whoami](../about) page.