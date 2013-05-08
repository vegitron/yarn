function load_thread_from_href(e) {
    load_thread(e.target.rel);
}

function load_thread(thread_id) {
    $.ajax('rest/v1/thread/'+thread_id, { success: draw_new_thread, error: show_thread_error});
}

function show_thread_error() {
}

function draw_new_thread(data) {
    var source = $("#initial_thread_display").html();
    var tab_source = $("#thread_tab_display").html();
    var template = Handlebars.compile(source);

    var tab_template = Handlebars.compile(tab_source);

    var initial_content = template({
        thread_id: data.thread.id,
        artifacts: data.artifacts
    });

    var tab_content = tab_template({
        thread_id: data.thread.id,
        thread_name: data.thread.name
    });

    $($.parseHTML(tab_content)).appendTo("#tab_list");
    $($.parseHTML(initial_content)).appendTo("#tabs");
    refresh_thread_tabs();
    $("#tabs").tabs("refresh");

}

