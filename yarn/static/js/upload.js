// Any files waiting for upload...
var thread_files = {};

function choose_file_to_upload(thread_id) {
    $("#artifact_upload_chooser_"+thread_id).click();
}

function handle_artifact_upload(files, thread_id) {
    var file = files[0];

    thread_files[thread_id] = file;

    var file_name = file.name;

    $("#file_upload_name_"+thread_id).text(file_name);
    $("#artifact_text_input_"+thread_id).hide();
    $("#upload_image_preview_"+thread_id).hide();
    $("#artifact_upload_preview_"+thread_id).show();

    if (file_name.match(/(\.png|\.jpg|\.gif)$/)) {

        var reader = new FileReader();
        reader.onload = function(e) {
            var data = e.target.result;
            if (data.match(/^data:image/)) {
                $("#upload_image_preview_"+thread_id).attr("src", e.target.result);
                $("#upload_image_preview_"+thread_id).show();
            }
        };
        reader.readAsDataURL(file);
    }
}

function cancel_file_upload(thread_id) {
    $("#artifact_upload_preview_"+thread_id).hide();
    $("#artifact_text_input_"+thread_id).show();
}

function upload_new_artifact(thread_id) {
    $("#artifact_upload_preview_"+thread_id).hide();
    $("#artifact_uploading_"+thread_id).show();

    var file = thread_files[thread_id];
    var reader = new FileReader();
    reader.onload = function(e) {
        var upload_data = {
            type: "file",
            name: file.name,
            content_type: file.type,
            file: window.btoa(e.target.result)
        };

        var csrf_value = $("input[name='csrfmiddlewaretoken']")[0].value;
        $.ajax('rest/v1/thread/'+thread_id, {
            type: "POST",
            headers: {
                "X-CSRFToken": csrf_value
            },
            data: JSON.stringify(upload_data),
            dataType: 'text',
            success: function() {
                $("#artifact_uploading_"+thread_id).hide();
                $("#artifact_text_input_"+thread_id).show();
            },
            error: function() {
                alert("Error uploading file :(");
            }
        });

    };

    reader.readAsBinaryString(file);
}

