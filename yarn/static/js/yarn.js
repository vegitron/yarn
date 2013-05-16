
function start_yarn() {
    $.ajax('rest/v1/threads', { success: draw_available_threads, error: draw_launch_error });
}

function draw_launch_error() {
    console.log("Error launching yarn");
}

function draw_available_threads(data) {
    var source = $("#available_threads").html();
    var template = Handlebars.compile(source);

    $("#available_thread_list").html(template({ threads: data["threads"] }));

    var tabs = $( "#tabs" ).tabs({
        activate: function(ev, ui) {
            select_thread_tab_event(ev, ui);
        }
    });
    refresh_thread_tabs();

    var favs = data["favorites"];
    for (var i = 0; i < favs.length; i++) {
        pre_load_thread(favs[i]);
    }

    for (var i = 0; i < favs.length; i++) {
        load_thread(favs[i]);
    }
    refresh_thread_tabs();


    $(".open_thread").on("click", load_thread_from_href);
}

function refresh_thread_tabs() {
    $("#tabs").tabs("refresh");
    $("#tabs").find( ".ui-tabs-nav" ).sortable({
        axis: "x",
        handle: ".handle",
        items: "li:not(#home_tab)",
        stop: function() {
            save_thread_preference();
            return true;
        }
    });


}

function handle_window_click(e) {
    var target = e.target;
    if (target.className == "artifact_upload_interface") {
        choose_file_to_upload(target.rel);
    }
    else if (target.className == "cancel_upload_artifact") {
        cancel_file_upload(target.rel);
    }
    else if (target.className == "upload_artifact") {
        upload_new_artifact(target.rel);
    }
    else if (target.className == "private_chat") {
        open_private_chat(target.rel, { "highlight": true });
    }
    else if (target.className == "thread-history") {
        show_thread_history(target.rel);
    }
    else if (target.className == "close-history") {
        close_thread_history(target.rel);
    }
}

function save_thread_preference() {
    var ids = [];
    var items = $("#tab_list > li");
    for (var i = 0; i < items.length; i++) {
        var item = items[i];

        var item_id = item.id;

        var matches = item_id.match(/thread_tab_([0-9]+)/);
        if (matches) {
            ids.push(matches[1]);
        }
    }

    var csrf_value = $("input[name='csrfmiddlewaretoken']")[0].value;
    $.ajax('rest/v1/set_fav_threads', {
        type: "POST",
        headers: {
            "X-CSRFToken": csrf_value
        },
        data: JSON.stringify(ids),
        dataType: 'text'
    });

}

function window_focus_event() {
    window.is_blurred = false;
    document.title = yarn_headers["normal"];
    clearTimeout(window.alert_title_timeout);
    window.alert_title_timeout = null;
}

function window_blur_event() {
    window.is_blurred = true;
}

function set_highlight_title() {
    if (window.is_blurred && !window.alert_title_timeout) {
        document.title = yarn_headers["highlight"];
    }
}

function set_alert_title() {
    if (window.alert_title_timeout || !window.is_blurred) {
        return;
    }
    document.title = yarn_headers["alert"][0];
    window.alert_title_position = 0;

    window.alert_title_timeout = setTimeout(toggle_alert_title, 200);
}

function toggle_alert_title() {
    if (!window.is_blurred) {
        return;
    }

    var next_pos = window.alert_title_position + 1;

    if (next_pos >= yarn_headers["alert"].length) {
        next_pos = 0;
    }

    document.title = yarn_headers["alert"][next_pos];
    window.alert_title_position = next_pos;

    window.alert_title_timeout = setTimeout(toggle_alert_title, 400);
}

$(window).on("blur", window_blur_event);
$(window).on("focus", window_focus_event);

$(window).on("click", handle_window_click);
start_period_updates();
