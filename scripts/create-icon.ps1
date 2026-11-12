Add-Type -AssemblyName System.Drawing
$assetDirectory = Join-Path $PSScriptRoot '../src/assets'
New-Item -ItemType Directory -Force -Path $assetDirectory | Out-Null
$bitmap = New-Object System.Drawing.Bitmap 256,256
$graphics = [System.Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.Clear([System.Drawing.Color]::FromArgb(40,87,71))
$pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromArgb(244,248,235)),14
$pen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
$pen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
$bellPath = New-Object System.Drawing.Drawing2D.GraphicsPath
$bellPath.AddBezier(76,142,76,62,80,54,128,54)
$bellPath.AddBezier(128,54,176,54,180,62,180,142)
$bellPath.AddLine(180,142,198,174)
$bellPath.AddLine(198,174,58,174)
$bellPath.AddLine(58,174,76,142)
$graphics.DrawPath($pen,$bellPath)
$graphics.DrawArc($pen,108,181,40,25,0,180)
$bitmap.Save((Join-Path $assetDirectory 'icon.png'),[System.Drawing.Imaging.ImageFormat]::Png)
$icon = [System.Drawing.Icon]::FromHandle($bitmap.GetHicon())
$stream = [System.IO.File]::Create((Join-Path $assetDirectory 'icon.ico'))
$icon.Save($stream)
$stream.Dispose()
$icon.Dispose()
$graphics.Dispose()
$bitmap.Dispose()
$pen.Dispose()
$bellPath.Dispose()
