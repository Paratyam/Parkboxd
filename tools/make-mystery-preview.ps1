# Draws og-mystery.png, the picture chat apps show next to a Mystery Episode link.
# Original paper-cutout art: a blurry "evidence photo" with a big question mark.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$out = Join-Path (Split-Path -Parent $PSScriptRoot) 'og-mystery.png'
$W = 1200; $H = 630

function Get-Colour($hex) { [System.Drawing.ColorTranslator]::FromHtml($hex) }
function New-Brush($hex) { New-Object System.Drawing.SolidBrush(Get-Colour $hex) }
function New-Points($list) { [System.Drawing.PointF[]]@($list | ForEach-Object { New-Object System.Drawing.PointF($_[0], $_[1]) }) }
function Add-Text($target, $value, $size, $hex, $x, $y, $shadow = 0) {
  $font = New-Object System.Drawing.Font('Impact', $size, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = 'Center'; $format.LineAlignment = 'Center'
  if ($shadow) { $target.DrawString($value, $font, (New-Brush '#000000'), (New-Object System.Drawing.PointF(($x + $shadow), ($y + $shadow))), $format) }
  $target.DrawString($value, $font, (New-Brush $hex), (New-Object System.Drawing.PointF($x, $y)), $format)
}

# The photo: drawn tiny, then stretched, so it comes out blurry.
$small = New-Object System.Drawing.Bitmap(28, 12)
$s = [System.Drawing.Graphics]::FromImage($small)
$s.SmoothingMode = 'AntiAlias'
$s.Clear((Get-Colour '#7ec4e8'))
$s.FillEllipse((New-Brush '#fff3a6'), 3, 1, 5, 5)
$s.FillPolygon((New-Brush '#51627a'), (New-Points @(@(0, 9), @(7, 3), @(13, 8), @(20, 2), @(28, 8), @(28, 12), @(0, 12))))
$s.FillRectangle((New-Brush '#3fa356'), 0, 8, 28, 4)
$s.FillRectangle((New-Brush '#d63a3a'), 11, 6, 6, 4)
$s.FillPolygon((New-Brush '#7a4e24'), (New-Points @(@(10, 6), @(14, 3), @(18, 6))))
$s.FillEllipse((New-Brush '#f2711c'), 21, 6, 4, 5)
$s.Dispose()

$bmp = New-Object System.Drawing.Bitmap($W, $H)
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = 'AntiAlias'
$g.TextRenderingHint = 'AntiAliasGridFit'
$g.Clear((Get-Colour '#3a1b60'))
for ($i = 0; $i -lt 40; $i++) { Add-Text $g '?' (30 + ($i % 4) * 9) '#4d2a78' (($i * 263) % $W) (($i * 149) % $H) }

Add-Text $g "KENNY'S MYSTERY EPISODE" 88 '#ffa04d' ($W / 2) 82 6

# White-framed photo with a strip of tape
$g.FillRectangle((New-Brush '#000000'), 236, 160, 744, 328)
$g.FillRectangle((New-Brush '#f4efe2'), 226, 150, 748, 332)
$g.InterpolationMode = 'HighQualityBicubic'
$g.PixelOffsetMode = 'Half'
$wrap = New-Object System.Drawing.Imaging.ImageAttributes
$wrap.SetWrapMode([System.Drawing.Drawing2D.WrapMode]::TileFlipXY)
$g.DrawImage($small, (New-Object System.Drawing.Rectangle(242, 166, 716, 300)), 0, 0, 28, 12, [System.Drawing.GraphicsUnit]::Pixel, $wrap)
$g.PixelOffsetMode = 'Default'
$g.FillPolygon((New-Brush '#f5c518'), (New-Points @(@(515, 132), @(688, 140), @(684, 176), @(511, 168))))

$g.FillEllipse((New-Brush '#000000'), 516, 232, 180, 180)
$g.FillEllipse((New-Brush '#f2711c'), 508, 224, 180, 180)
Add-Text $g '?' 140 '#ffffff' 598 318 5

Add-Text $g 'Guess the South Park episode from a blurry picture' 44 '#ffffff' ($W / 2) 534 3
Add-Text $g '6 tries  -  a new one every day' 38 '#ffd23f' ($W / 2) 592 3

$g.Dispose()
$small.Dispose()
$bmp.Save($out, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Output $out
