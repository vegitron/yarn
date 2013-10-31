
function start_yarn() {
    if (window.use_websockets) {
        var socket_args = {};
        if (window.websockets_url.match(/^wss:/)) {
            socket_args['secure'] = true;
        }
        var socket = io.connect(window.websockets_url, socket_args);
        socket.on('connect', function() {
            start_sockets_yarn(socket);
        });
    }
    else {
        $.ajax('api/v1/threads', { success: rest_draw_available_threads, error: draw_launch_error });
    }
}

function start_sockets_yarn(socket) {
    window.yarn_websocket = socket;
    socket.on('initial_thread_list', socket_draw_available_thread_list);
    socket.on('thread_info', socket_draw_new_thread);
    socket.on('messages', socket_update_threads);
    socket.emit('load_threads', { token: websockets_token, user: yarn_current_user });
}

function draw_launch_error() {
    console.log("Error launching yarn");
}

function socket_draw_available_thread_list(data) {
    _draw_available_threads(JSON.parse(data));
}

function rest_draw_available_threads(data) {
    _draw_available_threads(data);
}

function _draw_available_threads(data) {
    var source = $("#available_threads").html();
    var template = Handlebars.compile(source);

    window.all_thread_data = {};
    for (var i = 0; i < data["threads"].length; i++) {
        var thread = data["threads"][i];
        window.all_thread_data[thread.id] = {
            name: thread.name,
            description: thread.description
        };
    }

    $("#available_thread_list").html(template({ threads: data["threads"] }));

    refresh_thread_tabs();

    var favs = data["favorites"];
    for (var i = 0; i < favs.length; i++) {
        pre_load_thread(favs[i]);
    }

    for (var i = 0; i < favs.length; i++) {
        load_thread(favs[i]);
    }
    refresh_thread_tabs();
}

function refresh_thread_tabs() {
    var source = $("#thread_menu").html();
    var template = Handlebars.compile(source);

    var template_data = { threads: [] };
    for (var thread_id in window.all_thread_data) {
        if (window.all_thread_data.hasOwnProperty(thread_id)) {
            template_data.threads.push({
                id: thread_id,
                name: window.all_thread_data[thread_id].name
            });
        }
    }

    $("#threads_list").html(template(template_data));
    
}

function handle_window_click(e) {
    var target = e.target;
    var classname = target.className;

    if (classname.indexOf("artifact_upload_interface") !== -1) {
        choose_file_to_upload(target.rel);
    }
    else if (classname.indexOf("cancel_upload_artifact") !== -1) {
        cancel_file_upload(target.rel);
    }
    else if (classname.indexOf("upload_artifact") !== -1) {
        upload_new_artifact(target.rel);
    }
    else if (classname.indexOf("private_chat") !== -1) {
        open_private_chat(target.rel, { "highlight": true });
    }
    else if (classname.indexOf("thread-history") !== -1) {
        show_thread_history(target.rel);
    }
    else if (classname.indexOf("close-history") !== -1) {
        close_thread_history(target.rel);
    }
    else if (classname.indexOf("create_new_thread_link") !== -1) {
        show_thread_creation_panel();
    }
    else if (classname.indexOf("cancel_new_thread_create") !== -1) {
        hide_thread_creation_panel();
    }
    else if (classname.indexOf("submit_new_thread") !== -1) {
        create_new_thread();
    }
    else if (classname.indexOf("close_thread_tab") !== -1) {
        close_thread(target.rel);
    }
    else if (classname.indexOf("open_thread") !== -1) {
        load_thread(target.rel, { highlight: true, save_preference: true });
    }
    else if (classname.indexOf("show_more_artifact") !== -1) {
        show_more_artifact(target);
    }
    else if (classname.indexOf("show_less_artifact") !== -1) {
        show_less_artifact(target);
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

    var json_ids = JSON.stringify(ids);
    if (window.use_websockets) {
        var socket = window.yarn_websocket;
        socket.emit('set_favorite_threads', {
            thread_ids: json_ids
        });
    }
    else {
        var csrf_value = $("input[name='csrfmiddlewaretoken']")[0].value;
        $.ajax('api/v1/set_fav_threads', {
            type: "POST",
            headers: {
                "X-CSRFToken": csrf_value
            },
            data: json_ids,
            dataType: 'text'
        });
    }
}

function show_thread_creation_panel() {
    $("#err_new_thread_name_required").hide();
    $("#err_new_thread_dupe").hide();
    $("#new_thread_name").val("");
    $("#new_thread_topic").val("");
    $("#new_thread_creation_panel").show();
}

function hide_thread_creation_panel() {
    $("#new_thread_creation_panel").hide();
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

function stash_person_data(person) {
    if (!window.all_person_data) {
        window.all_person_data = {};
    }

    window.all_person_data[person.login_name] = person;
}

$(window).on("blur", window_blur_event);
$(window).on("focus", window_focus_event);

$(window).on("click", handle_window_click);
start_period_updates();
