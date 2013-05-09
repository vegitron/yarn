Handlebars.registerHelper('if_eq', function(x, y, options) {
    if (String(x) === String(y)) {
        return options.fn(this);
    }
    else {
        return options.inverse(this);
    }
});

Handlebars.registerHelper("format_time", function(timestamp) {
    var ts = new Date(timestamp);
    var am_pm = 'am';
    if (ts.getHours() >= 12) {
        am_pm = 'pm';
    }
    var minutes = ts.getMinutes();
    if (minutes < 10) {
        minutes = "0" + minutes;
    }
    return [ts.getHours(), ":", minutes, ' ', am_pm].join("");
});

