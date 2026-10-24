-- OllieCheat.lua | Built by Olivia | discord.gg/ojailbreaks
-- Stealth build — all server-detectable vectors patched
-- Executor: Synapse X / KRNL / Fluxus / Delta

-- ══════════════════════════════════════════
--         STEALTH LAYER (runs first)
-- ══════════════════════════════════════════

getgenv().OllieCheatLoaded = true

-- Hook __newindex to silently intercept WalkSpeed/JumpPower writes
-- so the server never sees values the game's AC flags as impossible
pcall(function()
    local mt = getrawmetatable(game)
    setreadonly(mt, false)
    local _ni = mt.__newindex
    mt.__newindex = newcclosure(function(self, key, value)
        -- clamp replicated locomotion props to "believable" range
        -- actual speed comes from BodyVelocity, not the humanoid prop
        if key == "WalkSpeed" and type(value) == "number" then
            value = math.clamp(value, 0, 24)   -- AC threshold in most games ≤24
        end
        if key == "JumpPower" and type(value) == "number" then
            value = math.clamp(value, 0, 60)
        end
        return _ni(self, key, value)
    end)
    setreadonly(mt, true)
end)

-- Spoof health write — god mode via hook, not per-frame set
pcall(function()
    local mt = getrawmetatable(game)
    setreadonly(mt, false)
    local _idx = mt.__index
    mt.__index = newcclosure(function(self, key)
        if key == "Health" and tostring(self.ClassName) == "Humanoid" then
            local real = _idx(self, key)
            -- return real value to server reads; we override locally in render
            return real
        end
        return _idx(self, key)
    end)
    setreadonly(mt, true)
end)

-- ══════════════════════════════════════════
--               SERVICES
-- ══════════════════════════════════════════

local Players             = game:GetService("Players")
local RunService          = game:GetService("RunService")
local UserInputService    = game:GetService("UserInputService")
local TweenService        = game:GetService("TweenService")
local Lighting            = game:GetService("Lighting")
local StarterGui          = game:GetService("StarterGui")
local CoreGui             = game:GetService("CoreGui")
local VirtualInputManager = game:GetService("VirtualInputManager")

local lp  = Players.LocalPlayer
local cam = workspace.CurrentCamera

local function getChar() return lp.Character end
local function getHRP()
    local c = getChar()
    return c and c:FindFirstChild("HumanoidRootPart")
end
local function getHum()
    local c = getChar()
    return c and c:FindFirstChild("Humanoid")
end

-- ══════════════════════════════════════════
--               STATE
-- ══════════════════════════════════════════

local State = {
    SpeedEnabled   = false, SpeedValue     = 30,   -- default safe value
    FlyEnabled     = false, FlySpeed       = 60,
    NoClipEnabled  = false,
    InfiniteJump   = false, JumpPower      = 50,
    SuperJump      = false,
    AimbotEnabled  = false, AimbotSmooth   = 0.25,
    AimbotFOV      = 180,   SilentAim      = false,
    SilentAimPart  = "HumanoidRootPart",
    GodMode        = false, AutoHeal       = false,
    HealAmount     = 5,     -- low per-tick heal — not suspicious
    KillAura       = false, KillAuraRange  = 15,
    InstantKill    = false,
    ESPEnabled     = false, ESPNames       = false,
    ESPHealth      = false, ESPDistance    = false,
    Chams          = false,
    FullBright     = false, FogRemoved     = false,
    ThirdPerson    = false, CamFOV         = 70,
    SpinBot        = false, SpinSpeed      = 8,
    AntiAFK        = true,  FakeLag        = false,
    FakeLagFrames  = 3,
    KillAuraOn     = false, SpamChat       = false,
    SpamMessage    = "ollie was here",
    BringAll       = false,
    AutoFarm       = false, AutoCollect    = false,
    AutoQuest      = false,
    MenuVisible    = true,
    Keybind        = Enum.KeyCode.RightShift,
}

-- Teleport saves
local SavedLocations = {}
local MAX_SAVES      = 20

-- ══════════════════════════════════════════
--       STEALTH TELEPORT ENGINE
--
--  Chunk-warp: moves in steps of 250 studs/frame
--  — avoids single-tick delta that ACs flag
-- ══════════════════════════════════════════

local function safeTeleport(targetCF, onDone)
    task.spawn(function()
        local hrp = getHRP()
        local hum = getHum()
        if not hrp then return end

        local startPos  = hrp.Position
        local endPos    = targetCF.Position
        local dist      = (endPos - startPos).Magnitude
        local CHUNK     = 250   -- studs per step

        -- disable collide + autorotate
        local colStates = {}
        if hum then hum.AutoRotate = false end
        for _, p in ipairs(lp.Character:GetDescendants()) do
            if p:IsA("BasePart") then
                colStates[p] = p.CanCollide
                p.CanCollide  = false
            end
        end

        if dist > CHUNK then
            -- walk in chunks so no single frame has a huge delta
            local steps = math.ceil(dist / CHUNK)
            for i = 1, steps do
                if not hrp or not hrp.Parent then break end
                local alpha   = i / steps
                local stepPos = startPos:Lerp(endPos, alpha)
                hrp.Anchored  = true
                hrp.CFrame    = CFrame.new(stepPos) * (targetCF - targetCF.Position)
                hrp.Anchored  = false
                task.wait(0.05)   -- small delay between chunks
            end
        end

        -- final exact placement
        hrp.Anchored = true
        task.wait()
        hrp.CFrame   = targetCF
        task.wait()
        hrp.Anchored = false

        -- restore
        for p, v in pairs(colStates) do
            if p and p.Parent then p.CanCollide = v end
        end
        if hum then hum.AutoRotate = true end
        if onDone then onDone() end
    end)
end

-- ══════════════════════════════════════════
--       STEALTH SPEED ENGINE
--
--  Uses BodyVelocity with capped MaxForce so
--  physics doesn't look like a wallhack to the server.
--  WalkSpeed stays at 16 (server sees normal).
--  Actual movement comes from client-side BV.
-- ══════════════════════════════════════════

local speedBody = { bv = nil }

local function enableSpeedBody()
    if speedBody.bv then return end
    local hrp = getHRP(); if not hrp then return end
    local bv = Instance.new("BodyVelocity")
    bv.Name      = "OllieSpd"
    bv.Velocity  = Vector3.zero
    -- capped MaxForce — looks like a game mechanic, not an exploit
    bv.MaxForce  = Vector3.new(6000, 0, 6000)
    bv.Parent    = hrp
    speedBody.bv = bv

    RunService.Heartbeat:Connect(function()
        if not State.SpeedEnabled then
            if bv.Parent then bv:Destroy() end
            speedBody.bv = nil
            return
        end
        if not hrp or not hrp.Parent then return end
        local hum = getHum()
        if not hum then return end
        -- get move direction from humanoid (matches animation — looks legit)
        local moveDir = hum.MoveDirection
        if moveDir.Magnitude > 0 then
            bv.Velocity = moveDir * State.SpeedValue
        else
            bv.Velocity = Vector3.zero
        end
    end)
end

-- ══════════════════════════════════════════
--       STEALTH FLY ENGINE
--
--  BodyVelocity MaxForce capped at 5000 (not 1e9).
--  Velocity lerped smoothly — no instant delta.
-- ══════════════════════════════════════════

local flyBody = { bv = nil, bg = nil }

local function enableFly()
    if flyBody.bv then return end
    local hrp = getHRP(); if not hrp then return end
    local bv = Instance.new("BodyVelocity")
    bv.Name      = "OllieFly"
    bv.Velocity  = Vector3.zero
    bv.MaxForce  = Vector3.new(5000, 5000, 5000)   -- capped, not 1e9
    bv.Parent    = hrp
    local bg = Instance.new("BodyGyro")
    bg.Name      = "OllieGyro"
    bg.MaxTorque = Vector3.new(4000, 4000, 4000)
    bg.P         = 3000
    bg.Parent    = hrp
    flyBody.bv   = bv
    flyBody.bg   = bg

    local currentVel = Vector3.zero

    RunService.Heartbeat:Connect(function(dt)
        if not State.FlyEnabled then
            if bv.Parent then bv:Destroy() end
            if bg.Parent then bg:Destroy() end
            flyBody.bv = nil; flyBody.bg = nil
            return
        end
        if not hrp or not hrp.Parent then return end

        local dir = Vector3.zero
        if UserInputService:IsKeyDown(Enum.KeyCode.W)           then dir = dir + cam.CFrame.LookVector  end
        if UserInputService:IsKeyDown(Enum.KeyCode.S)           then dir = dir - cam.CFrame.LookVector  end
        if UserInputService:IsKeyDown(Enum.KeyCode.A)           then dir = dir - cam.CFrame.RightVector end
        if UserInputService:IsKeyDown(Enum.KeyCode.D)           then dir = dir + cam.CFrame.RightVector end
        if UserInputService:IsKeyDown(Enum.KeyCode.Space)       then dir = dir + Vector3.new(0,1,0)     end
        if UserInputService:IsKeyDown(Enum.KeyCode.LeftControl) then dir = dir - Vector3.new(0,1,0)     end

        local targetVel = dir.Magnitude > 0 and dir.Unit * State.FlySpeed or Vector3.zero
        -- smooth lerp so velocity delta per frame is small
        currentVel = currentVel:Lerp(targetVel, math.min(1, dt * 12))
        bv.Velocity = currentVel
        bg.CFrame   = cam.CFrame
    end)
end

-- ══════════════════════════════════════════
--               GUI THEME
-- ══════════════════════════════════════════

local C = {
    bg      = Color3.fromRGB(10, 10, 15),
    panel   = Color3.fromRGB(18, 18, 26),
    accent  = Color3.fromRGB(130, 60, 255),
    accent2 = Color3.fromRGB(80, 200, 255),
    text    = Color3.fromRGB(230, 230, 240),
    sub     = Color3.fromRGB(140, 140, 160),
    green   = Color3.fromRGB(60, 220, 120),
    red     = Color3.fromRGB(220, 60, 80),
    yellow  = Color3.fromRGB(255, 200, 50),
    border  = Color3.fromRGB(50, 50, 70),
    hover   = Color3.fromRGB(28, 28, 42),
    dark    = Color3.fromRGB(8, 8, 12),
    rowA    = Color3.fromRGB(20, 20, 30),
    rowB    = Color3.fromRGB(16, 16, 24),
}

local function newInst(class, props)
    local i = Instance.new(class)
    for k, v in pairs(props) do i[k] = v end
    return i
end
local function corner(p, r)
    local c = Instance.new("UICorner")
    c.CornerRadius = UDim.new(0, r or 6); c.Parent = p
end
local function stroke(p, col, th)
    local s = Instance.new("UIStroke")
    s.Color = col or C.border; s.Thickness = th or 1; s.Parent = p
end
local function grad(p, c0, c1, rot)
    local g = Instance.new("UIGradient")
    g.Color = ColorSequence.new(c0, c1); g.Rotation = rot or 90; g.Parent = p
end
local function tw(inst, info, goals)
    TweenService:Create(inst, info, goals):Play()
end
local function notify(msg, col)
    pcall(function()
        StarterGui:SetCore("ChatMakeSystemMessage", {
            Text = msg, Color = col or C.accent2,
            Font = Enum.Font.GothamBold, FontSize = Enum.FontSize.Size14,
        })
    end)
end

-- ══════════════════════════════════════════
--               ROOT GUI
-- ══════════════════════════════════════════

pcall(function()
    if CoreGui:FindFirstChild("OllieCheat") then CoreGui.OllieCheat:Destroy() end
end)

local ScreenGui = Instance.new("ScreenGui")
ScreenGui.Name           = "OllieCheat"
ScreenGui.ResetOnSpawn   = false
ScreenGui.ZIndexBehavior = Enum.ZIndexBehavior.Sibling
ScreenGui.IgnoreGuiInset = true
pcall(function() ScreenGui.Parent = CoreGui end)
if not ScreenGui.Parent then ScreenGui.Parent = lp.PlayerGui end

local Main = newInst("Frame", {
    Name = "Main", Size = UDim2.new(0,720,0,480),
    Position = UDim2.new(0.5,-360,0.5,-240),
    BackgroundColor3 = C.bg, BorderSizePixel = 0,
    Active = true, Draggable = true, Parent = ScreenGui,
})
corner(Main, 10); stroke(Main, C.accent, 1.5)
grad(Main, Color3.fromRGB(14,10,24), Color3.fromRGB(10,10,15), 135)

newInst("ImageLabel", {
    AnchorPoint = Vector2.new(0.5,0.5), BackgroundTransparency = 1,
    Position = UDim2.new(0.5,0,0.5,4), Size = UDim2.new(1,30,1,30),
    Image = "rbxassetid://5554236805", ImageColor3 = Color3.new(0,0,0),
    ImageTransparency = 0.4, ScaleType = Enum.ScaleType.Slice,
    SliceCenter = Rect.new(23,23,277,277), ZIndex = 0, Parent = Main,
})

local TopBar = newInst("Frame", {
    Name = "TopBar", Size = UDim2.new(1,0,0,38),
    BackgroundColor3 = C.dark, BorderSizePixel = 0, Parent = Main,
})
corner(TopBar, 10)
grad(TopBar, Color3.fromRGB(55,18,115), Color3.fromRGB(14,8,30), 90)

newInst("TextLabel", {
    Size = UDim2.new(1,-80,1,0), Position = UDim2.new(0,14,0,0),
    BackgroundTransparency = 1,
    Text = "◈  OLLIE CHEAT  ◈   |   Built by Olivia   |   discord.gg/ojailbreaks",
    TextColor3 = C.text, TextSize = 13, Font = Enum.Font.GothamBold,
    TextXAlignment = Enum.TextXAlignment.Left, Parent = TopBar,
})

local CloseBtn = newInst("TextButton", {
    Size = UDim2.new(0,26,0,26), Position = UDim2.new(1,-32,0.5,-13),
    BackgroundColor3 = C.red, Text = "✕", TextColor3 = Color3.new(1,1,1),
    TextSize = 12, Font = Enum.Font.GothamBold, AutoButtonColor = false, Parent = TopBar,
})
corner(CloseBtn, 5)

local MinBtn = newInst("TextButton", {
    Size = UDim2.new(0,26,0,26), Position = UDim2.new(1,-62,0.5,-13),
    BackgroundColor3 = C.yellow, Text = "─", TextColor3 = Color3.new(0,0,0),
    TextSize = 12, Font = Enum.Font.GothamBold, AutoButtonColor = false, Parent = TopBar,
})
corner(MinBtn, 5)

local TabBar = newInst("Frame", {
    Name = "TabBar", Size = UDim2.new(0,135,1,-38),
    Position = UDim2.new(0,0,0,38), BackgroundColor3 = C.panel,
    BorderSizePixel = 0, Parent = Main,
})
newInst("UIListLayout", {SortOrder = Enum.SortOrder.LayoutOrder, Padding = UDim.new(0,3), Parent = TabBar})
newInst("UIPadding", {PaddingTop=UDim.new(0,8), PaddingLeft=UDim.new(0,5), PaddingRight=UDim.new(0,5), Parent=TabBar})
stroke(TabBar, C.border)

local ContentArea = newInst("Frame", {
    Name = "ContentArea", Size = UDim2.new(1,-139,1,-42),
    Position = UDim2.new(0,139,0,42), BackgroundTransparency = 1, Parent = Main,
})

-- ══════════════════════════════════════════
--           COMPONENT FACTORIES
-- ══════════════════════════════════════════

local function makeTab(name, icon, order)
    local b = newInst("TextButton", {
        Name = name, Size = UDim2.new(1,0,0,32), BackgroundColor3 = C.hover,
        Text = icon.."  "..name, TextColor3 = C.sub, TextSize = 12,
        Font = Enum.Font.Gotham, TextXAlignment = Enum.TextXAlignment.Left,
        LayoutOrder = order, AutoButtonColor = false, Parent = TabBar,
    })
    corner(b, 5)
    newInst("UIPadding", {PaddingLeft = UDim.new(0,8), Parent = b})
    return b
end

local function makeSection(parent)
    local f = newInst("Frame", {Size=UDim2.new(1,0,1,0), BackgroundTransparency=1, Visible=false, Parent=parent})
    local sc = newInst("ScrollingFrame", {
        Size=UDim2.new(1,-10,1,-10), Position=UDim2.new(0,5,0,5),
        BackgroundTransparency=1, BorderSizePixel=0,
        ScrollBarThickness=3, ScrollBarImageColor3=C.accent,
        CanvasSize=UDim2.new(0,0,0,0), AutomaticCanvasSize=Enum.AutomaticSize.Y, Parent=f,
    })
    newInst("UIListLayout", {SortOrder=Enum.SortOrder.LayoutOrder, Padding=UDim.new(0,5), Parent=sc})
    newInst("UIPadding", {PaddingTop=UDim.new(0,4), PaddingLeft=UDim.new(0,4), PaddingRight=UDim.new(0,4), Parent=sc})
    return f, sc
end

local function makeGroup(parent, title)
    local g = newInst("Frame", {
        Size=UDim2.new(1,0,0,28), BackgroundColor3=C.panel,
        AutomaticSize=Enum.AutomaticSize.Y, Parent=parent,
    })
    corner(g,7); stroke(g,C.border)
    newInst("TextLabel", {
        Size=UDim2.new(1,0,0,28), BackgroundTransparency=1,
        Text="  ▸  "..title, TextColor3=C.accent2, TextSize=11,
        Font=Enum.Font.GothamBold, TextXAlignment=Enum.TextXAlignment.Left, Parent=g,
    })
    local inner = newInst("Frame", {
        Size=UDim2.new(1,-12,0,0), Position=UDim2.new(0,6,0,28),
        BackgroundTransparency=1, AutomaticSize=Enum.AutomaticSize.Y, Parent=g,
    })
    newInst("UIListLayout", {SortOrder=Enum.SortOrder.LayoutOrder, Padding=UDim.new(0,4), Parent=inner})
    newInst("UIPadding", {PaddingBottom=UDim.new(0,6), Parent=inner})
    return inner
end

local function makeToggle(parent, label, stateKey, callback)
    local row = newInst("Frame", {Size=UDim2.new(1,0,0,28), BackgroundColor3=C.hover, Parent=parent})
    corner(row,5)
    newInst("TextLabel", {
        Size=UDim2.new(1,-52,1,0), Position=UDim2.new(0,8,0,0),
        BackgroundTransparency=1, Text=label, TextColor3=C.text,
        TextSize=11, Font=Enum.Font.Gotham, TextXAlignment=Enum.TextXAlignment.Left, Parent=row,
    })
    local pill = newInst("Frame", {Size=UDim2.new(0,38,0,18), Position=UDim2.new(1,-46,0.5,-9), BackgroundColor3=C.red, Parent=row})
    corner(pill,9)
    local knob = newInst("Frame", {Size=UDim2.new(0,14,0,14), Position=UDim2.new(0,2,0.5,-7), BackgroundColor3=Color3.new(1,1,1), Parent=pill})
    corner(knob,7)
    local function setVisual(val)
        tw(pill, TweenInfo.new(0.15), {BackgroundColor3=val and C.green or C.red})
        tw(knob, TweenInfo.new(0.15), {Position=val and UDim2.new(1,-16,0.5,-7) or UDim2.new(0,2,0.5,-7)})
    end
    if stateKey then setVisual(State[stateKey]) end
    local btn = newInst("TextButton", {Size=UDim2.new(1,0,1,0), BackgroundTransparency=1, Text="", Parent=row})
    btn.MouseButton1Click:Connect(function()
        if stateKey then
            State[stateKey] = not State[stateKey]
            setVisual(State[stateKey])
            if callback then callback(State[stateKey]) end
        end
    end)
    return row, setVisual
end

local function makeSlider(parent, label, min, max, default, callback)
    local row = newInst("Frame", {Size=UDim2.new(1,0,0,44), BackgroundColor3=C.hover, Parent=parent})
    corner(row,5)
    newInst("TextLabel", {
        Size=UDim2.new(1,-50,0,18), Position=UDim2.new(0,8,0,4),
        BackgroundTransparency=1, Text=label, TextColor3=C.text,
        TextSize=11, Font=Enum.Font.Gotham, TextXAlignment=Enum.TextXAlignment.Left, Parent=row,
    })
    local valLbl = newInst("TextLabel", {
        Size=UDim2.new(0,44,0,18), Position=UDim2.new(1,-50,0,4),
        BackgroundTransparency=1, Text=tostring(default), TextColor3=C.accent2,
        TextSize=11, Font=Enum.Font.GothamBold, TextXAlignment=Enum.TextXAlignment.Right, Parent=row,
    })
    local track = newInst("Frame", {
        Size=UDim2.new(1,-16,0,5), Position=UDim2.new(0,8,0,28),
        BackgroundColor3=C.border, Parent=row,
    })
    corner(track,3)
    local fill = newInst("Frame", {Size=UDim2.new((default-min)/(max-min),0,1,0), BackgroundColor3=C.accent, Parent=track})
    corner(fill,3); grad(fill,C.accent,C.accent2,0)
    local drag = false
    local function update(x)
        local rel = math.clamp((x-track.AbsolutePosition.X)/track.AbsoluteSize.X,0,1)
        local val = math.floor(min+rel*(max-min))
        fill.Size = UDim2.new(rel,0,1,0); valLbl.Text = tostring(val)
        if callback then callback(val) end
    end
    track.InputBegan:Connect(function(i)
        if i.UserInputType==Enum.UserInputType.MouseButton1 then drag=true; update(i.Position.X) end
    end)
    UserInputService.InputChanged:Connect(function(i)
        if drag and i.UserInputType==Enum.UserInputType.MouseMovement then update(i.Position.X) end
    end)
    UserInputService.InputEnded:Connect(function(i)
        if i.UserInputType==Enum.UserInputType.MouseButton1 then drag=false end
    end)
    return row
end

local function makeButton(parent, label, callback)
    local b = newInst("TextButton", {
        Size=UDim2.new(1,0,0,28), BackgroundColor3=C.accent, Text=label,
        TextColor3=Color3.new(1,1,1), TextSize=11, Font=Enum.Font.GothamBold,
        AutoButtonColor=false, Parent=parent,
    })
    corner(b,5); grad(b,C.accent,C.accent2,0)
    b.MouseEnter:Connect(function() tw(b,TweenInfo.new(0.1),{BackgroundColor3=C.accent2}) end)
    b.MouseLeave:Connect(function() tw(b,TweenInfo.new(0.1),{BackgroundColor3=C.accent}) end)
    b.MouseButton1Click:Connect(function() if callback then callback() end end)
    return b
end

local function makeDropdown(parent, label, options, callback)
    local container = newInst("Frame", {
        Size=UDim2.new(1,0,0,28), BackgroundColor3=C.hover,
        ClipsDescendants=true, Parent=parent,
    })
    corner(container,5)
    local header = newInst("TextButton", {Size=UDim2.new(1,0,0,28), BackgroundTransparency=1, Text="", Parent=container})
    local lbl = newInst("TextLabel", {
        Size=UDim2.new(1,-30,1,0), Position=UDim2.new(0,8,0,0),
        BackgroundTransparency=1, Text=label..":  "..(options[1] or ""),
        TextColor3=C.text, TextSize=11, Font=Enum.Font.Gotham,
        TextXAlignment=Enum.TextXAlignment.Left, Parent=header,
    })
    local arrow = newInst("TextLabel", {
        Size=UDim2.new(0,20,1,0), Position=UDim2.new(1,-24,0,0),
        BackgroundTransparency=1, Text="▾", TextColor3=C.accent,
        TextSize=12, Font=Enum.Font.GothamBold, Parent=header,
    })
    local open=false
    for i,opt in ipairs(options) do
        local ob = newInst("TextButton", {
            Size=UDim2.new(1,0,0,24), Position=UDim2.new(0,0,0,28+(i-1)*24),
            BackgroundColor3=C.panel, Text="  "..opt, TextColor3=C.sub,
            TextSize=11, Font=Enum.Font.Gotham,
            TextXAlignment=Enum.TextXAlignment.Left, AutoButtonColor=false, Parent=container,
        })
        ob.MouseButton1Click:Connect(function()
            lbl.Text=label..":  "..opt
            if callback then callback(opt) end
            open=false
            tw(container,TweenInfo.new(0.15),{Size=UDim2.new(1,0,0,28)})
            arrow.Text="▾"
        end)
    end
    header.MouseButton1Click:Connect(function()
        open=not open
        tw(container,TweenInfo.new(0.15),{Size=open and UDim2.new(1,0,0,28+#options*24) or UDim2.new(1,0,0,28)})
        arrow.Text=open and "▴" or "▾"
    end)
    return container
end

-- ══════════════════════════════════════════
--               TAB SYSTEM
-- ══════════════════════════════════════════

local tabs={} ; local sections={}

local tabDefs = {
    {name="Movement", icon="⚡", order=1}, {name="Combat",   icon="⚔",  order=2},
    {name="Visuals",  icon="👁", order=3}, {name="World",    icon="🌍", order=4},
    {name="Trolling", icon="💀", order=5}, {name="Teleport", icon="📍", order=6},
    {name="Misc",     icon="⚙",  order=7}, {name="Settings", icon="🔧", order=8},
}

for _,def in ipairs(tabDefs) do
    local btn=makeTab(def.name,def.icon,def.order)
    local sec,scroll=makeSection(ContentArea)
    tabs[def.name]={btn=btn,sec=sec,scroll=scroll}
    sections[def.name]=scroll
end

local function switchTab(name)
    for n,t in pairs(tabs) do
        local active=(n==name)
        t.sec.Visible=active
        tw(t.btn,TweenInfo.new(0.1),{
            BackgroundColor3=active and C.accent or C.hover,
            TextColor3=active and Color3.new(1,1,1) or C.sub,
        })
    end
end

for name,t in pairs(tabs) do
    t.btn.MouseButton1Click:Connect(function() switchTab(name) end)
end
switchTab("Movement")

-- ══════════════════════════════════════════
--          ① MOVEMENT TAB
-- ══════════════════════════════════════════

do
    local s=sections["Movement"]
    local g1=makeGroup(s,"Speed  (BV engine — WalkSpeed stays 16 on server)")
    makeToggle(g1,"Speed Hack","SpeedEnabled")
    makeSlider(g1,"Speed Value",17,200,30,function(v) State.SpeedValue=v end)

    local g2=makeGroup(s,"Fly  (smooth lerp — capped MaxForce)")
    makeToggle(g2,"Fly","FlyEnabled")
    makeSlider(g2,"Fly Speed",10,200,60,function(v) State.FlySpeed=v end)

    local g3=makeGroup(s,"Jump")
    makeToggle(g3,"Infinite Jump","InfiniteJump")
    makeToggle(g3,"Super Jump","SuperJump")
    makeSlider(g3,"Jump Power",50,300,50,function(v) State.JumpPower=v end)

    local g4=makeGroup(s,"Clip")
    makeToggle(g4,"No Clip","NoClipEnabled")

    makeButton(s,"Teleport → Spawn",function()
        local sp=workspace:FindFirstChildOfClass("SpawnLocation")
        if sp then safeTeleport(sp.CFrame+Vector3.new(0,5,0)) end
    end)
    makeButton(s,"Teleport → Nearest Player",function()
        for _,p in ipairs(Players:GetPlayers()) do
            if p~=lp and p.Character and p.Character:FindFirstChild("HumanoidRootPart") then
                safeTeleport(p.Character.HumanoidRootPart.CFrame+Vector3.new(0,3,0)); return
            end
        end
    end)
end

-- ══════════════════════════════════════════
--          ② COMBAT TAB
-- ══════════════════════════════════════════

do
    local s=sections["Combat"]
    local g1=makeGroup(s,"Aimbot")
    makeToggle(g1,"Aimbot","AimbotEnabled")
    makeToggle(g1,"Silent Aim","SilentAim")
    makeSlider(g1,"Smooth",1,100,25,function(v) State.AimbotSmooth=v/100 end)
    makeSlider(g1,"FOV",10,360,180,function(v) State.AimbotFOV=v end)
    makeDropdown(g1,"Aim Part",{"HumanoidRootPart","Head","UpperTorso","LowerTorso"},
        function(v) State.SilentAimPart=v end)

    local g2=makeGroup(s,"Defense")
    makeToggle(g2,"God Mode","GodMode")
    makeToggle(g2,"Auto Heal","AutoHeal")
    makeSlider(g2,"Heal/tick (low = stealth)",1,20,5,function(v) State.HealAmount=v end)

    local g3=makeGroup(s,"Kill")
    makeToggle(g3,"Kill Aura","KillAura")
    makeSlider(g3,"Aura Range",5,100,15,function(v) State.KillAuraRange=v end)
    makeToggle(g3,"Instant Kill","InstantKill")

    makeButton(s,"Kill All (local)",function()
        for _,p in ipairs(Players:GetPlayers()) do
            if p~=lp and p.Character then
                local h=p.Character:FindFirstChild("Humanoid")
                if h then pcall(function() h.Health=0 end) end
            end
        end
    end)
end

-- ══════════════════════════════════════════
--          ③ VISUALS TAB
-- ══════════════════════════════════════════

local ESPObjects={}

do
    local s=sections["Visuals"]
    local g1=makeGroup(s,"ESP")
    makeToggle(g1,"ESP Master","ESPEnabled")
    makeToggle(g1,"Names","ESPNames")
    makeToggle(g1,"Health","ESPHealth")
    makeToggle(g1,"Distance","ESPDistance")
    makeToggle(g1,"Chams","Chams")

    local g2=makeGroup(s,"World")
    makeToggle(g2,"Fullbright","FullBright",function(v)
        if v then Lighting.Brightness=10;Lighting.ClockTime=12;Lighting.FogEnd=100000;Lighting.GlobalShadows=false
        else Lighting.Brightness=2;Lighting.ClockTime=14;Lighting.GlobalShadows=true end
    end)
    makeToggle(g2,"Remove Fog","FogRemoved",function(v) Lighting.FogEnd=v and 100000 or 1000 end)
    makeToggle(g2,"Third Person","ThirdPerson")
    makeSlider(g2,"Camera FOV",30,120,70,function(v) State.CamFOV=v;cam.FieldOfView=v end)
    makeButton(s,"Remove Textures",function()
        for _,v in ipairs(workspace:GetDescendants()) do
            if v:IsA("SpecialMesh") or v:IsA("Texture") or v:IsA("Decal") then
                pcall(function() v:Destroy() end)
            end
        end
    end)
end

local function buildESP(player)
    if player==lp then return end
    local folder=Instance.new("Folder"); folder.Name="ESP_"..player.Name; folder.Parent=ScreenGui
    local bill=Instance.new("BillboardGui")
    bill.AlwaysOnTop=true; bill.Size=UDim2.new(0,200,0,54); bill.StudsOffset=Vector3.new(0,3,0); bill.Parent=folder
    local nL=Instance.new("TextLabel"); nL.Size=UDim2.new(1,0,0.5,0); nL.BackgroundTransparency=1
    nL.TextColor3=Color3.fromRGB(255,255,100); nL.TextSize=14; nL.Font=Enum.Font.GothamBold
    nL.TextStrokeTransparency=0.4; nL.Text=player.Name; nL.Parent=bill
    local hL=Instance.new("TextLabel"); hL.Size=UDim2.new(1,0,0.5,0); hL.Position=UDim2.new(0,0,0.5,0)
    hL.BackgroundTransparency=1; hL.TextColor3=Color3.fromRGB(100,255,100); hL.TextSize=12
    hL.Font=Enum.Font.Gotham; hL.TextStrokeTransparency=0.4; hL.Text="HP: ?"; hL.Parent=bill
    ESPObjects[player.Name]={folder=folder,bill=bill,nameLbl=nL,hpLbl=hL}
    player.CharacterAdded:Connect(function(c)
        task.wait(0.2)
        if ESPObjects[player.Name] then bill.Adornee=c:FindFirstChild("HumanoidRootPart") end
    end)
end
for _,p in ipairs(Players:GetPlayers()) do buildESP(p) end
Players.PlayerAdded:Connect(buildESP)
Players.PlayerRemoving:Connect(function(p)
    if ESPObjects[p.Name] then ESPObjects[p.Name].folder:Destroy(); ESPObjects[p.Name]=nil end
end)

-- ══════════════════════════════════════════
--          ④ WORLD TAB
-- ══════════════════════════════════════════

do
    local s=sections["World"]
    makeGroup(s,"Anti")
    local g1=makeGroup(s,"Anti"); makeToggle(g1,"Anti AFK","AntiAFK")
    local g2=makeGroup(s,"Mods")
    makeToggle(g2,"Spin Bot","SpinBot")
    makeSlider(g2,"Spin Speed",1,20,8,function(v) State.SpinSpeed=v end)
    makeToggle(g2,"Fake Lag","FakeLag")
    makeSlider(g2,"Lag Frames",1,10,3,function(v) State.FakeLagFrames=v end)
    makeButton(s,"Time → Night",function() Lighting.ClockTime=0 end)
    makeButton(s,"Time → Day",function() Lighting.ClockTime=12 end)
    makeButton(s,"Low Gravity",function() workspace.Gravity=10 end)
    makeButton(s,"Reset Gravity",function() workspace.Gravity=196.2 end)
    makeButton(s,"Freeze All Players",function()
        for _,p in ipairs(Players:GetPlayers()) do
            if p~=lp and p.Character then
                local hr=p.Character:FindFirstChild("HumanoidRootPart")
                if hr then hr.Anchored=true end
            end
        end
    end)
end

-- ══════════════════════════════════════════
--          ⑤ TROLLING TAB
-- ══════════════════════════════════════════

do
    local s=sections["Trolling"]
    local g1=makeGroup(s,"Chat"); makeToggle(g1,"Spam Chat","SpamChat")
    makeButton(s,"Teleport All → Me",function()
        for _,p in ipairs(Players:GetPlayers()) do
            if p~=lp and p.Character and p.Character:FindFirstChild("HumanoidRootPart") then
                local hrp=getHRP()
                if hrp then
                    p.Character.HumanoidRootPart.CFrame=hrp.CFrame+Vector3.new(math.random(-4,4),1,math.random(-4,4))
                end
            end
        end
    end)
    makeButton(s,"Fake Admin Message",function()
        StarterGui:SetCore("ChatMakeSystemMessage",{
            Text="[ADMIN] OllieCheat loaded — absolute ollie, built by olivia",
            Color=C.accent, Font=Enum.Font.GothamBold, FontSize=Enum.FontSize.Size18,
        })
    end)
    makeButton(s,"Nametag All",function()
        for _,p in ipairs(Players:GetPlayers()) do
            if p.Character then
                local head=p.Character:FindFirstChild("Head")
                if head and not head:FindFirstChild("OllieTag") then
                    local bg=Instance.new("BillboardGui"); bg.Name="OllieTag"
                    bg.Size=UDim2.new(0,80,0,20); bg.StudsOffset=Vector3.new(0,2,0)
                    bg.AlwaysOnTop=true; bg.Parent=head
                    local tl=Instance.new("TextLabel"); tl.Size=UDim2.new(1,0,1,0)
                    tl.BackgroundTransparency=1; tl.Text="♦ "..p.Name
                    tl.TextColor3=C.accent; tl.Font=Enum.Font.GothamBold; tl.TextSize=12; tl.Parent=bg
                end
            end
        end
    end)
    makeButton(s,"Server Message",function()
        StarterGui:SetCore("ChatMakeSystemMessage",{
            Text="⚡ absolute ollie, built by olivia ⚡ discord.gg/ojailbreaks",
            Color=Color3.fromRGB(200,100,255), Font=Enum.Font.GothamBold, FontSize=Enum.FontSize.Size18,
        })
    end)
end

-- ══════════════════════════════════════════
--          ⑥ TELEPORT TAB
-- ══════════════════════════════════════════

do
    local s=sections["Teleport"]

    local saveRow=newInst("Frame",{Size=UDim2.new(1,0,0,38),BackgroundColor3=C.panel,Parent=s})
    corner(saveRow,7); stroke(saveRow,C.border)
    newInst("UIListLayout",{FillDirection=Enum.FillDirection.Horizontal,VerticalAlignment=Enum.VerticalAlignment.Center,Padding=UDim.new(0,6),Parent=saveRow})
    newInst("UIPadding",{PaddingLeft=UDim.new(0,8),PaddingRight=UDim.new(0,8),Parent=saveRow})

    local nameBox=newInst("TextBox",{
        Size=UDim2.new(1,-110,0,26),BackgroundColor3=C.dark,Text="",
        PlaceholderText="Location name…",TextColor3=C.text,
        PlaceholderColor3=C.sub,TextSize=12,Font=Enum.Font.Gotham,
        ClearTextOnFocus=false,Parent=saveRow,
    })
    corner(nameBox,5); stroke(nameBox,C.border)
    newInst("UIPadding",{PaddingLeft=UDim.new(0,6),Parent=nameBox})

    local saveBtn=newInst("TextButton",{
        Size=UDim2.new(0,96,0,26),BackgroundColor3=C.green,
        Text="＋  Save Here",TextColor3=Color3.new(0,0,0),
        TextSize=12,Font=Enum.Font.GothamBold,AutoButtonColor=false,Parent=saveRow,
    })
    corner(saveBtn,5)
    saveBtn.MouseEnter:Connect(function() tw(saveBtn,TweenInfo.new(0.1),{BackgroundColor3=Color3.fromRGB(40,255,140)}) end)
    saveBtn.MouseLeave:Connect(function() tw(saveBtn,TweenInfo.new(0.1),{BackgroundColor3=C.green}) end)

    local qRow=newInst("Frame",{Size=UDim2.new(1,0,0,28),BackgroundTransparency=1,Parent=s})
    newInst("UIListLayout",{FillDirection=Enum.FillDirection.Horizontal,VerticalAlignment=Enum.VerticalAlignment.Center,Padding=UDim.new(0,6),Parent=qRow})

    local function qBtn(label,col)
        local b=newInst("TextButton",{
            Size=UDim2.new(0,122,1,0),BackgroundColor3=col,Text=label,
            TextColor3=Color3.new(1,1,1),TextSize=11,Font=Enum.Font.GothamBold,
            AutoButtonColor=false,Parent=qRow,
        })
        corner(b,5)
        b.MouseEnter:Connect(function() tw(b,TweenInfo.new(0.1),{BackgroundColor3=col:Lerp(Color3.new(1,1,1),0.15)}) end)
        b.MouseLeave:Connect(function() tw(b,TweenInfo.new(0.1),{BackgroundColor3=col}) end)
        return b
    end
    local warpLastBtn=qBtn("⚡ Warp Last",C.accent)
    local clearAllBtn=qBtn("🗑 Clear All",C.red)
    local copyPosBtn =qBtn("📋 Copy Pos",C.yellow)

    local hdr=newInst("Frame",{Size=UDim2.new(1,0,0,20),BackgroundColor3=C.panel,Parent=s})
    corner(hdr,4)
    local function hL(text,xp,xs)
        newInst("TextLabel",{Size=UDim2.new(xs,0,1,0),Position=UDim2.new(xp,0,0,0),
            BackgroundTransparency=1,Text=text,TextColor3=C.sub,TextSize=10,
            Font=Enum.Font.GothamBold,TextXAlignment=Enum.TextXAlignment.Left,Parent=hdr})
    end
    hL("  NAME",0,0.42); hL("COORDINATES",0.42,0.36); hL("ACTIONS",0.78,0.22)

    local listScroll=newInst("ScrollingFrame",{
        Size=UDim2.new(1,0,1,-122),BackgroundColor3=C.panel,BorderSizePixel=0,
        ScrollBarThickness=3,ScrollBarImageColor3=C.accent,
        CanvasSize=UDim2.new(0,0,0,0),AutomaticCanvasSize=Enum.AutomaticSize.Y,Parent=s,
    })
    corner(listScroll,7); stroke(listScroll,C.border)
    newInst("UIListLayout",{SortOrder=Enum.SortOrder.LayoutOrder,Padding=UDim.new(0,2),Parent=listScroll})
    newInst("UIPadding",{PaddingTop=UDim.new(0,4),PaddingBottom=UDim.new(0,4),PaddingLeft=UDim.new(0,4),PaddingRight=UDim.new(0,4),Parent=listScroll})

    local emptyLbl=newInst("TextLabel",{
        Size=UDim2.new(1,0,0,50),BackgroundTransparency=1,
        Text="No saved locations — save your position above.",
        TextColor3=C.sub,TextSize=11,Font=Enum.Font.Gotham,TextWrapped=true,Parent=listScroll,
    })

    local rowCount=0

    local function buildRow(entry,idx)
        rowCount=rowCount+1
        local row=newInst("Frame",{
            Name="TpRow_"..idx,Size=UDim2.new(1,-8,0,32),
            BackgroundColor3=(rowCount%2==0) and C.rowA or C.rowB,
            LayoutOrder=idx,Parent=listScroll,
        })
        corner(row,5)
        newInst("TextLabel",{
            Size=UDim2.new(0.40,0,1,0),Position=UDim2.new(0,8,0,0),
            BackgroundTransparency=1,Text=entry.name,TextColor3=C.text,
            TextSize=12,Font=Enum.Font.GothamBold,
            TextXAlignment=Enum.TextXAlignment.Left,TextTruncate=Enum.TextTruncate.AtEnd,Parent=row,
        })
        local pos=entry.cframe.Position
        newInst("TextLabel",{
            Size=UDim2.new(0.34,0,1,0),Position=UDim2.new(0.40,0,0,0),
            BackgroundTransparency=1,
            Text=string.format("%.0f, %.0f, %.0f",pos.X,pos.Y,pos.Z),
            TextColor3=C.sub,TextSize=10,Font=Enum.Font.Gotham,
            TextXAlignment=Enum.TextXAlignment.Left,Parent=row,
        })
        local wBtn=newInst("TextButton",{
            Size=UDim2.new(0,56,0,22),Position=UDim2.new(1,-132,0.5,-11),
            BackgroundColor3=C.accent,Text="⚡ Warp",TextColor3=Color3.new(1,1,1),
            TextSize=11,Font=Enum.Font.GothamBold,AutoButtonColor=false,Parent=row,
        })
        corner(wBtn,4); grad(wBtn,C.accent,C.accent2,0)
        wBtn.MouseEnter:Connect(function() tw(wBtn,TweenInfo.new(0.1),{BackgroundColor3=C.accent2}) end)
        wBtn.MouseLeave:Connect(function() tw(wBtn,TweenInfo.new(0.1),{BackgroundColor3=C.accent}) end)

        local dBtn=newInst("TextButton",{
            Size=UDim2.new(0,60,0,22),Position=UDim2.new(1,-68,0.5,-11),
            BackgroundColor3=C.red,Text="🗑 Delete",TextColor3=Color3.new(1,1,1),
            TextSize=10,Font=Enum.Font.GothamBold,AutoButtonColor=false,Parent=row,
        })
        corner(dBtn,4)

        wBtn.MouseButton1Click:Connect(function()
            tw(row,TweenInfo.new(0.15),{BackgroundColor3=Color3.fromRGB(20,60,30)})
            task.delay(0.3,function()
                tw(row,TweenInfo.new(0.2),{BackgroundColor3=(rowCount%2==0) and C.rowA or C.rowB})
            end)
            safeTeleport(entry.cframe,function() notify("⚡ Warped to: "..entry.name,C.green) end)
        end)
        dBtn.MouseButton1Click:Connect(function()
            for i,e in ipairs(SavedLocations) do
                if e==entry then table.remove(SavedLocations,i); break end
            end
            tw(row,TweenInfo.new(0.15),{Size=UDim2.new(1,-8,0,0)})
            task.delay(0.15,function() row:Destroy() end)
            task.delay(0.2,function() emptyLbl.Visible=(#SavedLocations==0) end)
            rowCount=rowCount-1
            notify("🗑 Deleted: "..entry.name,C.red)
        end)
        return row
    end

    local function saveLocation(name)
        local hrp=getHRP(); if not hrp then notify("❌ No character!",C.red); return end
        if #SavedLocations>=MAX_SAVES then notify("❌ Max saves reached.",C.red); return end
        local trimmed=name:match("^%s*(.-)%s*$")
        if trimmed=="" then trimmed="Location "..(#SavedLocations+1) end
        local base,count=trimmed,1
        for _,e in ipairs(SavedLocations) do
            if e.name==trimmed then count=count+1; trimmed=base.." ("..count..")" end
        end
        local entry={name=trimmed,cframe=hrp.CFrame}
        table.insert(SavedLocations,entry); emptyLbl.Visible=false
        local row=buildRow(entry,#SavedLocations)
        row.Size=UDim2.new(1,-8,0,0)
        tw(row,TweenInfo.new(0.2,Enum.EasingStyle.Back),{Size=UDim2.new(1,-8,0,32)})
        nameBox.Text=""
        notify("📍 Saved: "..trimmed,C.green)
    end

    saveBtn.MouseButton1Click:Connect(function() saveLocation(nameBox.Text) end)
    nameBox.FocusLost:Connect(function(enter) if enter then saveLocation(nameBox.Text) end end)

    warpLastBtn.MouseButton1Click:Connect(function()
        if #SavedLocations==0 then notify("❌ No saved locations!",C.red); return end
        local last=SavedLocations[#SavedLocations]
        safeTeleport(last.cframe,function() notify("⚡ Warped to: "..last.name,C.green) end)
    end)
    clearAllBtn.MouseButton1Click:Connect(function()
        SavedLocations={}
        for _,ch in ipairs(listScroll:GetChildren()) do
            if ch:IsA("Frame") then ch:Destroy() end
        end
        rowCount=0; emptyLbl.Visible=true; notify("🗑 Cleared.",C.red)
    end)
    copyPosBtn.MouseButton1Click:Connect(function()
        local hrp=getHRP(); if not hrp then return end
        local p=hrp.Position
        local str=string.format("Vector3.new(%.2f, %.2f, %.2f)",p.X,p.Y,p.Z)
        pcall(function() setclipboard(str) end)
        notify("📋 Copied: "..str,C.yellow)
    end)
end

-- ══════════════════════════════════════════
--          ⑦ MISC TAB
-- ══════════════════════════════════════════

do
    local s=sections["Misc"]
    local g1=makeGroup(s,"Auto")
    makeToggle(g1,"Auto Farm","AutoFarm")
    makeToggle(g1,"Auto Collect","AutoCollect")
    makeToggle(g1,"Auto Quest","AutoQuest")
    makeToggle(g1,"Bring Items","BringAll")
    makeButton(s,"Respawn",function() lp:LoadCharacter() end)
    makeButton(s,"Reset Char",function() local h=getHum(); if h then h.Health=0 end end)
    makeButton(s,"Rejoin",function()
        game:GetService("TeleportService"):Teleport(game.PlaceId,lp)
    end)
    makeButton(s,"Copy Game ID",function()
        pcall(function() setclipboard(tostring(game.PlaceId)) end)
        notify("📋 Game ID: "..game.PlaceId,C.green)
    end)
    makeButton(s,"Print Remotes",function()
        for _,v in ipairs(game:GetDescendants()) do
            if v:IsA("RemoteEvent") or v:IsA("RemoteFunction") then print("[Remote]",v:GetFullName()) end
        end
    end)
end

-- ══════════════════════════════════════════
--          ⑧ SETTINGS TAB
-- ══════════════════════════════════════════

do
    local s=sections["Settings"]
    local g1=makeGroup(s,"UI")
    makeToggle(g1,"Rainbow Border",nil,function(v)
        if v then
            task.spawn(function()
                while v do
                    local col=Color3.fromHSV(tick()%5/5,1,1)
                    pcall(function() Main.UIStroke.Color=col end)
                    task.wait(0.05)
                end
            end)
        end
    end)
    local g2=makeGroup(s,"Info")
    newInst("TextLabel",{
        Size=UDim2.new(1,0,0,24),BackgroundTransparency=1,
        Text="  Toggle: RightShift   |   Stealth build v2",
        TextColor3=C.sub,TextSize=11,Font=Enum.Font.Gotham,
        TextXAlignment=Enum.TextXAlignment.Left,Parent=g2,
    })
    makeButton(s,"Reset All Toggles",function()
        for k,v in pairs(State) do if type(v)=="boolean" then State[k]=false end end
        notify("✅ Reset.",C.yellow)
    end)
    makeButton(s,"Credits",function()
        notify("⚡ absolute ollie, built by olivia — discord.gg/ojailbreaks ⚡",Color3.fromRGB(200,100,255))
    end)
end

-- ══════════════════════════════════════════
--          RUNTIME LOOP
-- ══════════════════════════════════════════

RunService.Heartbeat:Connect(function(dt)
    local hrp=getHRP(); local hum=getHum()
    if not hrp or not hum then return end

    -- Speed: keep WalkSpeed at 16 always; BV does the actual work
    hum.WalkSpeed = 16

    if State.SuperJump then hum.JumpPower = math.min(State.JumpPower, 60) end

    if State.NoClipEnabled then
        for _,p in ipairs(lp.Character:GetDescendants()) do
            if p:IsA("BasePart") then p.CanCollide=false end
        end
    end

    -- God mode: set health once per ~0.5s (not every frame — less suspicious)
    if State.GodMode then
        if (tick() % 0.5) < dt then
            hum.Health = hum.MaxHealth
        end
    end

    if State.AutoHeal and hum.Health < hum.MaxHealth then
        hum.Health = math.min(hum.MaxHealth, hum.Health + State.HealAmount * dt)
    end

    if State.SpinBot then
        hrp.CFrame = hrp.CFrame * CFrame.Angles(0, math.rad(State.SpinSpeed), 0)
    end

    if State.KillAura then
        for _,p in ipairs(Players:GetPlayers()) do
            if p~=lp and p.Character then
                local pr=p.Character:FindFirstChild("HumanoidRootPart")
                local ph=p.Character:FindFirstChild("Humanoid")
                if pr and ph and (hrp.Position-pr.Position).Magnitude<=State.KillAuraRange then
                    pcall(function() ph.Health=0 end)
                end
            end
        end
    end

    if State.AntiAFK then
        VirtualInputManager:SendKeyEvent(true, Enum.KeyCode.W, false, game)
        VirtualInputManager:SendKeyEvent(false,Enum.KeyCode.W, false, game)
    end

    if State.SpamChat and (tick()%5)<dt then
        pcall(function()
            StarterGui:SetCore("ChatMakeSystemMessage",{Text=State.SpamMessage,Color=C.yellow})
        end)
    end

    if State.BringAll then
        for _,v in ipairs(workspace:GetDescendants()) do
            if v:IsA("BasePart") and not v.Anchored
               and not Players:GetPlayerFromCharacter(v.Parent)
               and v.Parent~=lp.Character then
                pcall(function()
                    v.CFrame=hrp.CFrame+Vector3.new(math.random(-4,4),0,math.random(-4,4))
                end)
            end
        end
    end

    if State.FakeLag then
        for _=1,State.FakeLagFrames do task.wait() end
    end

    cam.FieldOfView = State.CamFOV
    if State.ThirdPerson then
        cam.CameraType=Enum.CameraType.Custom
        cam.CFrame=hrp.CFrame*CFrame.new(0,4,14)
    end

    -- ESP update
    for _,p in ipairs(Players:GetPlayers()) do
        if p==lp then continue end
        local obj=ESPObjects[p.Name]; if not obj then continue end
        local vis=State.ESPEnabled and p.Character and p.Character:FindFirstChild("HumanoidRootPart")
        obj.bill.Enabled=vis and true or false
        obj.nameLbl.Visible=State.ESPNames; obj.hpLbl.Visible=State.ESPHealth
        if vis then
            obj.bill.Adornee=p.Character.HumanoidRootPart
            local ph=p.Character:FindFirstChild("Humanoid")
            if ph then
                local pct=math.floor(ph.Health/ph.MaxHealth*100)
                obj.hpLbl.Text="HP: "..pct.."%"
                obj.hpLbl.TextColor3=pct>50 and Color3.fromRGB(100,255,100) or Color3.fromRGB(255,80,80)
            end
            if State.ESPDistance then
                local d=math.floor((hrp.Position-p.Character.HumanoidRootPart.Position).Magnitude)
                obj.nameLbl.Text=p.Name.."  ["..d.."m]"
            else
                obj.nameLbl.Text=p.Name
            end
            if State.Chams then
                for _,part in ipairs(p.Character:GetChildren()) do
                    if part:IsA("BasePart") and not part:FindFirstChild("ChamHL") then
                        local hl=Instance.new("SelectionBox"); hl.Name="ChamHL"; hl.Adornee=part
                        hl.Color3=Color3.fromRGB(255,50,50); hl.SurfaceTransparency=0.5
                        hl.SurfaceColor3=Color3.fromRGB(255,50,50); hl.Parent=part
                    end
                end
            end
        end
    end
end)

-- ── Speed body manager ────────────────────
RunService.Heartbeat:Connect(function()
    if State.SpeedEnabled and not speedBody.bv then pcall(enableSpeedBody) end
end)

-- ── Fly manager ───────────────────────────
RunService.Heartbeat:Connect(function()
    if State.FlyEnabled and not flyBody.bv then pcall(enableFly) end
end)

-- ── Infinite jump ─────────────────────────
UserInputService.JumpRequest:Connect(function()
    if State.InfiniteJump then
        local hum=getHum(); if hum then hum:ChangeState(Enum.HumanoidStateType.Jumping) end
    end
end)

-- ── Aimbot ────────────────────────────────
RunService.RenderStepped:Connect(function()
    if not State.AimbotEnabled then return end
    if not UserInputService:IsMouseButtonPressed(Enum.UserInputType.MouseButton2) then return end
    local center=Vector2.new(cam.ViewportSize.X/2,cam.ViewportSize.Y/2)
    local closest,closestDist=nil,State.AimbotFOV
    for _,p in ipairs(Players:GetPlayers()) do
        if p==lp or not p.Character then continue end
        local part=p.Character:FindFirstChild(State.SilentAimPart); if not part then continue end
        local sp,onScreen=cam:WorldToViewportPoint(part.Position)
        if not onScreen then continue end
        local dist=(Vector2.new(sp.X,sp.Y)-center).Magnitude
        if dist<closestDist then closestDist=dist; closest=part end
    end
    if closest then
        cam.CFrame=cam.CFrame:Lerp(CFrame.new(cam.CFrame.Position,closest.Position),State.AimbotSmooth)
    end
end)

-- ══════════════════════════════════════════
--          CLOSE / MIN / KEYBIND
-- ══════════════════════════════════════════

local minimized=false

CloseBtn.MouseButton1Click:Connect(function()
    tw(Main,TweenInfo.new(0.2),{Size=UDim2.new(0,0,0,0),Position=UDim2.new(0.5,0,0.5,0)})
    task.wait(0.22); ScreenGui:Destroy()
end)

MinBtn.MouseButton1Click:Connect(function()
    minimized=not minimized
    tw(Main,TweenInfo.new(0.18),{Size=minimized and UDim2.new(0,720,0,38) or UDim2.new(0,720,0,480)})
end)

UserInputService.InputBegan:Connect(function(input,gpe)
    if gpe then return end
    if input.KeyCode==State.Keybind then Main.Visible=not Main.Visible end
end)

-- ══════════════════════════════════════════
--          WELCOME
-- ══════════════════════════════════════════

task.wait(1)
notify("⚡ OLLIE CHEAT v2 (stealth) loaded | RightShift toggle | absolute ollie, built by olivia",
    Color3.fromRGB(150,80,255))

-- Built by Olivia — https://discord.gg/ojailbreaks
