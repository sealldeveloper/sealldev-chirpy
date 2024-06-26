---
layout: post
title: Constellation HackTheBox Sherlock - Writeup
categories: [HackTheBox Sherlocks]
tags: [hackthebox,hackthebox medium,web,hackthebox sherlock]
img_path: /images/htb/sherlocks/constellation
image:
    path: icon.png
---

> The SOC team has recently been alerted to the potential existence of an insider threat. The suspect employee's workstation has been secured and examined. During the memory analysis, the Senior DFIR Analyst succeeded in extracting several intriguing URLs from the memory. These are now provided to you for further analysis to uncover any evidence, such as indications of data exfiltration or contact with malicious entities. Should you discover any information regarding the attacking group or individuals involved, you will collaborate closely with the threat intelligence team. Additionally, you will assist the Forensics team in creating a timeline. Warning : This Sherlock will require an element of OSINT and some answers can be found outside of the provided artifacts to complete fully.

**Challenge created by:** [CyberJunkie](https://app.hackthebox.com/users/468989)

An initial look at the files, we start with two files: `IOCs.txt` and `NDA_Instructions.pdf`.

## Task 1
> When did the suspect first start Direct Message (DM) conversations with the external entity (A possible threat actor group which targets organizations by paying employees to leak sensitive data)? (UTC)

Looking at the `IOCs.txt` we can see URL 1 is a Discord URL.

`https://cdn.discordapp.com/attachments/1152635915429232640/1156461980652154931/NDA_Instructions.pdf?ex=65150ea6&is=6513bd26&hm=64de12da031e6e91cc4f35c64b2b0190fb040b69648a64365f8a8260760656e3&`

We can use [Snowstamp](https://snowsta.mp/) to convert a discord ID to a timestamp.

Using the first ID mentioned (`1152635915429232640`) we get the output: `1694880217`, which is 2023-09-16 16:03:37 UTC

Answer: <mark>2023-09-16 16:03:37</mark>

## Task 2
> What was the name of the file sent to the suspected insider threat?

The PDF we're given is intended for the insider threat.

Answer: <mark>NDA_Instructions.pdf</mark>

## Task 3
> When was the file sent to the suspected insider threat? (UTC)

The file being sent we can tell from the discord attachment expiry timestamps in the parameters of the URL.

Doing some research we can find what each of the parameters are, here is [a Reddit Post with a comment of interest](https://www.reddit.com/r/discordapp/comments/16sm3lc/tracking_added_to_all_links_now/)

> Apparently it's not tracking, but rather a signature and timestamp. CDN links expire now, so if you link to something off-platform, it'll expire after a bit.
> ex: expiry time
> is: timestamp when url was issued
> sg: signature valid until ex

So, if we use the `is` parameter we can get the timestamp the file was sent.

Converting the current value from hex (`6513bd26`) into decimal gives an epoch timestamp: `1695792422`. Converting the epoch timestamp then returns the flag.

Answer: <mark>2023-09-27 05:27:02</mark>

## Task 4
> The suspect utilised Google to search something after receiving the file. What was the search query?

Reading the second URL in `IOCs.txt` we can see a query in the URL.

`https://www.google.com/search?q=how+to+zip+a+folder+using+tar+in+linux&sca_esv=568736477&hl=en&sxsrf=AM9HkKkFWLlX_hC63KqDpJwdH9M3JL7LZA%3A1695792705892&source=hp&ei=Qb4TZeL2M9XPxc8PwLa52Ag&iflsig=AO6bgOgAAAAAZRPMUXuGExueXDMxHxU9iRXOL-GQIJZ-&oq=How+to+archive+a+folder+using+tar+i&gs_lp=Egdnd3Mtd2l6IiNIb3cgdG8gYXJjaGl2ZSBhIGZvbGRlciB1c2luZyB0YXIgaSoCCAAyBhAAGBYYHjIIEAAYigUYhgMyCBAAGIoFGIYDMggQABiKBRiGA0jI3QJQ8WlYxIUCcAx4AJABAJgBqQKgAeRWqgEEMi00NrgBAcgBAPgBAagCCsICBxAjGOoCGCfCAgcQIxiKBRgnwgIIEAAYigUYkQLCAgsQABiABBixAxiDAcICCBAAGIAEGLEDwgILEAAYigUYsQMYgwHCAggQABiKBRixA8ICBBAjGCfCAgcQABiKBRhDwgIOEC4YigUYxwEY0QMYkQLCAgUQABiABMICDhAAGIoFGLEDGIMBGJECwgIFEC4YgATCAgoQABiABBgUGIcCwgIFECEYoAHCAgUQABiiBMICBxAhGKABGArCAggQABgWGB4YCg&sclient=gws-wiz`

The `q` parameter contains the query: `how+to+zip+a+folder+using+tar+in+linux`

Answer: <mark>how to zip a folder using tar in linux</mark>

## Task 5
> The suspect originally typed something else in search tab, but found a Google search result suggestion which they clicked on. Can you confirm which words were written in search bar by the suspect originally?

Reading the other parameters, we can see `oq` (presumably original query): `How+to+archive+a+folder+using+tar+i`

Answer: <mark>How to archive a folder using tar i</mark>

## Task 6
> When was this Google search made? (UTC)

In the second URL again, parameter `sxsrf` contains an epoch timestamp: `1695792705892`.

Converting this we get our timestamp.

Answer: <mark>2023-09-27 05:31:45</mark>

## Task 7
> What is the name of the Hacker group responsible for bribing the insider threat?

Reading the `NDA_Instruction.pdf`, the group calls themselves: `AntiCorp Gr04p`

Answer: <mark>AntiCorp Gr04p</mark>

## Task 8
> What is the name of the person suspected of being an Insider Threat?

PDF calls the employee: `karen riley`

Answer: <mark>Karen Riley</mark>

## Task 9
> What is the anomalous stated creation date of the file sent to the insider threat? (UTC)

Reading the PDF with `exiftool`, the creation date is stated as: `Create Date                     : 2054:01:17 22:45:22+01:00`

The flag is supposed to be in UTC, so it should be `2054:01:17 21:45:22` but it is not, it is `2054:01:17 22:45:22`.

Answer: <mark>2054-01-17 22:45:22</mark>

## Task 10
> The Forela threat intel team are working on uncovering this incident. Any OpSec mistakes made by the attackers are crucial for Forela's security team. Try to help the TI team and confirm the real name of the agent/handler from Anticorp.

Inside the PDF's `exiftool` is an author output: `CyberJunkie@AntiCorp.Gr04p`.

Searching for this results in a [LinkedIn page](https://www.linkedin.com/in/abdullah-al-sajjad-434545293).

Their name is `Abdullah Al Sajjad`.

Answer: <mark>Adbullah Al Sajjad</mark>

## Task 11
> Which City does the threat actor belong to?

On their LinkedIn page is the following location: `Bahawalpur, Punjab, Pakistan`

Answer: <mark>Bahawalpur</mark>

## The End!

![Success](submitted.png)

## Thanks for reading!
Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev) and [LinkedIn](https://www.linkedin.com/in/noah-cooper-5442ab309/).

You can also find my other contacts on the [whoami](../about) page.