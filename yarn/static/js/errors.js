window.onerror = function(msg, url, line) {

    try {
        var csrf_value = $("input[name='csrfmiddlewaretoken']")[0].value;
        $.ajax('error', {
            type: "POST",
            headers: {
                "X-CSRFToken": csrf_value
            },
            data: JSON.stringify({ msg: msg, url: url, line: line }),
            dataType: 'text',
        });
    }
    catch (e) {
        // Not much to do here :(
    }
};

