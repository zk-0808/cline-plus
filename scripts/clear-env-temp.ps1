# Temporary script to clear environment variable
[Environment]::SetEnvironmentVariable("CLINE_PLUGIN_IMPORT_TIMEOUT_MS", $null, "User")
Write-Host "CLINE_PLUGIN_IMPORT_TIMEOUT_MS cleared"
Write-Host "Current value: $([Environment]::GetEnvironmentVariable('CLINE_PLUGIN_IMPORT_TIMEOUT_MS', 'User'))"