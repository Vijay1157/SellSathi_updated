param(
    [string]$Root = "D:\ssinphinite\Main Project\sellsathi\Sellsathi\Sellsathi",
    [switch]$Perform
)

$excludeDirs = @('node_modules','.git','front','back')
$frontPatterns = @('\.jsx?$','\.tsx?$','\.vue$','\.css$','\.scss$','\.html$','\.png$','\.jpg$','\.svg$')
$frontContentRegex = '(^|\s)(from\s+["'']react|import\s+React|createRoot|ReactDOM|vite|next/|@angular|vue)'
$backContentRegex = '(^|\s)(require\(|module\.exports|express|app\.listen|mongoose|sequelize|passport|router|\.cjs\b|\.mjs\b)'

$log = Join-Path $Root ("reorg-move-{0:yyyyMMdd-HHmmss}.log" -f (Get-Date))
"Root: $Root" | Out-File $log

Get-ChildItem -Path $Root -Recurse -File |
    Where-Object { $excludeDirs -notcontains $_.Directory.Name } |
    ForEach-Object {
        $file = $_
        $rel = $file.FullName.Substring($Root.Length).TrimStart('\')
        $destType = $null

        foreach ($p in $frontPatterns) {
            if ($file.Name -match $p) { $destType = 'front'; break }
        }

        $content = $null
        try { $content = Get-Content -Raw -ErrorAction Stop $file.FullName } catch {}

        if (-not $destType -and $content) {
            if ($content -match $frontContentRegex) { $destType = 'front' }
            if ($content -match $backContentRegex)  { $destType = 'back' }
        }

        if (-not $destType) {
            if ($file.Name -match 'server|index\.js|app\.js|auth|db|\.cjs|routes|controllers|models|services') { $destType = 'back' }
            else { $destType = 'front' }
        }

        $destRoot = Join-Path $Root $destType
        $destPath = Join-Path $destRoot $rel
        $destDir = Split-Path $destPath -Parent

        $action = "MOVE to $destType: $rel"
        $action | Tee-Object -FilePath $log -Append

        if ($Perform) {
            if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir -Force | Out-Null }
            Move-Item -LiteralPath $file.FullName -Destination $destPath -Force
        }
    }

"Done. DryRun: $(-not $Perform). Review $log" | Out-File $log -Append
Write-Output ("Done. DryRun: {0}. Log: {1}" -f (-not $Perform), $log)