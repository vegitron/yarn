var sh = $(window).height(),
	hh = $('.yarn-header').height(),
	ch = sh - hh;

var deBouncer = function($,cf,of, interval){
    // deBouncer by hnldesign.nl
    // based on code by Paul Irish and the original debouncing function from John Hann
    // http://unscriptable.com/index.php/2009/03/20/debouncing-javascript-methods/
    var debounce = function (func, threshold, execAsap) {
        var timeout;
        return function debounced () {
            var obj = this, args = arguments;
            function delayed () {
                if (!execAsap)
                    func.apply(obj, args);
                timeout = null;
            }
            if (timeout)
                clearTimeout(timeout);
            else if (execAsap)
                func.apply(obj, args);
            timeout = setTimeout(delayed, threshold || interval);
        };
    };
    jQuery.fn[cf] = function(fn){  return fn ? this.bind(of, debounce(fn)) : this.trigger(cf); };
};

// register debouncing functions
deBouncer(jQuery,'smartresize', 'resize', 100);
deBouncer(jQuery,'smartscroll', 'scroll', 100);
deBouncer(jQuery,'smartmousemove', 'mousemove', 100);
	
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

// handle browser resizing (debounced)
$(window).smartresize(function(e){
    
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
