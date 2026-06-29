# Publish ParkEase MOVE1 to Cloudflare Pages
# Usage: run this in PowerShell from the project folder:
#   cd "C:\Users\kiddy\Desktop\MOVE1"
#   .\publish-pages.ps1

param(
    [string]$ProjectName = "move1-pages"
)

function Check-Command($cmd) {
    $which = Get-Command $cmd -ErrorAction SilentlyContinue
    return $which -ne $null
}

Write-Host "Preparing to publish to Cloudflare Pages (project: $ProjectName)" -ForegroundColor Cyan

if (-not (Check-Command npm)) {
    Write-Host "npm is not found. Install Node.js from https://nodejs.org/ and re-run this script." -ForegroundColor Yellow
    exit 1
}

if (-not (Check-Command wrangler)) {
    Write-Host "Installing Wrangler (Cloudflare Pages CLI) via npm..." -ForegroundColor Cyan
    npm install -g wrangler
    if (-not (Check-Command wrangler)) {
        Write-Host "Failed to install wrangler. Please install manually and re-run." -ForegroundColor Red
        exit 1
    }
}

# Login to Cloudflare
Write-Host "Opening browser to authenticate Wrangler with Cloudflare..." -ForegroundColor Cyan
wrangler login

Write-Host "Publishing site to Cloudflare Pages..." -ForegroundColor Cyan
wrangler pages publish . --project-name $ProjectName

Write-Host "Done. If publish succeeded, you'll see the deployment URL above." -ForegroundColor Green
