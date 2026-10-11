Add-Type -AssemblyName System.Drawing
$root='C:\laragon\www\arlinformatica\public\arl-assets\icons'
foreach($name in @('eye','edit','delete')) {
 $src=Join-Path $root ('icon-web-'+$name+'.png')
 $img=[System.Drawing.Bitmap]::FromFile($src)
 $w=36;$h=36
 $dst=New-Object System.Drawing.Bitmap($w,$h,[System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
 $g=[System.Drawing.Graphics]::FromImage($dst)
 $g.Clear([System.Drawing.Color]::Transparent)
 $g.CompositingMode=[System.Drawing.Drawing2D.CompositingMode]::SourceOver
 $g.CompositingQuality=[System.Drawing.Drawing2D.CompositingQuality]::HighQuality
 $g.InterpolationMode=[System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
 $g.SmoothingMode=[System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
 $g.PixelOffsetMode=[System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
 $destRect=New-Object System.Drawing.Rectangle(0,0,$w,$h)
 $srcRect=New-Object System.Drawing.Rectangle(0,0,$img.Width,$img.Height)
 $g.DrawImage($img,$destRect,$srcRect,[System.Drawing.GraphicsUnit]::Pixel)
 $path=Join-Path $root ('icon-web-'+$name+'-compact-2x.png')
 $dst.Save($path,[System.Drawing.Imaging.ImageFormat]::Png)
 $g.Dispose();$dst.Dispose();$img.Dispose()
 Write-Output ('CREATED '+$path+' '+(Get-Item $path).Length+' bytes')
}