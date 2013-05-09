
function format_text(str) {
    str = String(str);
    var clean_str = _html_encode(str);
    var w_newlines = replace_newlines(clean_str);
    var spaces = replace_leading_spaces(w_newlines);
    var w_bold = replace_with_bold(spaces);
    var w_em = replace_with_em(w_bold);
    var hrefs = replace_with_links(w_em);

    return hrefs;

    function replace_with_links(str) {
        var basic = str.replace(/(https?:\/\/.*?)($|[ \n])/g, "<a href='$1' target='_blank'>$1</a>$2");

        var removed_formatting = basic.replace(/('https?:\/\/.*?')/g, function(matches, in_href_url) {
            return in_href_url.replace(/<b>|<\/b>|<em>|<\/em>/g, '');
        });

        return removed_formatting;
    }

    function replace_with_bold(str) {
        return str.replace(/\*(.*?)\*/g, "<b>*$1*</b>");
    }

    function replace_with_em(str) {
        return str.replace(/\_(.*?)\_/g, "<em>_$1_</em>");
    }

    function replace_leading_spaces(str) {
        return str.replace(/(^|<br\/>)([ ]+)/g, function(matches, pre, spaces) {
            spaces = spaces.replace(/ /g, "&nbsp;");
            return [pre, spaces].join("");
        });
    }

    function replace_newlines(str) {
        return str.replace(/\n/g, "\n<br/>");
    }

    function _html_encode(str) {
        // Taken from mustache templates
        var entityMap = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#x27;",
        };

        return str.replace(/[&<>"']/g, function (s) {
          return entityMap[s];
        });

    }
}


function _test_formatter() {
    var tests = {
        "<b>": "&lt;b&gt;",
        "&amp;": "&amp;amp;",
        "    test    ": "&nbsp;&nbsp;&nbsp;&nbsp;test    ",
        "    test    \n    test2  ": "&nbsp;&nbsp;&nbsp;&nbsp;test    \n<br/>&nbsp;&nbsp;&nbsp;&nbsp;test2  ",
        "*ok*": "<b>*ok*</b>",
        "*ok* *ok2*": "<b>*ok*</b> <b>*ok2*</b>",
        "_ok_": "<em>_ok_</em>",
        "_ok_ _ok2_": "<em>_ok_</em> <em>_ok2_</em>",
        "http://google.com/?q=test&other=ok": "<a href='http://google.com/?q=test&amp;other=ok' target='_blank'>http://google.com/?q=test&amp;other=ok</a>",
        "https://google.com/?q=test&other=ok": "<a href='https://google.com/?q=test&amp;other=ok' target='_blank'>https://google.com/?q=test&amp;other=ok</a>",
        "http://google.com?q=test_1 http://google.com?q=test_2": "<a href='http://google.com?q=test_1' target='_blank'>http://google.com?q=test<em>_1</a> <a href='http://google.com?q=test_2' target='_blank'>http://google.com?q=test_</em>2</a>",
        "http://google.com\nok": "<a href='http://google.com' target='_blank'>http://google.com</a>\n<br/>ok",
        "http://www.google.com/?q='test": "<a href='http://www.google.com/?q=&#x27;test' target='_blank'>http://www.google.com/?q=&#x27;test</a>"
    };

    for (var key in tests) {
        var formatted = format_text(key);
        if (formatted != tests[key]) {
            console.log("Error formatting: ", key, " Got value: ", formatted);
        }
    }
}


// Keep this here, just to stay on top of things...
_test_formatter();

Handlebars.registerHelper('formatted_artifact', function(text) {
    return new Handlebars.SafeString(format_text(text));
});

