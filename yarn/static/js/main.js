$(function() {
    
    $('#myTab a').click(function (e) {
        //e.preventDefault();
        $(this).tab('show');
    });
    
    // set the container heights
    setContentHeights();
    
    // slide the available thread list panel up
    $('#available_thread_list').addClass('slide-up');
    
    // TODO: (mobile only) if user has no last active thread, show the sidebar 
    if (mobile) {
        $('body').addClass('offcanvas');
    }
    
});

//$(window).smartresize(setContentHeights);
$(window).on('resize', setContentHeights);

function setContentHeights() {
    var window_height = $(window).height();
    var header_height = $('.yarn-header').height();
    var content_height = window_height- header_height;

    $('#viewport').height(window_height);
    $('#tabs').height(content_height);
    $('.yarn-content-module').height(content_height);
}
