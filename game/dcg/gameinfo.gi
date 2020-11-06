"GameInfo"
{
	game 		"Artifact"
	title 		"Artifact"
	type		singleplayer_only

	SupportsDX8 0
	nodegraph 0
	nomodels 1
	nohimodel 1
	nocrosshair 0
	SupportsDX8	0
	nodegraph 0
	tonemapping 0 // Hide tonemapping ui in tools mode
	GameData	"dcg.fgd"

	FileSystem
	{
		SteamAppId				1269260		// This will mount all the GCFs we need (240=CS:S, 220=HL2).
		ToolsAppId				1269260		// Tools will load this (ie: source SDK caches) to get things like materials\debug, materials\editor, etc.

		//
		// The code that loads this file automatically does a few things here:
		//
		// 1. For each "Game" search path, it adds a "GameBin" path, in <dir>\bin
		// 2. For each "Game" search path, it adds another "Game" path in front of it with _<langage> at the end.
		//    For example: c:\hl2\cstrike on a french machine would get a c:\hl2\cstrike_french path added to it.
		// 3. For the first "Game" search path, it adds a search path called "MOD".
		// 4. For the first "Game" search path, it adds a search path called "DEFAULT_WRITE_PATH".
		//

		//
		// Search paths are relative to the exe directory\..\
		//
		SearchPaths
		{
			Game				dcg
			Game				core
			Mod					dcg
			Write				dcg

			LayeredGameRoot		"../game_otherplatforms/etc" [$MOBILE || $ETC_TEXTURES] //Some platforms do not support DXT compression. ETC is a well-supported alternative.
			LayeredGameRoot		"../game_otherplatforms/etc/low_bitrate" [$MOBILE]
		}
	}

	MaterialSystem2
	{
		RenderModes
		{
			"game" "Default"
			"game" "DotaDeferred"
			"game" "DotaForward"
			"game" "Depth"

			"tools" "ToolsVis" // Visualization modes for all shaders (lighting only, normal maps only, etc.)
			"tools" "ToolsWireframe" // This should use the ToolsVis mode above instead of being its own mode
			"tools" "ToolsUtil" // Meant to be used to render tools sceneobjects that are mod-independent, like the origin grid
		}
	}


	Engine2
	{
		"HasModAppSystems" "1"
		"Capable64Bit" "1"
		"UsesScaleform" "0"
		"UsesVGui" "0"
		"UsesPanorama" "1"
		"HasGameUI" "0"
		"GameUIFromClient" "0"
		"PanoramaUIClientFromClient" "1"
		"SetUILanguageOnSteamDropDown" "1"


		"RenderingPipeline"
		{
			"SkipPostProcessing" "1"
			"SupportsMSAA" "0"
		}

		"BugBait"
		{
			// Used by 'bug:' in chat to normalize report settings during playtests
			"Owner" "triage*"
			"Severity" "high"
			"Priority" "none"
			"Category" "---"
			"Product" "dcg"
			"Component" "dcg"
		}
	}


	ToolsEnvironment
	{
		"Engine"	"Source 2"
		"ToolsDir"	"../sdktools"	// NOTE: Default Tools path. This is relative to the mod path.
	}

	Hammer
	{
		"fgd"					"dcg.fgd"	// NOTE: This is relative to the 'mod' path.
		"DefaultTextureScale"	"0.250000"
		"DefaultSolidEntity"	"trigger_multiple"
		"DefaultPointEntity"	"info_player_start"
		"NavMarkupEntity"		"func_nav_markup"
		"LoadScriptEntities"	"0"
		"GameFeatureSet"		"Dota"
		"DefaultGridTileSet"	"/maps/tilesets/radiant_basic.vmap"
		"DefaultGridTileSet2"	"/maps/tilesets/dire_basic.vmap"
	}

	ResourceCompiler
	{
		// Overrides of the default builders as specified in code, this controls which map builder steps
		// will be run when resource compiler is run for a map without specifiying any specific map builder
		// steps. Additionally this controls which builders are displayed in the hammer build dialog.
		DefaultMapBuilders
		{
			"light"		"0"	// Dota does not use baked lighting
			"envmap"	"0"	// Dota doesn't generate environment maps from the map
			"gridnav"	"1"	// Dota generates its grid navigation data by default
		}
	}

	MaterialEditor
	{
		"DefaultShader"			"global_lit_simple"
		"ExpressionHelpUrl"		"https://intranet.valvesoftware.com/index.php/Source_2.0/Shader_Format#Shader.2FMaterial_Expression_Syntax"
	}

	RenderPipelineAliases
	{
		"Tools"			"Dota:Forward"
		"EnvMapBake"	"Dota"
	}

	RenderSystem
	{
		"VulkanUseStreamingTextureManager"	"1"
		"VulkanOnly"				"1"	[ $LINUX || $OSX ] // No OpenGL or D3D9/11 fallback on Linux or OSX, only Vulkan is supported.
	}

	SceneSystem
	{
		"NoSunLightManager" "1"
		"TransformTextureRowCount" "2048"
		"CMTAtlasWidth" "512"
		"CMTAtlasHeight" "512"
		"CMTAtlasChunkSize" "128"
		"DrawParticleChildrenSeparateFromParents" "1"
	}

	SoundSystem
	{
		"DisableSteamAudio" "1"
		"DisableSoundOnDedicatedServer" "1"
	}

	AnimationSystem
	{
		"DisableAnimationScript" "1"
	}
}
