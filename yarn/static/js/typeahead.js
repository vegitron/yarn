
function typeahead_data_source(raw_query) {
    var words = raw_query.split(" ");
    var query = words[words.length - 1];

    if (query.indexOf('#') == 0) {
        return _thread_name_data_source(query);
    }
    else if (query.indexOf('@') == 0) {
//        return _person_name_data_source(query);
    }

    return;
}

function _thread_name_data_source(query) {
    var name = query.substring(1);

    var return_ids = [];
    for (var thread_id in window.all_thread_data) {
        if (window.all_thread_data.hasOwnProperty(thread_id)) {
            if (window.all_thread_data[thread_id]["name"].indexOf(name) == 0) {
                return_ids.push("#"+thread_id);
            }
        }
    }

    return return_ids;
}

function _person_name_data_source(query) {
    return ["Person 1", "Person 2"];
}


function typeahead_matcher() {
    return true;
}

function typeahead_highlighter(item) {
    if (item.indexOf('#') == 0) {
        return _highlight_thread_name(item);
    }
    else if (item.indexOf('@') == 0) {
        return _highlight_person_name(item);
    }
    return item;
}

function _highlight_person_name(item) {
    var person_id = parseInt(item.substring(1));
}

function _highlight_thread_name(item) {
    var thread_id = parseInt(item.substring(1));

    var source = $("#thread_autocomplete").html();
    var template = Handlebars.compile(source);

    var thread_data = window.all_thread_data[thread_id];
    return template(thread_data);
}

function typeahead_updater(selected, value) {
    var replacement = '';
    if (selected.indexOf('#') == 0) {
        replacement = _update_with_thread_name(selected);
    }

    var value = this.$element.val();

    var trimmed = value.replace(/(^| )([^ ]+)$/, "$1"+replacement);

    return trimmed;
}

function _update_with_thread_name(selected, value) {
    var thread_id = parseInt(selected.substring(1));

    var thread_name = window.all_thread_data[thread_id].name;
    return "#"+thread_name;


    return trimmed;
}

