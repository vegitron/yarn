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
    var artifact_source = $("#artifact_display").html();

    var template = Handlebars.compile(source);
    var tab_template = Handlebars.compile(tab_source);
    var artifact_template = Handlebars.compile(artifact_source);

    var rendered_artifacts = [];
    for (var i = 0; i < data.artifacts.length; i++) {
        var artifact = data.artifacts[i];
        rendered_artifacts.push({
            artifact: artifact_template(artifact)
        });
   }

    var initial_content = template({
        thread_id: data.thread.id,
        artifacts: rendered_artifacts
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

