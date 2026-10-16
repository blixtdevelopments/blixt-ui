local allowedTests = {
    context = true,
    list = true,
    notify = true,
    progressBar = true,
    progressCircle = true,
    inputDialog = true,
    alertDialog = true,
    textUI = true,
    skillCheck = true,
    radial = true,
}

local presets = {
    ['80s'] = { original = true, white = true, yellow = true },
    ['90s'] = { classic = true, gradient = true, midnight = true },
    modern = { graphite = true, frost = true, ['midnight-blue'] = true },
}
local settingsFile = 'editor-settings.json'

local function validSettings(data)
    return type(data) == 'table' and type(data.theme) == 'string' and
        type(data.preset) == 'string' and presets[data.theme] ~= nil and
        presets[data.theme][data.preset] == true
end

local settings = { theme = 'modern', preset = 'graphite' }

local stored = LoadResourceFile(GetCurrentResourceName(), settingsFile)
if stored and stored ~= '' then
    local ok, decoded = pcall(json.decode, stored)
    if ok and validSettings(decoded) then
        settings = { theme = decoded.theme, preset = decoded.preset }
    else
        print('[blixt-ui] Ignoring invalid editor-settings.json; using the built-in default.')
    end
end

local function isAdmin(playerId)
    return playerId > 0 and IsPlayerAceAllowed(playerId, 'blixtui.admin')
end

RegisterNetEvent('blixt-ui:settingsRequest', function()
    TriggerClientEvent('blixt-ui:settingsUpdated', source, settings)
end)

RegisterCommand('blixtadmin', function(source)
    if source == 0 then
        print('[blixt-ui] /blixtadmin is an in-game command.')
        return
    end

    if not isAdmin(source) then
        TriggerClientEvent('blixt-ui:adminDenied', source)
        return
    end

    TriggerClientEvent('blixt-ui:adminOpen', source, settings)
end, false)

RegisterNetEvent('blixt-ui:adminSaveSettings', function(data)
    local playerId = source
    if not isAdmin(playerId) then return end
    if not validSettings(data) then
        TriggerClientEvent('blixt-ui:adminSaveResult', playerId, false, 'Invalid theme or preset.')
        return
    end

    local updated = { theme = data.theme, preset = data.preset }
    if not SaveResourceFile(GetCurrentResourceName(), settingsFile, json.encode(updated), -1) then
        TriggerClientEvent('blixt-ui:adminSaveResult', playerId, false, 'Could not save settings to disk.')
        return
    end

    settings = updated
    TriggerClientEvent('blixt-ui:settingsUpdated', -1, settings)
    TriggerClientEvent('blixt-ui:adminSaveResult', playerId, true)
end)

RegisterNetEvent('blixt-ui:adminTestRequest', function(test)
    local playerId = source
    if not isAdmin(playerId) then return end
    if type(test) ~= 'string' or not allowedTests[test] then return end

    TriggerClientEvent('blixt-ui:adminTestApproved', playerId, test)
end)

RegisterNetEvent('blixt-ui:adminTestFinished', function()
    local playerId = source
    if not isAdmin(playerId) then return end
    TriggerClientEvent('blixt-ui:adminOpen', playerId, settings, 'tests')
end)
