var sh = $(window).height(),
	hh = $('.yarn-header').height(),
	ch = sh - hh;
	
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
    
    $('.viewport').height(sh);
    $('.yarn-content').height(ch);
    $('.yarn-content-module').height(ch);
}
