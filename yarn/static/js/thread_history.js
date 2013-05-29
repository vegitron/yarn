
function show_thread_history(thread_id) {
    $("#thread_live_"+thread_id).hide();
    $("#thread_history_"+thread_id).show();

    $.ajax('rest/v1/history/'+thread_id, {
        success: draw_history_calendar,
        error: show_history_calendar_error
    });
}

function date_to_test_string(date) {
    return [date.getFullYear(), date.getMonth(), date.getDate()].join("-");
}

function draw_history_calendar(data) {
    var active_dates = {};
    for (var i = 0; i < data.dates.length; i++) {
        active_dates[date_to_test_string(new Date(data.dates[i]))] = true;
    }

    var picker = $("#thread_calendar_"+data["thread_id"]).datepicker({
        beforeShowDay: function(date) {
            var test_date = date_to_test_string(date);
            var class_name = "";
            if (active_dates[test_date]) {
                class_name = "day_with_artifacts";
                return [true, class_name];
            }
            return [false, class_name];
        },
        onSelect: function(date) {
            var formatted_date = date.replace(/\//g, '-');
            $.ajax('rest/v1/history/'+data["thread_id"]+'/'+formatted_date, {
                success: draw_history_artifacts,
                error: show_history_artifacts_error
            });

        }
    });
    picker.show();
}

function draw_history_artifacts(data) {
    var artifact_data = render_artifacts(data.artifacts, "history");
    var rendered_artifacts = artifact_data.rendered_artifacts;

    var source = $("#artifact_history_display").html();
    var template = Handlebars.compile(source);

    var artifact_display = template({
        thread: data.thread,
        thread_id: data.thread.id,
        artifacts: rendered_artifacts
    });

    $("#thread_history_artifacts_"+data.thread.id).replaceWith(artifact_display);
}

function show_history_artifacts_error() {
}

function show_history_calendar_error() {
    // XXX
}

function close_thread_history(thread_id) {
    $("#thread_history_"+thread_id).hide();
    $("#thread_live_"+thread_id).show();
}

