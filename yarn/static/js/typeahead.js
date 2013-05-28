
function typeahead_data_source(raw_query) {
    var words = raw_query.split(" ");
    var query = words[words.length - 1];

    if (query.indexOf('#') == 0) {
        return _thread_name_data_source(query);
    }
    else if (query.indexOf('@') == 0) {
        return _person_name_data_source(query);
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
    var name = query.substring(1);

    var return_ids = [];
    for (var login_name in window.all_person_data) {
        if (window.all_person_data.hasOwnProperty(login_name)) {
            if (login_name.indexOf(name) == 0) {
                return_ids.push("@"+login_name);
            }
        }
    }

    return return_ids;
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
    var person_id = item.substring(1);
    var source = $("#person_autocomplete").html();
    var template = Handlebars.compile(source);

    var person = window.all_person_data[person_id];
    return template(person);
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

    if (selected.indexOf('@') == 0) {
        replacement = _update_with_person_name(selected);
    }

    var value = this.$element.val();

    var trimmed = value.replace(/(^| )([^ ]+)$/, "$1"+replacement);

    return trimmed;
}

function _update_with_thread_name(selected) {
    var thread_id = parseInt(selected.substring(1));

    var thread_name = window.all_thread_data[thread_id].name;
    return "#"+thread_name+" ";
}

function _update_with_person_name(selected) {
    return selected+": ";
}


