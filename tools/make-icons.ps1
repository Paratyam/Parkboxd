# Draws the home-screen icons (same paper "P" as favicon.svg) into icons/.
# The art stays inside the middle of the square so phones can crop it to a circle.
$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$dir = Join-Path (Split-Path -Parent $PSScriptRoot) 'icons'
New-Item -ItemType Directory -Force $dir | Out-Null

foreach ($icon in @(@('icon-192', 192), @('icon-512', 512), @('apple-touch-icon', 180))) {
  $size = $icon[1]
  $bmp = New-Object System.Drawing.Bitmap($size, $size)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = 'AntiAlias'
  $g.TextRenderingHint = 'AntiAliasGridFit'
  $g.Clear([System.Drawing.ColorTranslator]::FromHtml('#14181c'))
  # Work in the favicon's 64x64 space, scaled to 64% and centred.
  $g.TranslateTransform($size / 2, $size / 2)
  $g.ScaleTransform($size * 0.64 / 64, $size * 0.64 / 64)
  $g.RotateTransform(-4)
  $points = [System.Drawing.PointF[]]@(@(2, 4), @(30, 0), @(62, 3), @(60, 32), @(64, 60), @(34, 62), @(4, 64), @(0, 34) |
    ForEach-Object { New-Object System.Drawing.PointF(($_[0] - 32), ($_[1] - 32)) })
  $g.FillPolygon((New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#3fb950'))), $points)
  $g.RotateTransform(4)
  $font = New-Object System.Drawing.Font('Impact', 42, [System.Drawing.FontStyle]::Regular, [System.Drawing.GraphicsUnit]::Pixel)
  $format = New-Object System.Drawing.StringFormat
  $format.Alignment = 'Center'
  $format.LineAlignment = 'Center'
  $box = New-Object System.Drawing.RectangleF(-32, -31, 64, 64)
  $g.DrawString('P', $font, (New-Object System.Drawing.SolidBrush([System.Drawing.ColorTranslator]::FromHtml('#14181c'))), $box, $format)
  $g.Dispose()
  $bmp.Save((Join-Path $dir "$($icon[0]).png"), [System.Drawing.Imaging.ImageFormat]::Png)
  $bmp.Dispose()
}
