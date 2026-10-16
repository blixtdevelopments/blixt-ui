fx_version 'cerulean'
game 'gta5'
lua54 'yes'

name 'blixt-ui'
author 'Blixt'
version '1.0.0'
description 'Blixt UI themed ox_lib interface replacement'

ui_page 'web/index.html'

files {
    'web/index.html',
    'web/style.css',
    'web/main.js',
    'web/menus.js',
    'web/menus.css',
    'web/admin.js',
    'web/admin.css',
    'web/dialogs.js',
    'web/dialogs.css',
    'web/textui.js',
    'web/textui.css',
    'web/skillcheck.js',
    'web/skillcheck.css',
    'web/radial.js',
    'web/radial.css',
    'web/presets.css',
}

shared_script 'config.lua'

client_scripts {
    '@ox_lib/init.lua',
    'client/main.lua',
}

server_script 'server/main.lua'
