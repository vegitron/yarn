var sh = $(window).height(),
	hh = $('.yarn-header').height(),
	ch = sh - hh;
	
$(function() {
        
    $('#myTab a').click(function (e) {
        //e.preventDefault();
        $(this).tab('show');
    });
    
    
    // set the container heights
    setContentHeights();
    
    // slide the available thread list panel up
    $('#available_thread_list').addClass('slide-up');
    
    // TODO: if user has no last active thread, show the sidebar (mobile only)
    if (Modernizr.mq('screen and (max-width: 768px)')) {
        $('body').addClass('offcanvas');
    }
    
});

$(window).resize(function() {
    
    sh = $(window).height();
	hh = $('.yarn-header').height();
	ch = sh - hh;
	
    setContentHeights();
    
});

function setContentHeights() {
    
    $('.viewport').height(sh);
    $('.yarn-content').height(ch);
    $('.yarn-content-module').height(ch);
}
