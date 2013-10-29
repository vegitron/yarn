var body = $('body');

$(function() {
    $('a.switch').on('click', function(e) {
        e.preventDefault();

        if(body.hasClass('offcanvas')) {
            body.removeClass('offcanvas');
        } else {
            body.addClass('offcanvas');
        }
    });
});

$(window).resize(function() {

    if (Modernizr.mq('screen and (min-width: 1000px)')) {
        if(body.hasClass('offcanvas')) {
            body.removeClass('offcanvas');
        }
    }
    
});
