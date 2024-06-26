---
layout: post
title: eye doctor - Braeker CTF 2024 Challenge Writeup
categories: [CTF Jeopardy]
tags: [ctf jeopardy,misc]
permalink: /posts/eyedoctorbraekerctf2024
img_path: /images/ctfs/braekerctf2024
image:
  path: icon.jpg
---

This is a writeup for the challenge 'eye doctor' from Braeker 2024, I played this CTF with [thehackerscrew](http://www.thehackerscrew.team/).

You can join the Discord community for this CTF (with more writeups!) [here](https://discord.gg/txANaaygJe).

## The Challenge

### Challenge Metadata

The challenge was written by `spipm` and got 119 solves.

Here is the challenge description:

> A creaky old bot is zooming in and out of an eye chart. "Can you read the bottom line?" the doctor asks. "No way, " the bot replies. "At a certain distance my view becomes convoluted. Here, I'll make a screenshot." You and the doctor look at the screenshot. Can you tell what's wrong with the bot's visual processor?


### What are we working with?

We are given a PNG file which shows some distorted imagery for what looks like text:

![approach.png](approach.png)

Assuming that we need to 'deblur' the text to read it, I start looking online.

### Solution

Looking online for CTF image blurred I found [this resource](https://fareedfauzi.gitbook.io/ctf-playbook/steganography).

Scrolling through I found this entry: `13. Use SmartDeblur software to fix blurry on image.`

Downloading [SmartDeblur](http://smartdeblur.net/) I put the image in and try to automatically deblur it...

![approach_res_fail.png](approach_res_fail.png)

Well, that didn't work... Lets try some different settings.

I select a portion of the image and drop the size to 10x10.

![approach_res_good.png](approach_res_good.png)

Flag: <mark>brck{4ppr04ch1tfr0M4D1ff3r3ntAngl3}</mark>


## Thanks for reading!
Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev) and [LinkedIn](https://www.linkedin.com/in/noah-cooper-5442ab309/).

You can also find my other contacts on the [whoami](../about) page.
