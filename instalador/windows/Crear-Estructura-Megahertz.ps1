# MEGAHERTZ - Preparar directorios de una futura instalación Windows.
# Ejecutar desde el instalador, con sus permisos de instalación.
# No mueve, sobrescribe ni borra contenidos anteriores.
[CmdletBinding()]
param(
  [string]$DirectorioPrograma = (Join-Path $env:ProgramFiles 'MEGAHERTZ'),
  [string]$DirectorioDatos = (Join-Path $env:ProgramData 'MEGAHERTZ')
)
$ErrorActionPreference = 'Stop'
$carpetas = @('jingles', 'separadores', 'publicidad')
foreach ($raiz in @($DirectorioPrograma, $DirectorioDatos)) {
  if ([string]::IsNullOrWhiteSpace($raiz)) { throw 'Se requiere un directorio válido.' }
  if (-not (Test-Path -LiteralPath $raiz -PathType Container)) {
    New-Item -Path $raiz -ItemType Directory -Force | Out-Null
  }
  foreach ($nombre in $carpetas) {
    $destino = Join-Path $raiz $nombre
    if (-not (Test-Path -LiteralPath $destino)) {
      New-Item -Path $destino -ItemType Directory | Out-Null
    } elseif (-not (Test-Path -LiteralPath $destino -PathType Container)) {
      throw "Ya existe un archivo donde debe crearse la carpeta: $destino"
    }
  }
}
Write-Output "MEGAHERTZ: carpetas listas."
Write-Output "Programa: $DirectorioPrograma"
Write-Output "Datos: $DirectorioDatos"
Write-Output "Importante: la vinculación de archivos de audio con el motor de emisión se configurará al construir el instalador."
