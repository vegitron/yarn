var open_threads = {};

var artifact_post_errors = [];

function load_thread_from_href(e) {
    load_thread(e.target.rel, { highlight: true, save_preference: true });
}

function load_thread(thread_id, args) {
    $.ajax('rest/v1/thread/'+thread_id, {
        success: function(data) {
            draw_new_thread(data, args);
        },
        error: show_thread_error
    });
}

function open_private_chat(person_id, args) {
    $.ajax('rest/v1/private/'+person_id, {
        success: function(data) {
            draw_new_thread(data, args);
        },
        error: show_thread_error
    });
}

function show_thread_error() {
}

function render_online_users(online_users) {
    var online_user_source = $("#online_user_display").html();
    var online_user_template = Handlebars.compile(online_user_source);

    return online_user_template({ online_users: online_users });
}

function render_artifacts(artifacts, id_addon) {
    var rendered_artifacts = [];
    var artifact_source = $("#artifact_display").html();
    var artifact_template = Handlebars.compile(artifact_source);

    var has_alert_text = false;
    for (var i = 0; i < artifacts.length; i++) {
        var artifact = artifacts[i];

        if ((artifact.type == "") ||
            (artifact.type == null) ||
            (artifact.type == "new_description") ||
            (artifact.type == "file")) {

            rendered_artifacts.push({ artifact: artifact_template({ artifact: artifact, id_addon: id_addon })});

            for (var term_index = 0; term_index < yarn_alert_terms.length; term_index++) {
                var term = yarn_alert_terms[term_index];
                if (!term.match(/[^a-z0-9]/)) {
                    if (artifact.description.match(term)) {
                        has_alert_text = true;
                    }
                }
            }
        }
        else {
            //console.log("Unknown type: ", artifact.type);
        }
    }

    return { rendered_artifacts: rendered_artifacts, has_alert_text: has_alert_text };

}

function pre_load_thread(thread_id) {
    var source = $("#preload_initial_thread_display").html();
    var template = Handlebars.compile(source);
    var initial_content = template({ thread_id: thread_id });


    var tab_source = $("#preload_thread_tab_display").html();
    var tab_template = Handlebars.compile(tab_source);
    var tab_content = tab_template({ thread_id: thread_id });

    $($.parseHTML(tab_content)).appendTo("#tab_list");
    $($.parseHTML(initial_content)).appendTo("#tabs");
}

function draw_new_thread(data, args) {
    var source = $("#initial_thread_display").html();
    var tab_source = $("#thread_tab_display").html();

    var template = Handlebars.compile(source);
    var tab_template = Handlebars.compile(tab_source);

    var artifact_data = render_artifacts(data.artifacts);
    var rendered_artifacts = artifact_data.rendered_artifacts;
    // has_alert_text not used here


    var rendered_users = render_online_users(data.online_users);

    var initial_content = template({
        thread: data.thread,
        thread_id: data.thread.id,
        topic: data.thread.description,
        artifacts: rendered_artifacts,
        online_users: rendered_users
    });

    var tab_content = tab_template({
        thread_id: data.thread.id,
        thread_name: data.thread.name,
        other_login: data.thread.login_name
    });

    var thread_id = data.thread.id;

    // Thread pre-loaded
    if ($("#thread_"+thread_id).length) {
        $("#thread_"+thread_id).replaceWith($.parseHTML(initial_content));
        $("#thread_tab_"+thread_id).replaceWith($.parseHTML(tab_content));
    }
    else {
        $($.parseHTML(tab_content)).appendTo("#tab_list");
        $($.parseHTML(initial_content)).appendTo("#tabs");
    }

    var container = $("#artifact_container_"+data.thread.id);
    container.scrollTop(container[0].scrollHeight);

    refresh_thread_tabs();

    if (args && args.highlight) {
        var index = $('#tabs a[href="#thread_'+data.thread.id+'"]').parent().index(); 
        $("#tabs").tabs("option", "active", index);
    }

    $(".thread-text-input-"+data.thread.id).on("keydown", handle_thread_input_keydown);

    open_threads[data.thread.id] = data.max_artifact_id;

    if (args && args.alert_on_load) {
        alert_thread(thread_id);
        set_alert_title();
    }

    if (args && args.save_preference) {
        save_thread_preference();
    }

    if (args && args.initial_message) {
        post_text_artifact(data.thread.id, args.initial_message);
    }
}

function handle_thread_input_keydown(e) {
    if (e.keyCode == 13) {
        var target = e.target;
        var matches = target.className.match(/[0-9]+$/);

        if (target.value != "") {
            post_text_artifact(matches[0], target.value);
        }
        e.preventDefault();
        target.value = "";
    }
}

function _post_text_artifact(thread_id, content, args) {
    if (args == null) {
        args = {};
    }

    var csrf_value = $("input[name='csrfmiddlewaretoken']")[0].value;
    var post_args = {
        type: "POST",
        headers: {
            "X-CSRFToken": csrf_value
        },
        data: JSON.stringify({ type: "text", value: content }),
        dataType: 'text',
        success: handle_successful_artifact_post,
        error: function() {
            handle_error_artifact_post(thread_id, content);
        }
    };

    if (args.success) {
        post_args.success = args.success;
    }

    if (args.error) {
        post_args.error = args.error;
    }

    $.ajax('rest/v1/thread/'+thread_id, post_args);

}

function _open_chat_by_pm(content) {
    var msg_matches = content.match(/^\s*\/pm\s+([\w]+)/);
    if (msg_matches) {
        var first_post_match = content.match(/^\s*\/pm\s+([\w]+)\s+(.*)$/);

        var args = {
            highlight: true
        };

        if (first_post_match) {
            var message = first_post_match[2];
            message = message.replace(/^[\s]+|[\s]+$/g, "");

            if (message.length) {
                args["initial_message"] = message;
            }
        }

        open_private_chat(msg_matches[1], args);
        return true;
    }
}

function post_text_artifact(thread_id, content) {
    if (_open_chat_by_pm(content)) {
        return;
    }

    // To prevent out of order messages...
    if (artifact_post_errors.length) {
        artifact_post_errors.push({
            thread_id: thread_id,
            content: content
        });
        return;
    }

    _post_text_artifact(thread_id, content, {
        success: handle_successful_artifact_post,
        error: function() {
            handle_error_artifact_post(thread_id, content);
        }
    });

}

function repost_text_artifact(thread_id, content) {
    _post_text_artifact(thread_id, content, {
        success: handle_successful_artifact_repost,
        error: error_artifact_post_retry_init
    });
}

function handle_successful_artifact_repost() {
    artifact_post_errors.shift();
    if (artifact_post_errors.length) {
        repost_next_artifact();
    }
    else {
        $("#error_posting_text").hide();
    }
}

function handle_successful_artifact_post() {
    $("#error_posting_text").hide();
}

function handle_error_artifact_post(thread_id, content) {
    window.artifact_post_errors.push({
        thread_id: thread_id,
        content: content
    });
    error_artifact_post_retry_init();
}

function error_artifact_post_retry_init() {
    if (!window.retry_post_timeout) {
        display_retry_post_timeout(5);
    }
}

function repost_next_artifact() {
    // Try to post them in basically the same order
    if (artifact_post_errors.length) {
        var new_attempt = artifact_post_errors[0];
        repost_text_artifact(new_attempt["thread_id"], new_attempt["content"]);
    }
}

function display_retry_post_timeout(time) {
    window.retry_post_timeout = null;
    $("#error_posting_text").show();
    $("#error_post_count").text(artifact_post_errors.length);
    $("#error_post_retry_time").text(time);

    if (time == 0) {
        repost_next_artifact();
    }
    else {
        window.retry_post_timeout = setTimeout(function() { display_retry_post_timeout(time-1); }, 1000);
    }
}

function start_period_updates() {
    if (!window.yarn_periodic) {
        periodic_thread_update();
    }
}

function stop_periodic_updates() {
    clearTimeout(window.yarn_periodic);
    window.yarn_periodic = null;
}

function periodic_thread_update() {
    var run_update = false;
    var threads_to_update = [];
    for (var key in open_threads) {
        if (open_threads.hasOwnProperty(key)) {
            run_update = true;
            threads_to_update.push([key, open_threads[key]].join(":"));
        }
    }

    if (run_update) {
        var url = ["rest/v1/update_threads/", threads_to_update.join(",")].join("");
        $.ajax(url, { success: update_threads, error: show_update_error});
    }

    else {
        window.yarn_periodic = setTimeout(periodic_thread_update, 5000);
    }
}

function update_threads(data) {
    $("#error_periodic").hide();
    var active_thread_id = -1;

    var thread_updates = data.updates;
    if (Object.keys(thread_updates).length) {
        var active_index =  $("#tabs").tabs("option", "active");
        var active_thread_el_id = $("#tab_list > li:nth-child("+(active_index+1)+")").prop("id");

        if (active_thread_el_id) {
            var matches = active_thread_el_id.match(/thread_tab_([0-9]+)/);
            if (matches) {
                active_thread_id = matches[1];
            }
        }
    }


    for (var thread_id in thread_updates) {
        var do_scroll = false;

        var thread_data = thread_updates[thread_id];

        var artifacts = thread_data.artifacts;

        for (var i = 0; i < artifacts.length; i++) {
            var artifact = artifacts[i];
            if (artifact.type == "new_description") {
                $(".thread_topic_"+thread_id).text(artifact.description);
            }
        }

        var artifact_data = render_artifacts(artifacts);
        var rendered_artifacts = artifact_data.rendered_artifacts;
        var has_alert_text = artifact_data.has_alert_text;

        if (rendered_artifacts.length) {
            var list = $("#yarn_artifact_list_"+thread_id);

            var container = $("#artifact_container_"+thread_id);
            var scroll_pos = container.scrollTop();
            var content_height = container.prop("scrollHeight");
            var display_height = container.prop("offsetHeight");
            var slop = 20;

            if (scroll_pos + display_height + slop >= content_height) {
                do_scroll = true;
            }

            for (var i = 0; i < rendered_artifacts.length; i++) {
                var rendered = rendered_artifacts[i];
                list.append(rendered.artifact);
            }

            if (thread_data.is_private) {
                has_alert_text = true;
            }

            if (do_scroll) {
                container.animate({ scrollTop: container[0].scrollHeight}, 1000);
            }

            if (thread_id != active_thread_id) {
                if (has_alert_text) {
                    alert_thread(thread_id);
                }
                else {
                    highlight_thread(thread_id);
                }
            }

            if (has_alert_text) {
                set_alert_title();
            }
            else {
                set_highlight_title();
            }
        }

        if (thread_data.online_users) {
            var rendered_users = render_online_users(thread_data.online_users);
            $("#online_user_list_"+thread_id).html(rendered_users);
        }

        open_threads[thread_id] = thread_data.max_artifact_id;

    }

    var new_private_chats = data.new_private_chats;
    for (var i = 0; i < new_private_chats.length; i++) {
        if (!open_threads[new_private_chats[i].thread_id]) {
            show_new_private_chat_alert(new_private_chats[i].login_name);
            open_private_chat(new_private_chats[i].login_name, {
                alert_on_load: true
            });
        }
    }

    window.yarn_periodic = setTimeout(periodic_thread_update, 2000);
}

function show_new_private_chat_alert(login_name) {
    if (window.new_alert_fadeout) {
        clearTimeout(window.new_alert_fadeout);
    }
    $("#new_private_chat_login_name").text(login_name);
    $("#new_private_chat_open").show();
    $("#messaging").show();

    window.new_alert_fadeout = setTimeout(function() {
        window.new_alert_fadeout = null;
        $("#new_private_chat_open").fadeOut({
            complete: function() {
                $("#new_private_chat_open").hide();
                $("#messaging").hide();
            }
        });
    }, 5000);
}

function show_update_error() {
    retry_countdown(5);
    $("#error_periodic").show();
    $("#error_contacting").show();
}

function retry_countdown(time) {
    $("#error_periodic_retry_time").text(time);
    if (time == 0) {
        periodic_thread_update();
    }
    else {
        setTimeout(function() { retry_countdown(time-1); }, 1000);
    }
}

function adjust_thread_scroll(artifact_id, thread_id) {
    var img = $("#artifact_img_"+artifact_id);
    var artifact = $("#artifact_"+artifact_id);

    var img_height = img.prop('height');
    var artifact_height = artifact.prop('scrollHeight');

    container = $("#artifact_container_"+thread_id);
    container.scrollTop(container.scrollTop() + (img_height));
}


function select_thread_tab_event(ev, ui) {
    ui.newTab.removeClass("notification");
    ui.newTab.removeClass("alert");
    var matches = ui.newTab[0].id.match(/thread_tab_([0-9]+)/);
    if (matches) {
        var container = $("#artifact_container_"+matches[1]);
        container.scrollTop(container[0].scrollHeight);
    }
}

function highlight_thread(thread_id) {
    if (!$("#thread_tab_"+thread_id).hasClass("alert")) {
        $("#thread_tab_"+thread_id).addClass("notification");
    }
}


function alert_thread(thread_id) {
    $("#thread_tab_"+thread_id).addClass("alert");
}

function create_new_thread() {

    var thread_name = $("#new_thread_name").val();
    var thread_topic = $("#new_thread_topic").val();

    thread_name = thread_name.replace(/^[\s]+|[\s]+$/g, "");
    thread_name = thread_name.replace(/[\s]+/g, " ");
    thread_topic = thread_topic.replace(/^[\s]+|[\s]+$/g, "");

    $("#err_new_thread_name_required").hide();
    $("#err_new_thread_dupe").hide();

    if (thread_name == "") {
        $("#err_new_thread_name_required").show();
        return;
    }

    var csrf_value = $("input[name='csrfmiddlewaretoken']")[0].value;
    $.ajax('rest/v1/threads', {
        type: "POST",
        headers: {
            "X-CSRFToken": csrf_value
        },
        success: new_thread_created,
        error: new_thread_error,
        data: JSON.stringify({ name: thread_name, topic: thread_topic }),
        dataType: 'text'
    });
}

function new_thread_created(response) {
    load_thread(response, { highlight: true, save_preference: true});
    hide_thread_creation_panel();
}

function new_thread_error(response) {
    if (response.status == 409) {
        $("#err_new_thread_dupe").show();
        return;
    }
}

