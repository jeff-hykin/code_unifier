#!/usr/bin/env sh
"\"",`$(echo --% ' |out-null)" >$null;function :{};function dv{<#${/*'>/dev/null )` 2>/dev/null;dv() { #>
echo "1.31.3"; : --% ' |out-null <#';};v="$(dv)";d="$HOME/.deno/$v/bin/deno";if [ -x "$d" ];then exec "$d" run -q -A "$0" "$@";elif [ -f "$d" ];then chmod +x "$d" && exec "$d" run -q -A "$0" "$@";fi;bin_dir="$HOME/.deno/$v/bin";exe="$bin_dir/deno";has() { command -v "$1" >/dev/null; };if ! has unzip;then :;if ! has apt-get;then has brew && brew install unzip;else if [ "$(whoami)" = "root" ];then apt-get install unzip -y;elif has sudo;then echo "Can I install unzip for you? (its required for this command to work) ";read ANSWER;echo;if [ "$ANSWER" =~ ^[Yy] ];then sudo apt-get install unzip -y;fi;elif has doas;then echo "Can I install unzip for you? (its required for this command to work) ";read ANSWER;echo;if [ "$ANSWER" =~ ^[Yy] ];then doas apt-get install unzip -y;fi;fi;fi;fi;if ! has unzip;then echo "";echo "So I couldn't find an 'unzip' command";echo "And I tried to auto install it, but it seems that failed";echo "(This script needs unzip and either curl or wget)";echo "Please install the unzip command manually then re-run this script";exit 1;fi;if [ "$OS" = "Windows_NT" ];then target="x86_64-pc-windows-msvc";else :; case $(uname -sm) in "Darwin x86_64") target="x86_64-apple-darwin" ;; "Darwin arm64") target="aarch64-apple-darwin" ;; *) target="x86_64-unknown-linux-gnu" ;; esac;fi;deno_uri="https://github.com/denoland/deno/releases/download/v$v/deno-$target.zip";if [ ! -d "$bin_dir" ];then mkdir -p "$bin_dir";fi;if has curl;then curl --fail --location --progress-bar --output "$exe.zip" "$deno_uri";elif has wget;then wget --output-document="$exe.zip" "$deno_uri";else echo "Howdy! I looked for the 'curl' and for 'wget' commands but I didn't see either of them.";echo "Please install one of them";echo "Otherwise I have no way to install the missing deno version needed to run this code";fi;unzip -d "$bin_dir" -o "$exe.zip";chmod +x "$exe";rm "$exe.zip";exec "$d" run -q -A "$0" "$@"; #>}; $DenoInstall = "${HOME}/.deno/$(dv)"; $BinDir = "$DenoInstall/bin"; $DenoExe = "$BinDir/deno.exe"; if (-not(Test-Path -Path "$DenoExe" -PathType Leaf)) { $DenoZip = "$BinDir/deno.zip"; $DenoUri = "https://github.com/denoland/deno/releases/download/v$(dv)/deno-x86_64-pc-windows-msvc.zip"; [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12; if (!(Test-Path $BinDir)) { New-Item $BinDir -ItemType Directory | Out-Null; } Function Test-CommandExists { Param ($command); $oldPreference = $ErrorActionPreference; $ErrorActionPreference = "stop"; try {if(Get-Command "$command"){RETURN $true}} Catch {Write-Host "$command does not exist"; RETURN $false} Finally {$ErrorActionPreference=$oldPreference}; } if (Test-CommandExists curl) { curl -Lo $DenoZip $DenoUri; } else { curl.exe -Lo $DenoZip $DenoUri; } if (Test-CommandExists curl) { tar xf $DenoZip -C $BinDir; } else { tar.exe   xf $DenoZip -C $BinDir; } Remove-Item $DenoZip; $User = [EnvironmentVariableTarget]::User; $Path = [Environment]::GetEnvironmentVariable('Path', $User); if (!(";$Path;".ToLower() -like "*;$BinDir;*".ToLower())) { [Environment]::SetEnvironmentVariable('Path', "$Path;$BinDir", $User); $Env:Path += ";$BinDir"; } }; & "$DenoExe" run -q -A "$PSCommandPath" @args; Exit $LastExitCode; <#
# */0}`;

import { autoRenameVars, parser, removeComments } from "../languages/python.js"
import { StackManager, replaceSequence, parseTreeAsHtmlLikeString } from "../tooling.js"

const somePythonCode = `
a = 10
b = 99
c = 100
d = 33

def some_function(*args):
    """
        heredoc
    """
    global a
    b = 0 # not the same as the outer b
    for each in range(c):
        b += 1
    
    """
        random string
    """
    a += 1 # is the same as the outer a
    
    def inner():
        nonlocal d
        
        d += 1 # is the some_function d not the global d
        c = 10
        print(c) # local c
        return b # is the some_function b not the global b
    
    inner()
    return d
`

console.log(parseTreeAsHtmlLikeString(parser.parse(somePythonCode)))

const newCode = removeComments({
    code: somePythonCode,
})

console.log(newCode)

// (this comment is part of deno-guillotine, dont remove) #>