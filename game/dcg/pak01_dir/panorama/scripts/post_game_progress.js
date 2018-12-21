
// ----------------------------------------------------------------------------
//   Screen Handling functions
// ----------------------------------------------------------------------------

function CreateProgressScreen( panelID )
{
	var screenPanel = $.CreatePanel( 'Panel', $( '#ProgressScreens' ), panelID );
	screenPanel.AddClass( 'ProgressScreen' );
	return screenPanel;
}

function ShowProgressScreen( screenPanel )
{
	var screensContainer = $( '#ProgressScreens' );
	for ( var i = 0; i < screensContainer.GetChildCount() ; ++i )
	{
		var otherScreenPanel = screensContainer.GetChild( i );
		otherScreenPanel.SetHasClass( 'ShowScreen', otherScreenPanel == screenPanel );
	}
}

function StartNewScreen( panelID )
{
	var screenPanel = CreateProgressScreen( panelID );
	ShowProgressScreen( screenPanel );
	return screenPanel;
}

/* Called from C++ code */
function ResetScreens()
{
	$( '#ProgressScreens' ).RemoveAndDeleteChildren();
}

function AddScreenLink( screenPanel, linkClass, tooltipText, activateFunction )
{
	var link = $.CreatePanel( 'Button', GetScreenLinksContainer(), '' );
	link.AddClass( 'ProgressScreenButton' );
	link.AddClass( linkClass );

	link.SetPanelEvent( 'onactivate', function ()
	{
		$.DispatchEvent( 'DOTAPostGameProgressShowSummary', screenPanel );
		ShowProgressScreen( screenPanel );
		if ( activateFunction )
		{
			activateFunction();
		}
	} );

	link.SetPanelEvent( 'onmouseover', function () { $.DispatchEvent( 'UIShowTextTooltip', link, tooltipText ); } );
	link.SetPanelEvent( 'onmouseout', function () { $.DispatchEvent( 'UIHideTextTooltip', link ); } );

	return link;
}

function AddScreenLinkAction( screenPanel, linkClass, tooltipText, activateFunction )
{
	RunFunctionAction.call( this, function () { AddScreenLink( screenPanel, linkClass, tooltipText, activateFunction ); } );
}
AddScreenLinkAction.prototype = new RunFunctionAction();


// ----------------------------------------------------------------------------
//   Skip Ahead Functions
// ----------------------------------------------------------------------------

var g_bSkipAheadActions = false;

function IsSkippingAhead()
{
	return g_bSkipAheadActions;
}

function SetSkippingAhead( bSkipAhead )
{
	if ( g_bSkipAheadActions == bSkipAhead )
		return;

	// $.Msg( "SetSkippingAhead( " + bSkipAhead + " )" );
	//$.DispatchEvent( "PostGameProgressSkippingAhead" );
	$.GetContextPanel().SetHasClass( 'SkippingAhead', bSkipAhead );
	g_bSkipAheadActions = bSkipAhead;

	if ( bSkipAhead )
	{
		$.GetContextPanel().PlayUISoundScript( "ui_generic_button_click" );
	}
}
function StopSkippingAhead() { SetSkippingAhead( false ); }
function StartSkippingAhead() { SetSkippingAhead( true ); }

// ----------------------------------------------------------------------------
//   StopSkippingAheadAction
// 
//   Define a point at which we stop skipping (usually the end of a screen)
// ----------------------------------------------------------------------------

// Use a StopSkippingAheadAction to define a stopping point
function StopSkippingAheadAction()
{
}
StopSkippingAheadAction.prototype = new BaseAction();
StopSkippingAheadAction.prototype.update = function ()
{
	StopSkippingAhead();
	return false;
}


// ----------------------------------------------------------------------------
//   SkippableAction
// 
//   Wrap a SkippableAction around any other action to have it skip ahead
//   whenever we're supposed to skip ahead. SkippableAction guarantees that the
//   inner action will at least have start/update/finish called on it.
// ----------------------------------------------------------------------------
function SkippableAction( actionToMaybeSkip )
{
	this.innerAction = actionToMaybeSkip;
}
SkippableAction.prototype = new BaseAction();

SkippableAction.prototype.start = function ()
{
	this.innerAction.start();
}
SkippableAction.prototype.update = function ()
{
	return this.innerAction.update() && !IsSkippingAhead();
}
SkippableAction.prototype.finish = function ()
{
	this.innerAction.finish();
}


// Action to rum multiple actions in parallel, but with a slight stagger start between each of them
function RunSkippableStaggeredActions( staggerSeconds )
{
	this.actions = [];
	this.staggerSeconds = staggerSeconds;
}
RunSkippableStaggeredActions.prototype = new BaseAction();
RunSkippableStaggeredActions.prototype.start = function ()
{
	this.par = new RunParallelActions();

	for ( var i = 0; i < this.actions.length; ++i )
	{
		var delay = i * this.staggerSeconds;
		if ( delay > 0 )
		{
			var seq = new RunSequentialActions();
			seq.actions.push( new SkippableAction( new WaitAction( delay ) ) );
			seq.actions.push( this.actions[i] );
			this.par.actions.push( seq );
		}
		else
		{
			this.par.actions.push( this.actions[i] );
		}
	}

	this.par.start();
}
RunSkippableStaggeredActions.prototype.update = function ()
{
	return this.par.update();
}
RunSkippableStaggeredActions.prototype.finish = function ()
{
	this.par.finish();
}


// ----------------------------------------------------------------------------
//   OptionalSkippableAction
// 
//   Wrap a OptionalSkippableAction around any other action to have it skip it
//   if requested. OptionalSkippableAction will skip the inner action entirely
//   if skipping is currently enabled. However, if it starts the inner action
//   at all, then it will guarantee at least a call to start/update/finish.
// ----------------------------------------------------------------------------
function OptionalSkippableAction( actionToMaybeSkip )
{
	this.innerAction = actionToMaybeSkip;
}
OptionalSkippableAction.prototype = new BaseAction();

OptionalSkippableAction.prototype.start = function ()
{
	this.innerActionStarted = false;

	if ( !IsSkippingAhead() )
	{
		this.innerAction.start();
		this.innerActionStarted = true;
	}
}
OptionalSkippableAction.prototype.update = function ()
{
	if ( this.innerActionStarted )
		return this.innerAction.update() && !IsSkippingAhead();

	if ( IsSkippingAhead() )
		return false;

	this.innerAction.start();
	this.innerActionStarted = true;

	return this.innerAction.update();
}
OptionalSkippableAction.prototype.finish = function ()
{
	if ( this.innerActionStarted )
	{
		this.innerAction.finish();
	}
}


// ----------------------------------------------------------------------------
//   PlaySoundAction
// ----------------------------------------------------------------------------

function PlaySoundAction( soundName )
{
	this.soundName = soundName;
}
PlaySoundAction.prototype = new BaseAction();

PlaySoundAction.prototype.update = function ()
{
	$.GetContextPanel().PlayUISoundScript( this.soundName );
	return false;
}

// ----------------------------------------------------------------------------
//   PlaySoundForDurationAction
// ----------------------------------------------------------------------------

function PlaySoundForDurationAction( soundName, duration, pitchShift )
{
	this.soundName = soundName;
	this.duration = duration;
	this.pitchShift = ( pitchShift || false );
}
PlaySoundForDurationAction.prototype = new BaseAction();

PlaySoundForDurationAction.prototype.start = function ()
{
	this.soundEventGuid = $.GetContextPanel().PlayUISoundScript( this.soundName );
	if ( this.pitchShift )
	{
		this.startTimestamp = Date.now();
		$.GetContextPanel().SetSoundEventParamFloat( this.soundEventGuid, "pitch_adjust", 0.8 );
	}

	this.waitAction = new WaitAction( this.duration );
	this.waitAction.start();
}
PlaySoundForDurationAction.prototype.update = function ()
{
	if ( this.pitchShift )
	{
		var now = Date.now();
		var t = ( now - this.startTimestamp ) / this.duration;
		$.GetContextPanel().SetSoundEventParamFloat( this.soundEventGuid, "pitch_adjust", Math.min( 2.0, 0.8 + ( 2.0 - 0.8 ) * t ) );
	}

	return this.waitAction.update();
}
PlaySoundForDurationAction.prototype.finish = function ()
{
	$.GetContextPanel().StopUISoundScript( this.soundEventGuid );
	this.waitAction.finish();
}


// ----------------------------------------------------------------------------
//   Hero Badge Level Screen
// ----------------------------------------------------------------------------

// Keep in sync with EPlayerXPType
const PLAYER_XP_TYPE_MATCH_FINISHED = 0;
const PLAYER_XP_TYPE_MATCH_WON = 1;
const PLAYER_XP_TYPE_CHALLENGE_COMPLETED = 2;

// Keep in sync with EPlayerLevelReward
const PLAYER_LEVEL_REWARD_PACK = 0;
const PLAYER_LEVEL_REWARD_TICKET = 1;
const PLAYER_LEVEL_REWARD_BADGE_ID = 2;

function GetXPIncreaseAnimationDuration( xpAmount )
{
	return RemapValClamped( xpAmount, 0, 500, 0.5, 1.0 );
}

// Action to animate a hero badge xp increase
function AnimatePlayerXPIncreaseAction( panel, progress, xpAmount, xpValueStart, xpEarnedStart, xpLevelStart, resumeFromPreviousRow )
{
	this.panel = panel;
	this.progress = progress;
	this.xpAmount = xpAmount;
	this.xpValueStart = xpValueStart;
	this.xpEarnedStart = xpEarnedStart;
	this.xpLevelStart = xpLevelStart;
	this.resumeFromPreviousRow = resumeFromPreviousRow;
}
AnimatePlayerXPIncreaseAction.prototype = new BaseAction();

AnimatePlayerXPIncreaseAction.prototype.start = function ()
{
	var rowsContainer = this.panel.FindChildInLayoutFile( "PlayerXPProgressRows" );
	var totalsRow = this.panel.FindChildInLayoutFile( "TotalsRow" );
	var row = null;

	this.seq = new RunSequentialActions();

	if ( this.resumeFromPreviousRow )
	{
		row = rowsContainer.GetChild( rowsContainer.GetChildCount() - 1 );
	}
	else
	{
		row = $.CreatePanel( 'Panel', rowsContainer, '' );

		if ( this.progress.xp_type == PLAYER_XP_TYPE_MATCH_FINISHED )
		{
			row.BLoadLayoutSnippet( 'PlayerXPProgressRow' );
			row.SetDialogVariable( 'xp_type', $.Localize( '#DCG_PostGame_MatchFinished' ) );
		}
		else if ( this.progress.xp_type == PLAYER_XP_TYPE_MATCH_WON )
		{
			row.BLoadLayoutSnippet( 'PlayerXPProgressRow' );
			row.SetDialogVariable( 'xp_type', $.Localize( '#DCG_PostGame_Win' ) );
		}
		else if ( this.progress.xp_type == PLAYER_XP_TYPE_CHALLENGE_COMPLETED )
		{
			row.BLoadLayoutSnippet( 'PlayerXPProgressRow_Challenge' );
			row.SetDialogVariable( 'xp_type', this.progress.challenge_name );
			row.SetDialogVariable( 'xp_type_desc', this.progress.challenge_description );
			row.SetHasClass( 'has_description', this.progress.challenge_description.length > 0 );
			//row.SetDialogVariable( 'xp_type', $.Localize( '#DCG_PostGame_ChallengeCompleted' ) );
			//row.SetDialogVariable( 'challenge_name', this.progress.challenge_name );
		}

		// this row won't show when we pass it 0 xp. in future, allow a row to appear here and not grant xp ?
		// maybe needs to be a new action AnimatePartialChallengeAction

		//else if ( this.progress.xp_type == PLAYER_XP_TYPE_3_WINS_CHALLENGE )
		//{
		//	$.Msg( "Add a 3 Wins CHALLENGE COMPLETED row",  this.progress.challenge_name  );
		//	row.BLoadLayoutSnippet( 'PlayerXPProgressRow_3_Wins_Challenge' );
		//	row.SetDialogVariable( 'xp_type', this.progress.challenge_name );
			//row.SetDialogVariable( 'xp_type', $.Localize( '#DCG_PostGame_ChallengeCompleted' ) );
			//row.SetDialogVariable( 'challenge_name', this.progress.challenge_name );
		//	row.SwitchClass( 'challenge_stars', "StarsEarned_" + this.progress.challenge_stars );
		//}

		else
		{
			row.BLoadLayoutSnippet( 'PlayerXPProgressRow' );
			row.SetDialogVariable( 'xp_type', this.progress.xp_type );
		}

		row.SetDialogVariableInt( 'xp_value', this.xpValueStart );

		this.seq.actions.push( new AddClassAction( row, 'ShowRow' ) );
		this.seq.actions.push( new SkippableAction( new WaitAction( 0.5 ) ) );
		this.seq.actions.push( new AddClassAction( row, 'ShowValue' ) );
	}

	var duration = GetXPIncreaseAnimationDuration( this.xpAmount );
	var levelProgressBar = this.panel.FindChildInLayoutFile( 'PlayerLevelProgress' );
	var minLevelXP = Math.min( this.xpLevelStart, levelProgressBar.max );
	var maxLevelXP = Math.min( this.xpLevelStart + this.xpAmount, levelProgressBar.max );
	var par = new RunParallelActions();
	par.actions.push( new AnimateDialogVariableIntAction( row, 'xp_value', this.xpValueStart, this.xpValueStart + this.xpAmount, duration ) );
	par.actions.push( new AnimateDialogVariableIntAction( totalsRow, 'xp_value', this.xpEarnedStart, this.xpEarnedStart + this.xpAmount, duration ) );
	par.actions.push( new AnimateDialogVariableIntAction( this.panel, 'current_level_xp', minLevelXP, maxLevelXP, duration ) );
	par.actions.push( new AnimateProgressBarAction( levelProgressBar, minLevelXP, maxLevelXP, duration ) );
	par.actions.push( new PlaySoundForDurationAction( "XP.Count", duration, true ) );
	this.seq.actions.push( par );

	this.seq.start();
}
AnimatePlayerXPIncreaseAction.prototype.update = function ()
{
	return this.seq.update();
}
AnimatePlayerXPIncreaseAction.prototype.finish = function ()
{
	this.seq.finish();
}

function AnimatePlayerLevelRewardAction( data, containerPanel, playerLevel )
{
	this.data = data;
	this.containerPanel = containerPanel;
	this.playerLevel = playerLevel;
	if ( this.data.reward_type == PLAYER_LEVEL_REWARD_PACK )
	{
		this.reward = $.CreatePanel( 'Panel', this.containerPanel, '' );
		this.reward.BLoadLayoutSnippet( 'PlayerLevelUpRewardPack' );
	}
	else if ( this.data.reward_type == PLAYER_LEVEL_REWARD_TICKET )
	{
		this.reward = $.CreatePanel( 'Panel', this.containerPanel, '' );
		this.reward.BLoadLayoutSnippet( 'PlayerLevelUpRewardTicket' );
	}
	else if ( this.data.reward_type == PLAYER_LEVEL_REWARD_BADGE_ID )
	{
		this.reward = $.CreatePanel( 'Panel', this.containerPanel, '' );
		this.reward.BLoadLayoutSnippet( 'PlayerLevelUpRewardBadge' );
		icon = this.reward.FindChildInLayoutFile( 'BadgeIcon' );
		icon.badgeID = this.data.badge_id;
		icon.badgeLevel = this.playerLevel;
	}
	else
	{
		$.Msg( "Unknown reward_type '" + this.data.reward_type + "', skipping" );
	}
}

AnimatePlayerLevelRewardAction.prototype = new BaseAction();
AnimatePlayerLevelRewardAction.prototype.start = function ()
{
	$.Msg( "AnimatePlayerLevelRewardAction" );

	this.seq = new RunSequentialActions();

	if ( this.data.reward_type == PLAYER_LEVEL_REWARD_PACK )
	{
		this.seq.actions.push( new AddClassAction( this.reward, 'ShowReward' ) );
	}
	else if ( this.data.reward_type == PLAYER_LEVEL_REWARD_TICKET )
	{
		this.seq.actions.push( new AddClassAction( this.reward, 'ShowReward' ) );
	}
	else if ( this.data.reward_type == PLAYER_LEVEL_REWARD_BADGE_ID )
	{
		this.seq.actions.push( new AddClassAction( this.reward, 'ShowReward' ) );		
	}

	this.seq.actions.push( new WaitAction( 0.6 ) );

	this.seq.start();
}
AnimatePlayerLevelRewardAction.prototype.update = function ()
{
	return this.seq.update();
}
AnimatePlayerLevelRewardAction.prototype.finish = function ()
{
	this.seq.finish();
}


function AnimatePlayerXPLevelScreenAction( data )
{
	this.data = data;
}

AnimatePlayerXPLevelScreenAction.prototype = new BaseAction();
AnimatePlayerXPLevelScreenAction.prototype.start = function ()
{
	var playerXPStart = this.data.player_xp_start;
	var playerLevelStart = this.data.player_level_start;

	var xpLevelStart = playerXPStart;
	var xpLevelNext = $.GetContextPanel().GetPlayerXPForNextPlayerLevel( playerLevelStart );

	// Create the screen and do a bunch of initial setup
	var panel = StartNewScreen( 'PlayerLevelProgressScreen' );
	panel.BLoadLayoutSnippet( "PlayerLevelProgress" );
	panel.FindChildInLayoutFile( "AccountBadge" ).badgeLevel = playerLevelStart;

	panel.FindChildInLayoutFile( "TotalsRow" ).SetDialogVariableInt( 'xp_value', 0 );
	panel.SetDialogVariableInt( 'current_level_xp', xpLevelStart );
	panel.SetDialogVariableInt( 'xp_to_next_level', xpLevelNext );
	panel.SetDialogVariableInt( 'current_level', playerLevelStart );
	panel.SetDialogVariableInt( 'next_level', playerLevelStart + 1 );

	panel.FindChildInLayoutFile( "PlayerLevelProgress" ).max = xpLevelNext;
	panel.FindChildInLayoutFile( "PlayerLevelProgress" ).value = xpLevelStart;

	$.GetContextPanel().GetParent().GetParent().RemoveClass( 'ShowingLevelProgress' );

	// Setup the sequence of actions to animate the screen
	this.seq = new RunSequentialActions();

	// Delay for the fade-in of victory / defeat.
	this.seq.actions.push( new WaitAction( 4 ) );

	this.seq.actions.push( new AddClassAction( $.GetContextPanel().GetParent().GetParent(), 'ShowingLevelProgress'));
	this.seq.actions.push( new AddClassAction( panel, 'ShowScreen' ) );
	//this.seq.actions.push( new ActionWithTimeout( new WaitForClassAction( heroModel, 'SceneLoaded' ), 3.0 ) );

	this.seq.actions.push( new WaitAction( 2.5 ) );

	if ( this.data.player_xp_progress )
	{
		//this.seq.actions.push( new AddScreenLinkAction( panel, 'HeroBadgeProgress', '#DOTA_PlusPostGame_HeroProgress', function ()
		//{
		//	panel.SwitchClass( 'current_screen', '.ShowPlayerLevelUp' );
		//} ) );

		this.seq.actions.push( new SwitchClassAction( panel, 'current_screen', 'ShowPlayerLevelUp' ) );

		var xpEarned = 0;
		var xpLevel = xpLevelStart;
		var playerLevel = playerLevelStart;
		for ( var i = 0; i < this.data.player_xp_progress.length; ++i )
		{
			var xpRemaining = this.data.player_xp_progress[i].xp_amount;
			var xpEarnedOnRow = 0;

			while ( xpRemaining > 0 )
			{
				var xpToNextLevel = xpLevelNext - xpLevel;
				var xpToAnimate = Math.min( xpRemaining, xpToNextLevel );

				if ( xpToAnimate > 0 )
				{
					this.seq.actions.push( new SkippableAction( new AnimatePlayerXPIncreaseAction( panel, this.data.player_xp_progress[i], xpToAnimate, xpEarnedOnRow, xpEarned, xpLevel, xpEarnedOnRow != 0 ) ) );

					xpEarned += xpToAnimate;
					xpLevel += xpToAnimate;
					xpEarnedOnRow += xpToAnimate;
					xpRemaining -= xpToAnimate;
				}

				xpToNextLevel = xpLevelNext - xpLevel;
				if ( xpToNextLevel == 0 )
				{
					playerLevel = playerLevel + 1;

					sceneFX = panel.FindChildInLayoutFile( 'GodRays' );

					$.Msg( 'ScneFX: ' + sceneFX );

					this.seq.actions.push( new StopSkippingAheadAction() );

					( function ( me, playerLevel )
					{
						var levelUpData = me.data.player_level_up[ playerLevel ];
						
						me.seq.actions.push( new RunFunctionAction( function ()
						{							
							panel.AddClass( "LeveledUp" );
							if ( levelUpData !== undefined && levelUpData.rewards !== undefined )
							{
								panel.AddClass( "LeveledUpWithRewards" );
								$.GetContextPanel().GetParent().GetParent().AddClass('ShowingLevelProgressWithRewards');
							}
						} ) );

						me.seq.actions.push( new RunFunctionAction( function ()
						{							
							$.DispatchEvent( 'DCGSceneFireEntityInput', sceneFX, 'ui_burst_bar', 'stop', '0' );
							$.DispatchEvent( 'DCGSceneFireEntityInput', sceneFX, 'ui_burst_bar', 'start', '0.0' );
						} ) );

						
						me.seq.actions.push( new WaitAction( 1.20 ) );
						me.seq.actions.push( new RunFunctionAction( function ()
						{							
							panel.SetDialogVariableInt( 'current_level', playerLevel );
							panel.FindChildInLayoutFile( "AccountBadge" ).badgeLevel = playerLevel;
						} ) );

						if ( levelUpData )
						{				
						
							var rewardsPanel = panel.FindChildInLayoutFile( "PlayerLevelProgressRewardsList" );							
							me.seq.actions.push( new RunFunctionAction( function ()
							{							
								panel.RemoveClass('RewardsFinished');
								panel.AddClass( 'ShowingLevelUpDialog' );

								$.DispatchEvent( 'DCGSceneFireEntityInput', sceneFX, 'ui_burst_rays', 'stop', '0.0' );
								$.DispatchEvent( 'DCGSceneFireEntityInput', sceneFX, 'ui_burst_rays', 'start', '0.0' );

								$.DispatchEvent( 'DCGSceneFireEntityInput', sceneFX, 'ui_burst_red', 'stop', '0' );
								$.DispatchEvent( 'DCGSceneFireEntityInput', sceneFX, 'ui_burst_red', 'start', '0.0' );
							
								$.DispatchEvent( 'DCGSceneFireEntityInput', sceneFX, 'ui_burst_rays', 'stop', '1.0' );
		
								if ( levelUpData.sound_name !== undefined )
								{
								    $.GetContextPanel().PlayUISoundScript( levelUpData.sound_name );
								}
								else
								{
								    $.GetContextPanel().PlayUISoundScript( "DCG_Progression.XP_Level_Up_Generic" );
								}
							} ) );

							if ( levelUpData.rewards !== undefined )
							{

								me.seq.actions.push( new WaitAction( 1.30 ) );
								for ( var j = 0; j < levelUpData.rewards.length; ++j )
								{
									me.seq.actions.push( new SkippableAction( new AnimatePlayerLevelRewardAction( levelUpData.rewards[j], rewardsPanel, playerLevel ) ) );
								}
								me.seq.actions.push( new AddClassAction( panel, 'RewardsFinished' ) );
								me.seq.actions.push( new PlaySoundAction( 'DCG_Progression.XP_Level_Flourish' ));
								me.seq.actions.push( new WaitForEventAction( panel.FindChildInLayoutFile( "RewardsFinishedButton" ), 'Activated' ) );
							
							}
							else
							{
								me.seq.actions.push( new SkippableAction( new WaitAction( 1.0 ) ) );
							}
							me.seq.actions.push( new StopSkippingAheadAction() );
						}
						panel.FindChildInLayoutFile( "RewardsFinishedButton" ).RemoveClass( 'Activated' );

					} )( this, playerLevel );
					//this.seq.actions.push( new WaitAction( 1.0 ) );

					xpLevel = 0;
					xpLevelNext = $.GetContextPanel().GetPlayerXPForNextPlayerLevel( playerLevel );

					( function ( me, xpLevelInternal, xpLevelNextInternal )
					{
						me.seq.actions.push( new RunFunctionAction( function ()
						{
							panel.SetDialogVariableInt( 'current_level_xp', xpLevelInternal );
							panel.SetDialogVariableInt( 'xp_to_next_level', xpLevelNextInternal );
							panel.FindChildInLayoutFile( "PlayerLevelProgress" ).max = xpLevelNextInternal;
							panel.FindChildInLayoutFile( "PlayerLevelProgress" ).value = xpLevelInternal;
						} ) );

						me.seq.actions.push( new RunFunctionAction( function ()
						{							
							panel.RemoveClass( 'LeveledUp' );
							panel.RemoveClass( 'LeveledUpWithRewards' );
							panel.RemoveClass( 'ShowingLevelUpDialog' );
							panel.GetParent().GetParent().GetParent().GetParent().RemoveClass( 'ShowingLevelProgressWithRewards' );
						} ) );

					} )( this, xpLevel, xpLevelNext );
					
					
				}
			}

			this.seq.actions.push( new WaitAction( 0.2 ) );
		}

		this.seq.actions.push( new StopSkippingAheadAction() );
		this.seq.actions.push( new SwitchClassAction( panel, 'current_screen', '' ) );
	}

	// Signal back to the C++ code that we're done displaying progress
	this.seq.actions.push( new RunFunctionAction( function ()
	{
		/*$.GetContextPanel().GetParent().GetParent().RemoveClass( 'ShowingLevelProgress' );*/
		$.DispatchEvent( 'DCGPostGameProgressComplete', $.GetContextPanel() );
	} ) );

	this.seq.start();
}
AnimatePlayerXPLevelScreenAction.prototype.update = function ()
{
	return this.seq.update();
}
AnimatePlayerXPLevelScreenAction.prototype.finish = function ()
{
	this.seq.finish();
}

// ----------------------------------------------------------------------------
//
// Debugging
//
// ----------------------------------------------------------------------------

function AnimatePlayerLevelAgain()
{
	$._testData = undefined;
	$.DispatchEvent( 'DevRestartProgress', $.GetContextPanel() );
}

function TestAnimatePlayerLevel()
{
	$.Msg( "TestAnimatePlayerLevel" );
	var data =
	{
		player_xp_start: 750,
		player_level_start: 12,

		player_xp_progress:
		[
			{
				xp_type: PLAYER_XP_TYPE_MATCH_FINISHED,
				xp_amount: 123
			},
			{
				xp_type: PLAYER_XP_TYPE_MATCH_WON,
				xp_amount: 222
			},
			{
				xp_type: PLAYER_XP_TYPE_CHALLENGE_COMPLETED,
				xp_amount: 500,
				challenge_name: "FIRST WIN OF THE WEEK",
				challenge_description: "Yep, you won."
			},
			{
				xp_type: PLAYER_XP_TYPE_CHALLENGE_COMPLETED,
				xp_amount: 10,
				challenge_name: "KILL SOME TOWERS",
				challenge_description: "Got 'em."
			},
			{
				xp_type: PLAYER_XP_TYPE_CHALLENGE_COMPLETED,
				xp_amount: 20,
				challenge_name: "ALL YOUR HEROES ARE DEAD",
				challenge_description: "Woo!"
			},
		],

		//"DCG_Progression.XP_Level_Up_Generic" is the for tiers without rewards

		player_level_up:
		{
			13:
				{
					sound_name : "DCG_Progression.XP_Level_Up_Tier_01",
					rewards: 
					[
						{
							reward_type: PLAYER_LEVEL_REWARD_PACK
						},
						{
							reward_type: PLAYER_LEVEL_REWARD_TICKET
						}		
					]
				},
			14:
				{
					sound_name: "DCG_Progression.XP_Level_Up_Tier_02",
					rewards: 
					[	
						{
							reward_type: PLAYER_LEVEL_REWARD_PACK
						},	
					]
				}
		},

	};

	TestProgressAnimation( data );
}


// ----------------------------------------------------------------------------
//   All Screens
// ----------------------------------------------------------------------------

function CreateProgressAnimationSequence( data )
{
	var seq = new RunSequentialActions();

	if ( data.player_xp_progress !== null )
	{
		seq.actions.push( new AnimatePlayerXPLevelScreenAction( data ) );
	}

	return seq;
}

function TestProgressAnimation( data )
{
	$._testData = data;
	$.DispatchEvent( 'DevRestartProgress', $.GetContextPanel() );
}

/* Called from C++ to start the progress animation */
function StartProgressAnimation( data )
{
	if ( $._testData !== undefined )
	{
		data = $._testData;
		$._testData = undefined;
	}

	ResetScreens();
	StopSkippingAhead();

	var seq = CreateProgressAnimationSequence( data );
	RunSingleAction( seq );
}

function HideProgress()
{
	// Just tell the C++ code that we're done by dispatching the event
	$.DispatchEvent( 'DCGPostGameProgressComplete', $.GetContextPanel() );
}
