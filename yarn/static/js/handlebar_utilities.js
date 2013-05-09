Handlebars.registerHelper('if_eq', function(x, y, options) {
    if (String(x) === String(y)) {
        return options.fn(this);
    }
    else {
        return options.inverse(this);
    }
});
