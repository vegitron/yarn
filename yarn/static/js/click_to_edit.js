(function($) {
    $.fn.click_to_edit = function(options, arg) {
        if (options && typeof(options) == "string") {
            if (options == "stop_editing") {
                return stop_editing.apply(this, [arg]);
            }
        }
        var opts = $.extend( {
            onChange: defaultChangeHandler,
            onCancel: defaultCancelHandler
        }, options);

        return this.each(function() {
            initialize($(this), opts);
        });
    };

    function initialize(instance, opts) {
        if (instance.hasClass('click_to_edit')) {
            return;
        }
        instance.addClass('click_to_edit');
        instance.addClass('ce_editable');
        instance.on('click', handle_click);
        instance.data("options", opts);
    };

    function handle_click(ev) {
        var instance = $(this);
        if (!instance.hasClass('ce_editable')) {
            return;
        }
        instance.removeClass('ce_editable');

        var content_span = instance.find("span.content");

        var value = content_span.text();
        instance.data("initial_value", value);

        content_span.hide();

        $("<input type='text' class='ce_edit'/>").appendTo(instance);

        var input = instance.find("input.ce_edit");
        input.val(value);
        input.focus();
        input.select();

        input.on("blur", function(ev) {
            handle_blur(ev, instance);
        });

        input.on("keyup", function(ev) {
            handle_keyup(ev, instance);
        });
    }

    function handle_keyup(ev, instance) {
        if (ev.keyCode == 27) {
            instance.data("options").onCancel(instance);
            return;
        }
        else if (ev.keyCode == 13) {
            var value = instance.find("input.ce_edit").val();
            instance.data("options").onChange.call($(instance), value);
            return;
        }
    }

    function handle_blur(ev, instance) {
        var input = instance.find("input.ce_edit");

        var value = input.val();
        value = value.replace(/^\s*/, '');
        value = value.replace(/\s*$/, '');

        if (value == instance.data("initial_value")) {
            instance.data("options").onCancel(instance);
        }
        else {
            instance.data("options").onChange.call($(instance), value);
        }
    }

    function defaultCancelHandler(instance) {
        var input = instance.find("input.ce_edit");
        var content_span = instance.find("span.content");
        content_span.text(instance.data("initial_value"));
        input.remove();
        content_span.show();

        instance.addClass('ce_editable');
    }

    function defaultChangeHandler(instance, value) {
        $(instance).click_to_edit("stop_editing", value);
    }


    function stop_editing(content) {
        var content_span = this.find("span.content");
        content_span.text(content);

        var input = this.find("input.ce_edit");
        input.remove();
        content_span.show();

        this.addClass('ce_editable');
    }

}(jQuery));
