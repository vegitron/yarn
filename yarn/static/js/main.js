$(function() {
    
    $('#current_thread').on('click', function(e) {
        
        e.preventDefault();

        if($('.yarn-active-list').hasClass('slide-hide')) {
            $('.yarn-active-list').removeClass('slide-hide');
        } else {
            $('.yarn-active-list').addClass('slide-hide');
        }
    });
    
    $('#myTab a').click(function (e) {
      e.preventDefault();
      $(this).tab('show');
    })    
});