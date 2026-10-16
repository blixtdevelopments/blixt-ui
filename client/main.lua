local ready = false
local radialVisible = false

local presets = {
    ['80s'] = { original = true, white = true, yellow = true },
    ['90s'] = { classic = true, gradient = true, midnight = true },
    modern = { graphite = true, frost = true, ['midnight-blue'] = true },
}
local applied = { theme = 'modern', preset = 'graphite' }

RegisterNUICallback('ready', function(_, cb)
    ready = true
    SendNUIMessage({ action = 'configure', theme = applied.theme, preset = applied.preset })
    TriggerServerEvent('blixt-ui:settingsRequest')
    cb({ ok = true })
end)

RegisterNetEvent('blixt-ui:settingsUpdated', function(data)
    if type(data) ~= 'table' or not presets[data.theme] or not presets[data.theme][data.preset] then return end
    applied = { theme = data.theme, preset = data.preset }
    if ready then SendNUIMessage({ action = 'configure', theme = applied.theme, preset = applied.preset }) end
end)

exports('notify', function(data)
    if not ready or type(data) ~= 'table' then return false end

    SendNUIMessage({ action = 'notify', data = data })
    return true
end)

local activeProgressId

exports('startProgress', function(data)
    if not ready or type(data) ~= 'table' then return false end
    if type(data.id) ~= 'number' or type(data.duration) ~= 'number' or data.duration <= 0 then return false end
    if activeProgressId ~= nil then return false end

    activeProgressId = data.id
    SendNUIMessage({ action = 'startProgress', data = data })
    return true
end)

exports('stopProgress', function(id)
    if id ~= activeProgressId then return false end
    SendNUIMessage({ action = 'stopProgress', id = id })
    activeProgressId = nil
    return true
end)

RegisterNUICallback('blixtProgressComplete', function(data, cb)
    local id = type(data) == 'table' and data.id
    cb({ ok = id ~= nil and id == activeProgressId })

    if id ~= nil and id == activeProgressId then
        activeProgressId = nil
        TriggerEvent('blixt-ui:progressComplete', id)
    end
end)

-- Menu visuals only; ox_lib retains registrations and application callbacks.
local activeMenuKind

exports('showContext', function(data)
    if not ready or radialVisible or type(data) ~= 'string' then return false end
    local decoded = json.decode(data)
    if type(decoded) ~= 'table' then return false end
    activeMenuKind = 'context'
    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(false)
    SendNUIMessage({ action = 'blixtShowContext', data = decoded })
    return true
end)

exports('hideContext', function()
    if activeMenuKind ~= 'context' then return false end
    activeMenuKind = nil
    SendNUIMessage({ action = 'blixtHideContext' })
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
    return true
end)

exports('showMenu', function(data)
    if not ready or radialVisible or type(data) ~= 'table' then return false end
    activeMenuKind = 'list'
    SetNuiFocus(true, false)
    SetNuiFocusKeepInput(not (data.disableInput == nil or data.disableInput == true))
    SendNUIMessage({ action = 'blixtShowMenu', data = data })
    return true
end)

exports('hideMenu', function()
    if activeMenuKind ~= 'list' then return false end
    activeMenuKind = nil
    SendNUIMessage({ action = 'blixtHideMenu' })
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
    return true
end)

AddEventHandler('onClientResourceStop', function(resource)
    if (resource ~= GetCurrentResourceName() and resource ~= 'ox_lib') or not activeMenuKind then return end
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
end)

RegisterNUICallback('blixtContextAction', function(data, cb)
    cb({ ok = true })
    if activeMenuKind ~= 'context' or type(data) ~= 'table' then return end
    if data.action == 'openContext' or data.action == 'clickContext' or data.action == 'closeContext' then
        TriggerEvent('blixt-ui:contextAction', data.action, data.payload)
    end
end)

RegisterNUICallback('blixtMenuAction', function(data, cb)
    cb({ ok = true })
    if activeMenuKind ~= 'list' or type(data) ~= 'table' then return end
    if data.action == 'confirmSelected' or data.action == 'changeSelected' or
       data.action == 'changeIndex' or data.action == 'changeChecked' or
       data.action == 'closeMenu' then
        TriggerEvent('blixt-ui:menuAction', data.action, data.payload)
    end
end)

-- Dialog controls only; ox_lib resolves results and maintains its existing API.
local activeDialog

local function hideDialog(kind)
    if activeDialog ~= kind then return false end
    activeDialog = nil
    SendNUIMessage({ action = 'blixtDialogHide' })
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
    return true
end

local function showDialog(kind, data)
    if not ready or activeDialog or activeMenuKind or radialVisible or type(data) ~= 'table' then return false end
    activeDialog = kind
    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(false)
    SendNUIMessage({ action = 'blixtDialogShow', kind = kind, data = data })
    return true
end

exports('showInputDialog', function(data) return showDialog('input', data) end)
exports('hideInputDialog', function() return hideDialog('input') end)
exports('showAlertDialog', function(data) return showDialog('alert', data) end)
exports('hideAlertDialog', function() return hideDialog('alert') end)

RegisterNUICallback('blixtDialogResult', function(data, cb)
    local kind = type(data) == 'table' and data.kind
    if kind ~= activeDialog then
        cb({ ok = false })
        return
    end
    hideDialog(kind)
    cb({ ok = true })
    if kind == 'input' then
        TriggerEvent('blixt-ui:inputResult', data.value)
    else
        TriggerEvent('blixt-ui:alertResult', data.value)
    end
end)

AddEventHandler('onClientResourceStop', function(resource)
    if (resource == GetCurrentResourceName() or resource == 'ox_lib') and activeDialog then
        hideDialog(activeDialog)
    end
end)

-- Admin panel: permission is granted by the server, never by the NUI.
local adminOpen = false
local skillCheckVisible = false
local pendingAdminTest

local function closeAdmin()
    if not adminOpen then return end
    adminOpen = false
    SendNUIMessage({ action = 'blixtAdminClose' })
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
end

RegisterNetEvent('blixt-ui:adminOpen', function(data, view)
    if not ready or adminOpen then return end
    if activeMenuKind or activeDialog or radialVisible or skillCheckVisible then return end
    if type(data) == 'table' and presets[data.theme] and presets[data.theme][data.preset] then
        applied = { theme = data.theme, preset = data.preset }
        SendNUIMessage({ action = 'configure', theme = applied.theme, preset = applied.preset })
    end
    adminOpen = true
    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(false)
    SendNUIMessage({ action = 'blixtAdminOpen', view = view == 'tests' and 'tests' or 'overview' })
end)

RegisterNetEvent('blixt-ui:adminDenied', function()
    if ready then
        SendNUIMessage({ action = 'notify', data = {
            title = 'Blixt UI', description = 'You do not have permission to open the admin panel.',
            type = 'error', duration = 3500
        } })
    end
end)

RegisterNUICallback('blixtAdminClose', function(_, cb)
    closeAdmin()
    cb({ ok = true })
end)

RegisterNUICallback('blixtAdminSaveSettings', function(data, cb)
    if not adminOpen or type(data) ~= 'table' or not presets[data.theme] or
       not presets[data.theme][data.preset] then
        cb({ ok = false })
        return
    end
    TriggerServerEvent('blixt-ui:adminSaveSettings', { theme = data.theme, preset = data.preset })
    cb({ ok = true })
end)

RegisterNetEvent('blixt-ui:adminSaveResult', function(success, message)
    if adminOpen then
        SendNUIMessage({ action = 'blixtAdminSaveResult', ok = success == true, error = message })
    end
end)

RegisterNUICallback('blixtAdminTest', function(data, cb)
    if not adminOpen or type(data) ~= 'table' or type(data.test) ~= 'string' then
        cb({ ok = false })
        return
    end

    pendingAdminTest = data.test
    closeAdmin()
    TriggerServerEvent('blixt-ui:adminTestRequest', data.test)
    cb({ ok = true })
end)

local function finishAdminTest()
    if pendingAdminTest ~= 'running' then return end
    pendingAdminTest = nil
    SetTimeout(150, function()
        if ready and not adminOpen then TriggerServerEvent('blixt-ui:adminTestFinished') end
    end)
end

local function reopenAfterMenuCloses(isOpen)
    CreateThread(function()
        Wait(150)
        while isOpen() do Wait(150) end
        finishAdminTest()
    end)
end

local function runAdminTest(test)
    if not lib then
        finishAdminTest()
        return
    end

    if test == 'notify' then
        local types = { 'success', 'error', 'warning', 'inform' }
        for i, kind in ipairs(types) do
            SetTimeout((i - 1) * 750, function()
                lib.notify({ title = 'Blixt UI', description = 'Example ' .. kind .. ' notification',
                    type = kind, duration = 4500 })
            end)
        end
        SetTimeout(7000, finishAdminTest)
    elseif test == 'progressBar' or test == 'progressCircle' then
        CreateThread(function()
            local data = { duration = 6500, label = 'Preparing supplies', useWhileDead = true,
                canCancel = true, disable = { move = false, car = false, combat = true } }
            local finished
            if test == 'progressBar' then
                finished = lib.progressBar(data)
            else
                finished = lib.progressCircle(data)
            end
            lib.notify({ title = 'Blixt UI', description = finished and 'Progress completed.' or 'Progress cancelled.',
                type = finished and 'success' or 'error' })
            finishAdminTest()
        end)
    elseif test == 'skillCheck' then
        CreateThread(function()
            local success = lib.skillCheck({ 'easy', 'medium', 'hard' }, { 'w', 'a', 's', 'd', '1', '2', '3', '4' })
            lib.notify({ title = 'Blixt UI', description = success and 'Skill check passed.' or 'Skill check failed.',
                type = success and 'success' or 'error' })
            finishAdminTest()
        end)
    elseif test == 'inputDialog' then
        CreateThread(function()
            local values = lib.inputDialog('Blixt Input Dialog', {
                { type = 'input', label = 'Your name', placeholder = 'Enter a name', required = true, minLength = 2 },
                { type = 'number', label = 'Quantity', default = 3, min = 1, max = 20 },
                { type = 'select', label = 'Vehicle', options = {
                    { value = 'coupe', label = 'Coupe' }, { value = 'sedan', label = 'Sedan' },
                    { value = 'suv', label = 'SUV' },
                }, default = 'sedan' },
                { type = 'checkbox', label = 'Express delivery', checked = true },
                { type = 'slider', label = 'Priority', min = 0, max = 100, step = 5, default = 50 },
                { type = 'textarea', label = 'Notes', placeholder = 'Additional notes' },
                { type = 'date', label = 'Delivery date', returnString = true },
            }, { allowCancel = true })
            lib.notify({ title = 'Blixt UI',
                description = values and ('Submitted ' .. #values .. ' fields.') or 'Input cancelled.',
                type = values and 'success' or 'inform' })
            finishAdminTest()
        end)
    elseif test == 'alertDialog' then
        CreateThread(function()
            local result = lib.alertDialog({
                header = 'Confirm Delivery',
                content = 'Would you like to accept this delivery?\nYou can cancel without making changes.',
                cancel = true,
                labels = { cancel = 'Not now', confirm = 'Accept' },
            })
            lib.notify({ title = 'Blixt UI', description = 'Alert result: ' .. tostring(result or 'dismissed'),
                type = result == 'confirm' and 'success' or 'inform' })
            finishAdminTest()
        end)
    elseif test == 'textUI' then
        lib.showTextUI('[E] Speak to the clerk', {
            position = 'left-center', icon = 'info'
        })
        SetTimeout(7000, function()
            local open, text = lib.isTextUIOpen()
            if open and text == '[E] Speak to the clerk' then lib.hideTextUI() end
            finishAdminTest()
        end)
    elseif test == 'context' then
        lib.registerContext({
            { id = 'blixt_admin_example_back', title = 'Component Testing', menu = 'blixt_admin_example_context',
                options = {
                    { title = 'Return to sample', description = 'Test menu back navigation.', icon = 'arrow-left',
                        menu = 'blixt_admin_example_context' },
                } },
            { id = 'blixt_admin_example_context', title = 'Blixt Context Menu', options = {
                { title = 'Open a submenu', description = 'Test nested menus and back navigation', icon = 'folder-open',
                    menu = 'blixt_admin_example_back' },
                { title = 'Sample action', description = 'Tests Lua onSelect and closes the menu', icon = 'check',
                    onSelect = function()
                        lib.notify({ title = 'Blixt UI', description = 'Context callback received.', type = 'success' })
                    end },
                { title = 'Delivery progress', description = 'Progress indicator and icon', icon = 'truck', progress = 65 },
                { title = 'Unavailable option', description = 'Disabled item appearance', icon = 'lock', disabled = true },
            } },
        })
        lib.showContext('blixt_admin_example_context')
        reopenAfterMenuCloses(function() return lib.getOpenContextMenu() ~= nil end)
    elseif test == 'radial' then
        lib.registerRadial({
            id = 'blixt_admin_radial_more',
            items = {
                { label = 'Show notification', icon = 'bell', onSelect = function()
                    lib.notify({ title = 'Blixt UI', description = 'Radial submenu selection received.', type = 'success' })
                end },
                { label = 'Return', icon = 'arrow-left', menu = 'blixt_admin_radial_root' },
            },
        })
        lib.registerRadial({
            id = 'blixt_admin_radial_root',
            items = {
                { label = 'Vehicle', icon = 'car', onSelect = function()
                    lib.notify({ title = 'Blixt UI', description = 'Vehicle radial option selected.', type = 'success' })
                end },
                { label = 'Documents', icon = 'file-lines', onSelect = function()
                    lib.notify({ title = 'Blixt UI', description = 'Documents radial option selected.', type = 'success' })
                end },
                { label = 'Actions', icon = 'list', menu = 'blixt_admin_radial_more' },
                { label = 'Settings', icon = 'gear', onSelect = function()
                    lib.notify({ title = 'Blixt UI', description = 'Settings radial option selected.', type = 'success' })
                end },
                { label = 'Close', icon = 'xmark', onSelect = function() end },
            },
        })
        lib.showRadialMenu('blixt_admin_radial_root')
        finishAdminTest()
    elseif test == 'list' then
        lib.registerMenu({
            id = 'blixt_admin_example_list', title = 'Blixt List Menu', position = 'top-left',
            onClose = function() end,
            options = {
                { label = 'Select an action', description = 'Press Enter to confirm', icon = 'check' },
                { label = 'Select a vehicle', description = 'Use left and right arrows', icon = 'car',
                    values = { 'Coupe', 'Sedan', 'SUV' }, defaultIndex = 2, close = false },
                { label = 'Enable deliveries', description = 'Press Enter to toggle', icon = 'truck',
                    checked = true, close = false },
                { label = 'Progress example', description = 'Use the arrow keys to move through the list',
                    icon = 'chart-line', progress = 60, close = false },
            },
        }, function(selected, scrollIndex)
            if selected == 1 then
                lib.notify({ title = 'Blixt UI', description = 'List menu selection received.', type = 'success' })
            elseif selected == 2 then
                lib.notify({ title = 'Blixt UI', description = 'Value index: ' .. tostring(scrollIndex or 1), type = 'inform' })
            end
        end)
        lib.showMenu('blixt_admin_example_list')
        reopenAfterMenuCloses(function() return lib.getOpenMenu() ~= nil end)
    end
end

RegisterNetEvent('blixt-ui:adminTestApproved', function(test)
    if adminOpen or pendingAdminTest ~= test then return end
    pendingAdminTest = 'running'
    runAdminTest(test)
end)

AddEventHandler('onClientResourceStop', function(resource)
    if resource == GetCurrentResourceName() then closeAdmin() end
end)

-- Text UI is display-only; it must never claim NUI keyboard or mouse focus.
local textUIVisible = false

exports('showTextUI', function(data)
    if not ready or type(data) ~= 'table' or type(data.text) ~= 'string' then return false end
    textUIVisible = true
    SendNUIMessage({ action = 'blixtTextUIShow', data = data })
    return true
end)

exports('hideTextUI', function()
    if not textUIVisible then return false end
    textUIVisible = false
    SendNUIMessage({ action = 'blixtTextUIHide' })
    return true
end)

AddEventHandler('onClientResourceStop', function(resource)
    if resource == 'ox_lib' and textUIVisible then
        textUIVisible = false
        SendNUIMessage({ action = 'blixtTextUIHide' })
    end
end)

-- Skill check display bridge; ox_lib still exposes the original public API.

exports('startSkillCheck', function(data)
    if not ready or skillCheckVisible or activeMenuKind or activeDialog or adminOpen or radialVisible then return false end
    if type(data) ~= 'table' or data.difficulty == nil then return false end

    skillCheckVisible = true
    SetNuiFocus(true, false)
    SetNuiFocusKeepInput(false)
    SendNUIMessage({ action = 'blixtSkillCheckStart', data = data })
    return true
end)

exports('cancelSkillCheck', function()
    if not skillCheckVisible then return false end
    SendNUIMessage({ action = 'blixtSkillCheckCancel' })
    return true
end)

RegisterNUICallback('blixtSkillCheckOver', function(success, cb)
    if not skillCheckVisible then
        cb({ ok = false })
        return
    end

    skillCheckVisible = false
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
    cb({ ok = true })
    TriggerEvent('blixt-ui:skillCheckOver', success == true)
end)

AddEventHandler('onClientResourceStop', function(resource)
    if (resource == GetCurrentResourceName() or resource == 'ox_lib') and skillCheckVisible then
        skillCheckVisible = false
        if resource == 'ox_lib' then
            SendNUIMessage({ action = 'blixtSkillCheckCancel' })
        end
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
    end
end)

-- Radial wheel is display-only; ox_lib owns the entries, history and selection callbacks.

exports('beginRadial', function()
    if not ready or radialVisible or adminOpen or activeMenuKind or activeDialog or skillCheckVisible then
        return false
    end
    radialVisible = true
    SetNuiFocus(true, true)
    SetNuiFocusKeepInput(false)
    SetCursorLocation(0.5, 0.5)
    SendNUIMessage({ action = 'blixtRadialBegin' })
    return true
end)

exports('updateRadial', function(data)
    if not radialVisible then return false end
    if data ~= false and type(data) ~= 'table' then return false end
    SendNUIMessage({ action = 'blixtRadialUpdate', data = data })
    return true
end)

exports('endRadial', function()
    if not radialVisible then return false end
    radialVisible = false
    SendNUIMessage({ action = 'blixtRadialEnd' })
    SetNuiFocus(false, false)
    SetNuiFocusKeepInput(false)
    return true
end)

RegisterNUICallback('blixtRadialAction', function(data, cb)
    if not radialVisible or type(data) ~= 'table' then
        cb({ ok = false })
        return
    end

    local action = data.action
    if action == 'click' then
        if type(data.payload) ~= 'number' or data.payload < 0 or
           data.payload > 48 or data.payload % 1 ~= 0 then
            cb({ ok = false })
            return
        end
    elseif action ~= 'back' and action ~= 'close' then
        cb({ ok = false })
        return
    end

    cb({ ok = true })
    TriggerEvent('blixt-ui:radialAction', action, data.payload)
end)

AddEventHandler('onClientResourceStop', function(resource)
    if (resource == GetCurrentResourceName() or resource == 'ox_lib') and radialVisible then
        radialVisible = false
        SendNUIMessage({ action = 'blixtRadialEnd' })
        SetNuiFocus(false, false)
        SetNuiFocusKeepInput(false)
    end
end)
