var open_threads = {};

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

function render_artifacts(artifacts, id_addon) {
    var rendered_artifacts = [];
    var artifact_source = $("#artifact_display").html();
    var artifact_template = Handlebars.compile(artifact_source);

    for (var i = 0; i < artifacts.length; i++) {
        var artifact = artifacts[i];
        rendered_artifacts.push({
            artifact: artifact_template({ artifact: artifact, id_addon: id_addon })
        });
    }

    return rendered_artifacts;

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
    var online_user_source = $("#online_user_display").html();

    var template = Handlebars.compile(source);
    var tab_template = Handlebars.compile(tab_source);
    var online_user_template = Handlebars.compile(online_user_source);

    var rendered_artifacts = render_artifacts(data.artifacts);

    var rendered_users = [];
    for (var i = 0; i < data.online_users.length; i++) {
        var user = data.online_users[i];
        rendered_users.push({
            user: online_user_template(user)
        });
    }

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

    if (args && args.save_preference) {
        save_thread_preference();
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

function post_text_artifact(thread_id, content) {
    var csrf_value = $("input[name='csrfmiddlewaretoken']")[0].value;
    $.ajax('rest/v1/thread/'+thread_id, {
        type: "POST",
        headers: {
            "X-CSRFToken": csrf_value
        },
        data: JSON.stringify({ type: "text", value: content }),
        dataType: 'text',
        success: handle_successful_artifact_post,
        error: handle_error_artifact_post
    });
}

function handle_successful_artifact_post() {
}

function handle_error_artifact_post() {
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
    for (var thread_id in data) {
        var do_scroll = false;

        var thread_data = data[thread_id];

        var artifacts = thread_data.artifacts;

        for (var i = 0; i < artifacts.length; i++) {
            var artifact = artifacts[i];
            if (artifact.type == "new_description") {
                $(".thread_topic_"+thread_id).text(artifact.description);
            }
        }

        var rendered_artifacts = render_artifacts(artifacts);

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

        if (do_scroll) {
            container.animate({ scrollTop: container[0].scrollHeight}, 1000);
        }

        open_threads[thread_id] = thread_data.max_artifact_id;
    }

    window.yarn_periodic = setTimeout(periodic_thread_update, 2000);
}

function show_update_error() {
    console.log("Oh no, error time");
    window.yarn_periodic = setTimeout(periodic_thread_update, 5000);
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
    var matches = ui.newTab[0].id.match(/thread_tab_([0-9]+)/);
    if (matches) {
        var container = $("#artifact_container_"+matches[1]);
        container.scrollTop(container[0].scrollHeight);
    }
}

