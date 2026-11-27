# Stamp a new version on every file reference so browsers fetch fresh copies after a deploy.
# Run before committing a release:  powershell -File tools/bump-version.ps1
# - js/version.js and version.json get the new version (the site compares them on load).
# - Every relative JS import, dynamic import, script src and stylesheet href gets ?v=<version>.
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$v = Get-Date -Format 'yyyyMMddHHmmss'
$utf8 = New-Object System.Text.UTF8Encoding($false)

function Update-File($path, [scriptblock]$change) {
  $text = [System.IO.File]::ReadAllText($path)
  $new = & $change $text
  if ($new -ne $text) { [System.IO.File]::WriteAllText($path, $new, $utf8) }
}

# JS: static imports, side-effect imports and dynamic imports of relative .js files.
Get-ChildItem -Path (Join-Path $root 'js') -Recurse -Filter *.js | ForEach-Object {
  Update-File $_.FullName {
    param($t)
    $t = [regex]::Replace($t, "(from\s*|import\s*\(?\s*)'(\.{1,2}/[^'?]+\.js)(\?v=[^']*)?'", { param($m) "$($m.Groups[1].Value)'$($m.Groups[2].Value)?v=$v'" })
    $t
  }
}

# HTML: page scripts and the stylesheet.
Get-ChildItem -Path $root -Filter *.html | ForEach-Object {
  Update-File $_.FullName {
    param($t)
    $t = [regex]::Replace($t, '(src="js/[^"?]+\.js)(\?v=[^"]*)?"', { param($m) "$($m.Groups[1].Value)?v=$v`"" })
    $t = [regex]::Replace($t, '(href="css/style\.css)(\?v=[^"]*)?"', { param($m) "$($m.Groups[1].Value)?v=$v`"" })
    $t
  }
}

[System.IO.File]::WriteAllText((Join-Path $root 'js/version.js'), "// Set by tools/bump-version.ps1. Compared with version.json on load to catch stale caches.`nexport const VERSION = '$v';`n", $utf8)
[System.IO.File]::WriteAllText((Join-Path $root 'version.json'), "{ `"v`": `"$v`" }`n", $utf8)
Write-Output "Version $v"
