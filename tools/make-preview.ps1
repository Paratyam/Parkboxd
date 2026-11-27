# Draws og.png, the picture chat apps show next to a Parkboxd link. Original paper-cutout art.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$out = Join-Path (Split-Path -Parent $PSScriptRoot) 'og.png'
$W = 1200; $H = 630

function Get-Colour($hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }
function New-Brush($hex) { New-Object System.Drawing.SolidBrush(Get-Colour $hex) }
function New-Points($list) { [System.Drawing.PointF[]]@($list | ForEach-Object { New-Object System.Drawing.PointF($_[0], $_[1]) }) }
function Add-Shape($hex, $list, $outline = 3) {
  $p = New-Points $list
  $g.FillPolygon((New-Brush $hex), $p)
  if ($outline) { $g.DrawPolygon((New-Object System.Drawing.Pen((Get-Colour '#141414'), $outline)), $p) }
}
function Add-Text($value, $size, $hex, $x, $y) {
  $font = New-Object System.Drawing.Font('Impact', $size, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = 'Center'; $format.LineAlignment = 'Center'
  $g.DrawString($value, $font, (New-Brush $hex), (New-Object System.Drawing.PointF($x, $y)), $format)
}

$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAliasGridFit'
$g.Clear((Get-Colour '#1b2838'))
for ($i = 0; $i -lt 90; $i++) { $d = 3 + ($i % 4); $g.FillEllipse((New-Brush '#8a99ab'), (($i * 263) % $W), (($i * 149) % 480), $d, $d) }

# Mountains
Add-Shape '#2c3e52' @(@(-10, 560), @(180, 330), @(300, 470), @(470, 300), @(640, 480), @(850, 320), @(1010, 460), @(1210, 340), @(1210, 640), @(-10, 640))

# Logo tiles
$letters = 'PARKBOXD'.ToCharArray()
$colours = @('#3fb950', '#4a90e2', '#d63a3a', '#f5c518', '#f2711c')
$size = 110
$x = ($W - $letters.Count * ($size + 10)) / 2
for ($i = 0; $i -lt $letters.Count; $i++) {
  $state = $g.Save()
  $g.TranslateTransform($x + $size / 2, 140 + ($i % 2) * 10)
  $g.RotateTransform($(if ($i % 2) { 5 } else { -5 }))
  $h2 = $size / 2
  Add-Shape $colours[$i % 5] @(@((-$h2 + 3), (-$h2 + 8)), @(0, (-$h2)), @(($h2 - 5), (-$h2 + 4)), @($h2, 4), @(($h2 - 3), ($h2 - 5)), @(4, $h2), @((-$h2 + 6), ($h2 - 3)), @((-$h2), -2)) 4
  Add-Text ([string]$letters[$i]) 74 '#14181c' 0 3
  $g.Restore($state)
  $x += $size + 10
}

Add-Text 'Track every South Park episode.' 54 '#ffffff' ($W / 2) 270
Add-Text "Rate the classics. Roast your friends' takes." 40 '#f5c518' ($W / 2) 345

# Pines on the snow
for ($i = 0; $i -lt 15; $i++) {
  $cx = 40 + $i * 82; $base = 560; $t = 70 + (($i * 37) % 55)
  $shape = @(@(0, 1), @(0.28, 0.62), @(0.14, 0.62), @(0.44, 0.2), @(-0.44, 0.2), @(-0.14, 0.62), @(-0.28, 0.62)) |
    ForEach-Object { , @(($cx + $_[0] * $t), ($base - $_[1] * $t)) }
  Add-Shape $(if ($i % 3) { '#2e6b3f' } else { '#24573a' }) $shape
}
Add-Shape '#eef4f8' @(@(-10, 545), @(250, 525), @(520, 562), @(780, 528), @(1020, 555), @(1210, 530), @(1210, 640), @(-10, 640)) 4
Add-Text 'parkboxd.pages.dev' 38 '#1d3557' ($W / 2) 590

$g.Dispose()
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
