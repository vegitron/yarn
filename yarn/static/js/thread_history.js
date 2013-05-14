
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
        }
    });
    picker.show();
}

function show_history_calendar_error() {
    // XXX
}

function close_thread_history(thread_id) {
    $("#thread_history_"+thread_id).hide();
    $("#thread_live_"+thread_id).show();
}

