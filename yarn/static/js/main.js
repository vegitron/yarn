var sh = $(window).height(),
	hh = $('.yarn-header').height(),
	ch = sh - hh;
	
/*! Normalized address bar hiding for iOS & Android (c) @scottjehl MIT License */
(function( win ){
	var doc = win.document;

	// If there's a hash, or addEventListener is undefined, stop here
	if( !location.hash && win.addEventListener ){

		//scroll to 1
		win.scrollTo( 0, 1 );
		var scrollTop = 1,
			getScrollTop = function(){
				return win.pageYOffset || doc.compatMode === "CSS1Compat" && doc.documentElement.scrollTop || doc.body.scrollTop || 0;
			},

			//reset to 0 on bodyready, if needed
			bodycheck = setInterval(function(){
				if( doc.body ){
					clearInterval( bodycheck );
					scrollTop = getScrollTop();
					win.scrollTo( 0, scrollTop === 1 ? 0 : 1 );
				}	
			}, 15 );

		win.addEventListener( "load", function(){
			setTimeout(function(){
				//at load, if user hasn't scrolled more than 20 or so...
				if( getScrollTop() < 20 ){
					//reset to hide addr bar at onload
					win.scrollTo( 0, scrollTop === 1 ? 0 : 1 );
				}
			}, 0);
		}, false );
	}
})( this );

$(function() {
    
    $('#current_thread').on('click', function(e) {
        
//        e.preventDefault();

        if($('.yarn-active-list').hasClass('slide-hide')) {
            show_thread_menu();
        } else {
            hide_thread_menu();
        }
    });
    
    $('#myTab a').click(function (e) {
  //    e.preventDefault();
      $(this).tab('show');
    });
    
    
    // set the container heights
    setContentHeights();
    
    // slide the available thread list panel up
    $('#available_thread_list').addClass('slide-up');
    
        
});

$(window).resize(function() {
    
    sh = $(window).height();
	hh = $('.yarn-header').height();
	ch = sh - hh;
	
    setContentHeights();
    
});

function setContentHeights() {
    
    $('.yarn-content').height(ch);
    $('.yarn-content-module').height(ch);
}
