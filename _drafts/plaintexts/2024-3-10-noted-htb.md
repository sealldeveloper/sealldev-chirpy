---
layout: post
title: Noted HackTheBox Sherlock - Writeup
categories: [HackTheBox Sherlock]
tags: [hackthebox,hackthebox easy,web,hackthebox sherlock]
img_path: /images/htb/sherlocks/noted
---

> Simon, a developer working at Forela, notified the CERT team about a note that appeared on his desktop. The note claimed that his system had been compromised and that sensitive data from Simon's workstation had been collected. The perpetrators performed data extortion on his workstation and are now threatening to release the data on the dark web unless their demands are met. Simon's workstation contained multiple sensitive files, including planned software projects, internal development plans, and application codebases. The threat intelligence team believes that the threat actor made some mistakes, but they have not found any way to contact the threat actors. The company's stakeholders are insisting that this incident be resolved and all sensitive data be recovered. They demand that under no circumstances should the data be leaked. As our junior security analyst, you have been assigned a specific type of DFIR (Digital Forensics and Incident Response) investigation in this case. The CERT lead, after triaging the workstation, has provided you with only the Notepad++ artifacts, suspecting that the attacker created the extortion note and conducted other activities with hands-on keyboard access. Your duty is to determine how the attack occurred and find a way to contact the threat actors, as they accidentally locked out their own contact information. Warning : This sherlock requires an element of OSINT and players will need to interact with 3rd party services on internet.

**Challenge created by:** [CyberJunkie](https://app.hackthebox.com/users/468989)

An initial look at the files shows some artifacts from Notepad++.

## Task 1
> What is the full path of the script used by Simon for AWS operations?

Looking inside the `config.xml` file, we can see in the artifact that a `History` object exists, containing some entries:

```xml
<File filename="C:\Program Files\Notepad++\change.log" />
<File filename="C:\Users\Simon.stark\Documents\Internal-DesktopApp\Prototype-Internal_Login.cs" />
<File filename="C:\Users\Simon.stark\Documents\Dev-WebServer-BetaProd\dev2prod_fileupload.php" />
<File filename="C:\Users\Simon.stark\Documents\Internal-DesktopApp\App_init_validation.yml" />
<File filename="C:\Users\Simon.stark\Documents\Dev_Ops\AWS_objects migration.pl" />
```

One of them called 'AWS_objects migration.pl` seems like the way to go

Answer: <mark>C:\Users\Simon.stark\Documents\Dev_Ops\AWS_objects migration.pl</mark>

## Task 2
> The attacker duplicated some program code and compiled it on the system, knowing that the victim was a software engineer and had all the necessary utilities. They did this to blend into the environment and didn't bring any of their tools. This code gathered sensitive data and prepared it for exfiltration. What is the full path of the program's source file?

Inside the 'backup' folder is two files:
```
LootAndPurge.java@2023-07-24_145332
YOU HAVE BEEN HACKED.txt@2023-07-24_150548
```

LootAndPurge seems to contain some source code used to extract data.

Inside `session.xml` contains two 'sessions':

```
<File firstVisibleLine="21" xOffset="0" scrollWidth="848" startPos="1697" endPos="1697" selMode="0" offset="0" wrapCount="1" lang="Java" encoding="-1" userReadOnly="no" filename="C:\Users\Simon.stark\Desktop\LootAndPurge.java" backupFilePath="C:\Users\Simon.stark\AppData\Roaming\Notepad++\backup\LootAndPurge.java@2023-07-24_145332" originalFileLastModifTimestamp="-1354503710" originalFileLastModifTimestampHigh="31047188" tabColourId="-1" mapFirstVisibleDisplayLine="-1" mapFirstVisibleDocLine="-1" mapLastVisibleDocLine="-1" mapNbLine="-1" mapHigherPos="-1" mapWidth="-1" mapHeight="-1" mapKByteInDoc="512" mapWrapIndentMode="-1" mapIsWrap="no" />
<File firstVisibleLine="0" xOffset="0" scrollWidth="1072" startPos="672" endPos="672" selMode="0" offset="0" wrapCount="1" lang="None (Normal Text)" encoding="-1" userReadOnly="no" filename="C:\Users\Simon.stark\Desktop\YOU HAVE BEEN HACKED.txt" backupFilePath="C:\Users\Simon.stark\AppData\Roaming\Notepad++\backup\YOU HAVE BEEN HACKED.txt@2023-07-24_150548" originalFileLastModifTimestamp="1536217129" originalFileLastModifTimestampHigh="31047190" tabColourId="-1" mapFirstVisibleDisplayLine="-1" mapFirstVisibleDocLine="-1" mapLastVisibleDocLine="-1" mapNbLine="-1" mapHigherPos="-1" mapWidth="-1" mapHeight="-1" mapKByteInDoc="512" mapWrapIndentMode="-1" mapIsWrap="no" />
```

LootAndPurge.java is on the Desktop as listed in the first entry!

Answer: <mark>C:\Users\simon.stark\Desktop\LootAndPurge.java</mark>

## Task 3
> What's the name of the final archive file containing all the data to be exfiltrated?

Reading the LootAndPurge backup, a portion of the java code catches my eye:

```java
public static void main(String[] args) {
    String username = System.getProperty("user.name");
    String desktopDirectory = "C:\\Users\\" + username + "\\Desktop\\";
    List<String> extensions = Arrays.asList("zip", "docx", "ppt", "xls", "md", "txt", "pdf");
    List<File> collectedFiles = new ArrayList<>();
    
    collectFiles(new File(desktopDirectory), extensions, collectedFiles);
    
    String zipFilePath = desktopDirectory + "Forela-Dev-Data.zip";
    String password = "sdklY57BLghvyh5FJ#fion_7";
    
    createZipArchive(collectedFiles, zipFilePath, password);
    
    System.out.println("Zip archive created successfully at: " + zipFilePath);
}
```

We can see `zipFilePath` contains the path of the final exfiltrated zip.

Answer: <mark>Forela-Dev-Data.zip</mark>

## Task 4
> What's the timestamp in UTC when attacker last modified the program source file?

To parse out the timestamp I did some research on Notepad++ artifacts, looking for how to parse timestamps I find [this discussion](https://community.notepad-plus-plus.org/topic/22662/need-explanation-of-a-few-session-xml-parameters-values) and a reply says the following:

```
high = 30736076 (from originalFileLastModifTimestampHigh)
low = -386892058 = -X (so X = 386892058) (from originalFileLastModifTimestamp)
2^32 = 4294967296 (yes, exponentiation)
full value = high * 2^32 + (2^32 - X) = 30736076 * 4294967296  + (4294967296 - 386892058)
```

Let's apply this to our values from `session.xml` which should give us our LDAP timestamp.

```
high = 31047188
low = -1354503710
X = -low
full value = high * 2^32 + (2^32-X) = 
```

Answer: <mark>2023-07-24 09:53:23</mark>

![Success](submitted.png)

## Thanks for reading!
Feel free to give me feedback or follow me on [Twitter](https://twitter.com/sealldev).

You can also find my other contacts on the [whoami](../about) page.