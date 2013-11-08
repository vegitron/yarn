function show_public_threads() {
    _add_current_thread_menu_highlight("#public_thread_menu");
    show_filtered_thread_tabs(function(thread_info) {
        if (thread_info.is_private) {
            return false;
        }
        return true;
    });
}

function show_active_threads() {
    _add_current_thread_menu_highlight("#active_thread_menu");
    show_filtered_thread_tabs(function(thread_info) {
        if (thread_info.last_date) {
            return true;
        }
        return false;
    });

}

function show_private_threads() {
    _add_current_thread_menu_highlight("#private_thread_menu");
    show_filtered_thread_tabs(function(thread_info) {
        if (thread_info.is_private) {
            return true;
        }
        return false;
    });

}


function _add_current_thread_menu_highlight(selector) {
    $("#public_thread_menu").removeClass("label-success");
    $("#active_thread_menu").removeClass("label-success");
    $("#private_thread_menu").removeClass("label-success");
    $(selector).addClass("label-success");
}

