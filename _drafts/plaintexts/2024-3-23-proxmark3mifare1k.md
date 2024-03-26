---
layout: post
title: Reading an Opal card with a Proxmark3
categories: [Other]
tags: [rf,proxmark3,mifare,mifare desfire,physical security]
permalink: /posts/reading-an-opal-card-with-a-proxmark3
img_path: /images/other/proxmark3
image:
  path: shot1.png
---

This is a post about hacking an Australian transport card with the Proxmark3. This post will outline parsing the output and learning to work with big/small endianness in Python, as well as expanding my knowledge on general physical card security.

## What is an Opal card, and what's a Proxmark3?

An Opal card is a form of transport card in NSW, Australia. We use it on Trains, Buses, Light rails, Ferrys, and the Metro. It's a quicker way of paying and works like most other transport cards around the world with a tap-on system. There is a few types of cards depending on who you are: Adult, Child/Youth, Gold, Concession, School and Free.

The Adult, Child/Youth and Gold cards are all cards that charge you from a sum of money, while Concessio, School and Free cost nothing and use a different card type.
## Setup

Firstly start with downloading [eried's self-executable version of TempestSDR for Windows](https://github.com/eried/Research/tree/master/HackRF/TempestSDR), specifically the `TempestSDR_win32_openjdk-14.0.1.zip`. If the link is down in the future I've archived a version on [The Wayback Machine](http://web.archive.org/web/20240314111651/https://raw.githubusercontent.com/eried/Research/master/HackRF/TempestSDR/TempestSDR_win32_openjdk-14.0.1.zip).

After downloading, I unzip and run `TempestSDR.exe`.

![tempestsdr.png](tempestsdr.png)

Select the `File` option in the top-left, then click `Load ExtIO source`.

![extio.png](extio.png)

If you have the HackRF plugged in, a popup should appear.

![hackrfsettings.png](hackrfsettings.png)

I close the menu changing no settings.

## Options

![settings.png](settings.png)

## Sniffing

I find the most easily sniffable cable to be my DVI-D for one of my monitors, the process I used to find the signal was as follows:

![options.png](options.png)

1. I put the gain quite high and then adjust the frequency to find the loudest range (the red underlined values).

2. I look at the blue circled peaks to select them for the settings, knowing the monitors res for your bottom graph selection is useful. You can use `AUT` to identify the monitor with some success.

3. After you find a somewhat clear signal (can see the letters or some distinguishing features), turn off the auto mode for FPS (the A next to the arrows), and then use the arrows to manually hone the signal (green square).
   - 3a. If i'm unable to find a clear signal, I use `RST` to reset my history from the antenna, particularly useful if you know that you got some garbage input.

4. Afterwards I use `Lpass` to smooth bits of the signal for a clear video stream.

## Results

Here are a few shots I got:

![shot1.png](shot1.png)

![shot2.png](shot2.png)

![shot3.png](shot3.png)

## Thanks for reading!
Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev).

You can also find my other contacts on the [whoami](../about) page.
