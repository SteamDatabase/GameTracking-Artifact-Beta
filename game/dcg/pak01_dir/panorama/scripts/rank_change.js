function AnimateRankChangeAction( data )
{
	this.data = data;
}

AnimateRankChangeAction.prototype = new BaseAction();
AnimateRankChangeAction.prototype.start = function()
{
	this.seq = new RunSequentialActions();

	var popup = $.GetContextPanel();	
	var progressbar = $( '#Progress' );

	// hide the new rank
	var newRankBadge = $( '#NewBadgeContainer' );
	var oldRankBadge = $( '#OldBadgeContainer' );

	// clean up for dev, this stuff doesn't matter if we're not re-running the sequence
	oldRankBadge.AddClass( 'FadeIn' );
	newRankBadge.RemoveClass( 'FadeIn' );
	newRankBadge.AddClassAction

	oldRankBadge.RemoveClass( 'Animating' );
	newRankBadge.RemoveClass( 'Animating' );
	
	progressbar.RemoveClass( "FadeOut" );
	newRankBadge.RemoveClass( "Centered" );

	oldRankBadge.RemoveClass( 'ArriveFromAbove' );
	newRankBadge.RemoveClass( 'ArriveFromAbove' );
	oldRankBadge.RemoveClass( 'ArriveFromBelow' );
	newRankBadge.RemoveClass( 'ArriveFromBelow' );
	oldRankBadge.RemoveClass( 'LeaveBelow' );
	newRankBadge.RemoveClass( 'LeaveBelow' );
	oldRankBadge.RemoveClass( 'LeaveAbove' );
	newRankBadge.RemoveClass( 'LeaveAbove' );

	$( '#LeaderboardFlash' ).RemoveClass( 'Visible' );

	var old_percent = ( this.data.old_progress / 128 ) * 100;
	var new_percent = ( this.data.new_progress / 128 ) * 100;

	// init to the previous rank state
	this.seq.actions.push( new SetDialogVariableIntAction( popup, 'progress_value', old_percent ) );
	this.seq.actions.push( new SetProgressBarValueAction( progressbar, this.data.old_progress ) );
	this.seq.actions.push( new WaitAction( 2.5 ) );
	
	var anim_time = 0.5;

	if ( this.data.old_major == this.data.new_major && this.data.old_minor == this.data.new_minor )
	{
		if ( this.data.new_rank >= this.data.min_leaderboard_rank )
		{
			// leaderboard position change
			progressbar.AddClass( 'FadeOut' );

			this.seq.actions.push( new WaitAction( 1.0 ) );
			this.seq.actions.push( new AddClassAction( oldRankBadge, 'Animating' ) );
			this.seq.actions.push( new AddClassAction( newRankBadge, 'Animating' ) );

			this.seq.actions.push( new RemoveClassAction( oldRankBadge, 'FadeIn' ) );
			this.seq.actions.push( new AddClassAction( newRankBadge, 'FadeIn' ) );

			this.seq.actions.push( new AddClassAction( $( '#LeaderboardFlash' ), 'Visible' ) );
			this.seq.actions.push( new WaitAction( 0.5 ) );
		}
		else
		{
			// Just animate the progress bar
			var par = new RunParallelActions();
			par.actions.push( new AnimateDialogVariableIntAction( popup, 'progress_value', old_percent, new_percent, anim_time ) );
			par.actions.push( new AnimateProgressBarAction( progressbar, this.data.old_progress, this.data.new_progress, anim_time ) );
			this.seq.actions.push( par );
		}
	}	
	else if ( this.data.old_rank < this.data.new_rank )
	{
		//$.Msg( this.data.old_major + " " + this.data.new_major );
		//$.Msg( this.data.min_leaderboard_rank );
		if ( this.data.new_rank >= this.data.min_leaderboard_rank )
		{
			// ranked up to 9

			// animate to 100%
			var par = new RunParallelActions();
			par.actions.push( new AnimateDialogVariableIntAction( popup, 'progress_value', old_percent, 100, anim_time ) );
			par.actions.push( new AnimateProgressBarAction( progressbar, this.data.old_progress, 128, anim_time ) );
			this.seq.actions.push( par );

			// change the icon	
			this.seq.actions.push( new AddClassAction( oldRankBadge, 'Animating' ) );
			this.seq.actions.push( new AddClassAction( newRankBadge, 'Animating' ) );

			this.seq.actions.push( new RemoveClassAction( oldRankBadge, 'FadeIn' ) );
			this.seq.actions.push( new AddClassAction( newRankBadge, 'FadeIn' ) );

			this.seq.actions.push( new WaitAction( 1.5 ) );
		}
		else
		{
			newRankBadge.TriggerClass( 'Arriving' );

			// regular rank up
			this.seq.actions.push( new AddClassAction( oldRankBadge, 'Animating' ) );
			this.seq.actions.push( new AddClassAction( newRankBadge, 'Animating' ) );

			// animate to 100%
			var par = new RunParallelActions();
			par.actions.push( new AnimateDialogVariableIntAction( popup, 'progress_value', old_percent, 100, anim_time ) );
			par.actions.push( new AnimateProgressBarAction( progressbar, this.data.old_progress, 128, anim_time ) );
			this.seq.actions.push( par );

			// change the icon
			this.seq.actions.push( new AddClassAction( oldRankBadge, 'LeaveBelow' ) );
			this.seq.actions.push( new AddClassAction( newRankBadge, 'ArriveFromAbove' ) );

			this.seq.actions.push( new RemoveClassAction( oldRankBadge, 'FadeIn' ) );
			this.seq.actions.push( new TriggerClassAction( newRankBadge, 'FadeIn' ) );

			this.seq.actions.push( new WaitAction( 1.5 ) );

			// animate to the new value
			var par3 = new RunParallelActions();
			par3.actions.push( new AnimateDialogVariableIntAction( popup, 'progress_value', 0, new_percent, anim_time ) );
			par3.actions.push( new AnimateProgressBarAction( progressbar, 0, this.data.new_progress, anim_time ) );
			this.seq.actions.push( par3 );
		}

		// splash and move the badge to the center
		this.seq.actions.push( new WaitAction( 1.5 ) );
		this.seq.actions.push( new PlaySoundEffectAction( "DCG_Progression.Ranked_Tier_01" ) );
		this.seq.actions.push( new AddClassAction( progressbar, "FadeOut" ) );
		this.seq.actions.push( new AddClassAction( newRankBadge, "Animating" ) );
		this.seq.actions.push( new AddClassAction( newRankBadge, "Centered" ) );
		this.seq.actions.push( new CreatePanelWithSnippetAction( popup, 'EffectsPanel' ) );
	}
	else if ( this.data.old_rank >= this.data.min_leaderboard_rank && this.data.new_rank < this.data.min_leaderboard_rank )
	{
		// rank down from 9
		//$.Msg( "rank down from 9\n" );

		progressbar.AddClass( 'FadeOut' );
		oldRankBadge.AddClass( 'Centered' );
		newRankBadge.AddClass( 'Centered' );
		
		this.seq.actions.push( new SetDialogVariableIntAction( popup, 'progress_value', 100 ) );
		this.seq.actions.push( new SetProgressBarValueAction( progressbar, 128 ) );

		this.seq.actions.push( new WaitAction( 0.5 ) );

		// change the icon	
		this.seq.actions.push( new AddClassAction( oldRankBadge, 'Animating' ) );
		this.seq.actions.push( new AddClassAction( newRankBadge, 'Animating' ) );

		this.seq.actions.push( new RemoveClassAction( oldRankBadge, 'FadeIn' ) );
		this.seq.actions.push( new AddClassAction( newRankBadge, 'FadeIn' ) );

		this.seq.actions.push( new WaitAction( 1.5 ) );

		var par = new RunParallelActions();
		par.actions.push( new RemoveClassAction( newRankBadge, 'Centered' ) );
		par.actions.push( new RemoveClassAction( progressbar, "FadeOut" ) );
		this.seq.actions.push( par );

		var par2 = new RunParallelActions();
		par2.actions.push( new AnimateDialogVariableIntAction( popup, 'progress_value', 128, new_percent, anim_time ) );
		par2.actions.push( new AnimateProgressBarAction( progressbar, 128, this.data.new_progress, anim_time ) );
		this.seq.actions.push( par2 );
	}
	else if ( this.data.old_rank > this.data.new_rank )
	{
		// regular rank down

		// animate to 0%
		var par2 = new RunParallelActions();
		par2.actions.push( new AnimateDialogVariableIntAction( popup, 'progress_value', old_percent, 0, anim_time ) );
		par2.actions.push( new AnimateProgressBarAction( progressbar, this.data.old_progress, 0, anim_time ) );
		this.seq.actions.push( par2 );

		// change the icon	
		
		this.seq.actions.push( new AddClassAction( oldRankBadge, 'LeaveAbove' ) );
		this.seq.actions.push( new AddClassAction( newRankBadge, 'ArriveFromBelow' ) );


		this.seq.actions.push( new AddClassAction( oldRankBadge, 'Animating' ) );
		this.seq.actions.push( new AddClassAction( newRankBadge, 'Animating' ) );

		this.seq.actions.push( new RemoveClassAction( oldRankBadge, 'FadeIn' ) );
		this.seq.actions.push( new AddClassAction( newRankBadge, 'FadeIn' ) );

		this.seq.actions.push( new WaitAction( 1.5 ) );

		// animate to the new value
		var par3 = new RunParallelActions();
		par3.actions.push( new AnimateDialogVariableIntAction( popup, 'progress_value', 100, new_percent, anim_time ) );
		par3.actions.push( new AnimateProgressBarAction( progressbar, 128, this.data.new_progress, anim_time ) );
		this.seq.actions.push( par3 );

		// DO NOT CONGRATULATE

		// move the badge to the center
		this.seq.actions.push( new WaitAction( 1.5 ) );
		this.seq.actions.push( new AddClassAction( progressbar, "FadeOut" ) );
		this.seq.actions.push( new AddClassAction( newRankBadge, "Animating" ) );
		this.seq.actions.push( new AddClassAction( newRankBadge, "Centered" ) );
	}	

	this.seq.start();
}

AnimateRankChangeAction.prototype.update = function ()
{
	return this.seq.update();
}

AnimateRankChangeAction.prototype.finish = function ()
{
	this.seq.finish();
}

function CreateAnimateRankChangeSequence( data )
{
	var seq = new RunSequentialActions();

	seq.actions.push( new AnimateRankChangeAction( data ) );

	seq.actions.push( new RunFunctionAction( function() {
		$.DispatchEvent( 'DCGPlayRankSequenceComplete', $.GetContextPanel() );
	} ) );
	return seq;
}

function StartProgressAnimation( data )
{
	var seq = CreateAnimateRankChangeSequence( data );
	RunSingleAction( seq );
}