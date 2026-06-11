from PyInstaller.utils.hooks import collect_dynamic_libs, collect_data_files

binaries = collect_dynamic_libs('llama_cpp')

datas = [
    # React frontend (built output)
    ('frontend/dist',  'frontend/dist'),
    # App icon
    ('icon.ico',       '.'),
    # PNG logo
    ('app_logo.png',   '.'),
    # Version file (read by updater at runtime)
    ('version.py',     '.'),
    ('updater.py',     '.'),
    ('database.py',    '.'),
    ('api.py',         '.'),
] + collect_data_files('llama_cpp')

hiddenimports = [
    # uvicorn internals
    'uvicorn.logging',
    'uvicorn.loops',
    'uvicorn.loops.auto',
    'uvicorn.protocols',
    'uvicorn.protocols.http',
    'uvicorn.protocols.http.auto',
    'uvicorn.protocols.websockets',
    'uvicorn.protocols.websockets.auto',
    'uvicorn.lifespan',
    'uvicorn.lifespan.on',
    'uvicorn.main',
    'uvicorn.config',
    # PyWebView on Windows (WinForms backend)
    'webview.platforms.winforms',
    'clr',
    # pystray Windows backend
    'pystray._win32',
    # Pillow
    'PIL._tkinter_finder',
    'PIL.ImageDraw',
    'PIL.Image',
    # FastAPI / starlette internals
    'anyio',
    'anyio._backends._asyncio',
    'starlette.routing',
    'email.mime.text',
    'email.mime.multipart',
]

a = Analysis(
    ['main.py'],
    pathex=['.'],
    binaries=binaries,
    datas=datas,
    hiddenimports=hiddenimports,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['tkinter', 'scipy', 'PyQt5', 'PyQt6'],
    noarchive=False,
)

pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='PersonalPlanner',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=False,       # no console window
    icon='icon.ico',
    uac_admin=False,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='PersonalPlanner',
)
