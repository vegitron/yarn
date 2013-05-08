
function start_yarn() {
    $.ajax('rest/v1/threads', { success: draw_available_threads, error: draw_launch_error });
}

function draw_launch_error() {
    console.log("Error launching yarn");
}

function draw_available_threads(data) {
    var source = $("#available_threads").html();
    var template = Handlebars.compile(source);

    $("#available_thread_list").html(template({ threads: data }));
}

