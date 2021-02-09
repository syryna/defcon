/* Helper functions */
function showLegend(){
    if ($('nav').length){
        $("#map_legend").css("top", "145px");
    } else {
        $("#map_legend").css("top", "90px");
    }
    $("#map_legend").stop().animate({left: '0px'});
    $('#toggle_legend').removeClass("btn-outline-danger");
    $('#toggle_legend').addClass("btn-outline-success");
    user_map_settings.show_legend = 1;
}

function hideLegend(){
    if ($('nav').length){
        $("#map_legend").css("top", "145px");
    } else {
        $("#map_legend").css("top", "90px");
    }
    $("#map_legend").stop().animate({left: '-300px'});
    $('#toggle_legend').removeClass("btn-outline-success");
    $('#toggle_legend').addClass("btn-outline-danger");
    user_map_settings.show_legend = 0;
}

function showMessageBox(){
    $("#message_box").stop().animate({bottom: '0px'});
    //$("#message_toggle").stop().animate({bottom: '200px'}); 
    $('#toggle_message_box').removeClass("btn-outline-danger");
    $('#toggle_message_box').addClass("btn-outline-success");
    user_map_settings.show_message_box = 1;
}

function hideMessageBox(){
    $("#message_box").stop().animate({bottom: '-200px'});
    //$("#message_toggle").stop().animate({bottom: '0px'}); 
    $('#toggle_message_box').removeClass("btn-outline-success");
    $('#toggle_message_box').addClass("btn-outline-danger");
    user_map_settings.show_message_box = 0;
}

function showTooltips(){
    $('#toggle_tooltips').removeClass("btn-outline-danger");
    $('#toggle_tooltips').addClass("btn-outline-success");
    user_map_settings.show_tooltips = 1;
    updateData();
}

function hideTooltips(){
    $('#toggle_tooltips').removeClass("btn-outline-success");
    $('#toggle_tooltips').addClass("btn-outline-danger");
    user_map_settings.show_tooltips = 0;
    updateData();
}

function showTrails(){
    $('#toggle_trails').removeClass("btn-outline-danger");
    $('#toggle_trails').addClass("btn-outline-success");
    user_map_settings.show_trails = 1;
    d3.selectAll('[data-node-type="alert_path"]').style("stroke-opacity", 1.0);
}

function hideTrails(){
    $('#toggle_trails').removeClass("btn-outline-success");
    $('#toggle_trails').addClass("btn-outline-danger");
    user_map_settings.show_trails = 0;
    d3.selectAll('[data-node-type="alert_path"]').style("stroke-opacity", 0.0);
}

function showPopover(element){
    element.popover('show')
}

function hidePopover(element){
    element.popover('hide');
}

function createDrag(drag_id){
    drag_template = $('#drag_item');
    var content = $('div#drag_part[data-msg-id="' + drag_id + '"]').html();
    drag_template.removeClass("invisible");
    drag_template.html(content);
}

function removeDrag(){
    drag_template = $('#drag_item');
    move_alert = [];
    drag_template.addClass("invisible");
    drag_template.html();
    drag_template = null;
}

function addSelector(sys_id, solar_sys_x, solar_sys_y){
    var solar_sys = d3.selectAll('g[data-node-id="' + sys_id + '"]')
        .insert('circle', ":first-child")
        .attr("data-type", "selector")
        .attr("cx", solar_sys_x)
        .attr("cy", solar_sys_y)
        .attr("r", 22)
        .style("fill-opacity", 0.0)
        .style("stroke", "#d10f0f") 
        .style("stroke-width", 4);
}

function toggleLabels(button){
    if (user_map_settings.show_label == 1) {
        d3.selectAll('[data-node-type="solar_systems"] > g > rect').style("fill-opacity", 0.0);
        d3.selectAll('[data-node-type="solar_systems"] > g > rect').style("stroke-opacity", 0.0);
        d3.selectAll('[data-node-type="solar_systems"] > g > text').style("fill-opacity", 0.0);
        button.removeClass("btn-outline-success");
        button.addClass("btn-outline-danger");
        user_map_settings.show_label = 0;
    } else {
        d3.selectAll('[data-node-type="solar_systems"] > g > rect').style("fill-opacity", 0.5);
        d3.selectAll('[data-node-type="solar_systems"] > g > rect').style("stroke-opacity", 1.0);
        d3.selectAll('[data-node-type="solar_systems"] > g > text').style("fill-opacity", 0.7);
        button.removeClass("btn-outline-danger");
        button.addClass("btn-outline-success");
        user_map_settings.show_label = 1;
    }
}

function refreshTooltips(node_id){
    $('circle[data-node-id="' + node_id + '"]').tooltip('hide');
    //if (user_map_settings.show_tooltips == 0) {
        $('circle[data-node-id="' + node_id + '"]').tooltip('show');
      
    //}
}

function createPopoverHeader(element){
    const node_id = element.attr("data-node-id");
    const node_name = element.attr("data-node-name");
    const node_sec = parseFloat(element.attr("data-node-sec")).toFixed(2);
    var content = '';
    if (node_sec > 0.4){
        content = '<div class="d-flex justify-content-center"><span class="high-sec"><strong>&nbsp;' + node_name + ' (' + node_sec + ')</strong></span></div><div class="d-flex justify-content-center"><a data-id="open_report" class="btn btn-outline-danger btn-sm" style="font-size:10px" href="#" role="button" data-toggle="tooltip" data-placement="bottom" title="Enemy">Report: Enemy</a><a data-id="report_comment" class="btn btn-outline-secondary btn-sm" style="font-size:10px" href="#" role="button" data-toggle="tooltip" data-placement="bottom" title="Add Comment">Add Comment</a><a data-id="green_report" class="btn btn-outline-success btn-sm" style="font-size:10px" href="#" role="button" data-toggle="tooltip" data-placement="bottom" title="Report: Is Save!">Report: Is Save</a></div>'; 
    }
    if (node_sec <= 0.4){
        content = '<div class="d-flex justify-content-center"><span class="low-sec"><strong>&nbsp;' + node_name + ' (' + node_sec + ')</strong></span></div><div class="d-flex justify-content-center"><a data-id="open_report" class="btn btn-outline-danger btn-sm" style="font-size:10px" href="#" role="button" data-toggle="tooltip" data-placement="bottom" title="Enemy">Report: Enemy</a><a data-id="report_comment" class="btn btn-outline-secondary btn-sm" style="font-size:10px" href="#" role="button" data-toggle="tooltip" data-placement="bottom" title="Add Comment">Add Comment</a><a data-id="green_report" class="btn btn-outline-success btn-sm" style="font-size:10px" href="#" role="button" data-toggle="tooltip" data-placement="bottom" title="Report: Is Save!">Report: Is Save</a></div>'; 
    }
    if (node_sec < 0.0){
        content = '<div class="d-flex justify-content-center"><span class="null-sec"><strong>&nbsp;' + node_name + ' (' + node_sec + ')</strong></span></div><div class="d-flex justify-content-center"><a data-id="open_report" class="btn btn-outline-danger btn-sm" style="font-size:10px" href="#" role="button" data-toggle="tooltip" data-placement="bottom" title="Enemy">Report: Enemy</a><a data-id="report_comment" class="btn btn-outline-secondary btn-sm" style="font-size:10px" href="#" role="button" data-toggle="tooltip" data-placement="bottom" title="Add Comment">Add Comment</a><a data-id="green_report" class="btn btn-outline-success btn-sm" style="font-size:10px" href="#" role="button" data-toggle="tooltip" data-placement="bottom" title="Report: Is Save!">Report: Is Save</a></div>'; 
    }
    return content;
}

function fillSidebar(sys_id, sys_name, sys_sec){
    $("#report_systemname").html("System: " + sys_name + " (" + sys_sec + ")"); 
    if (sys_sec <= 1.0 && sys_sec >= 0.5){
        $("#report_systemname").addClass("high-sec"); 
    }
    if (sys_sec <= 0.4 && sys_sec >= 0.0){
        $("#report_systemname").addClass("low-sec"); 
    }
    if (sys_sec < 0.0){
        $("#report_systemname").addClass("null-sec"); 
    }                                  
    $("#report_systemname").attr("data-node-id", sys_id);
    $("#report_systemname").attr("data-node-name", sys_name);
}

function fillPopover(msg){
    $('#drag_part').attr("data-msg-id", function(){
        return msg._id;
    });
    var avatar = '';
    if (msg.message.avatar == ''){
        avatar = '<img src="https://cdn.discordapp.com/embed/avatars/0.png" width="20" height="20" class="rounded-circle" loading="lazy" data-toggle="tooltip" data-placement="bottom" title="' + msg.message.username + '"> ' + msg.message.username + '&nbsp;' + stars(msg.message.stars);
    } else {
        avatar = '<img src="https://cdn.discordapp.com/avatars/' + msg.message.discordId + '/' + msg.message.avatar + '.png" width="20" height="20" class="rounded-circle" loading="lazy" data-toggle="tooltip" data-placement="bottom" title="' + msg.message.username + '"> ' + msg.message.username + '&nbsp;' + stars(msg.message.stars);
    }
    if(msg.message.type == "enemy"){
        $('#pop_pic').html(avatar);
        $('#pop_time').html('(' + convertDateTime(msg.dateChanged) + ')');
        $('#pop_threat').html(function(){
            var content = '';
            if (msg.message.gatecamp == true) {
                content = content + '<span class="text-danger font-weight-bolder">!!! </span><img src="/media/stargate.png"> ';
            }
            if (msg.message.stationcamp == true) {
                content = content + '<span class="text-danger font-weight-bolder">!!! </span><img src="/media/station.png"> ';
            }
            if (msg.message.bubble == true) {
                content = content + '<span class="text-danger font-weight-bolder">!!! </span><img src="/media/bubble.png"> ';
            }
            return content;
        });     
        $('#pop_ships').html(function(){
            var content = '';
            if (msg.message.shiptype.u > 0) {
                content = content + '<div class="ml-2"><span class="text-danger font-weight-bolder">' + msg.message.shiptype.u + 'x</span><strong> ?</strong></div>';
            }
            if (msg.message.shiptype.f > 0) {
                content = content + '<div class="ml-2"><span class="text-danger font-weight-bolder">' + msg.message.shiptype.f + 'x</span><img src="/media/frigate.png"></div>';
            }
            if (msg.message.shiptype.d > 0) {
                content = content + '<div class="ml-2"><span class="text-danger font-weight-bolder">' + msg.message.shiptype.d + 'x</span><img src="/media/destroyer.png"></div>';
            }
            if (msg.message.shiptype.c > 0) {
                content = content + '<div class="ml-2"><span class="text-danger font-weight-bolder">' + msg.message.shiptype.c + 'x</span><img src="/media/cruiser.png"></div>';
            }
            if (msg.message.shiptype.bc > 0) {
                content = content + '<div class="ml-2"><span class="text-danger font-weight-bolder">' + msg.message.shiptype.bc + 'x</span><img src="/media/battlecruiser.png"></div>';
            }
            if (msg.message.shiptype.bs > 0) {
                content = content + '<div class="ml-2"><span class="text-danger font-weight-bolder">' + msg.message.shiptype.bs + 'x</span><img src="/media/battleship.png"></div>';
            }
            if (msg.message.shiptype.i > 0) {
                content = content + '<div class="ml-2"><span class="text-danger font-weight-bolder">' + msg.message.shiptype.i + 'x</span><img src="/media/miningbarge.png"></div>';
            }
            return content;
        });
        $('#pop_buttons').html(function(){
            var content = '';
            content = content + '<a data-id="delete_report" data-msg-id="' + msg._id + '" data-node-id="' + msg.message.id + '" class="btn btn-outline-danger btn-sm" style="font-size:10px" href="#" role="button" data-toggle="tooltip" data-placement="bottom" title="Archive Report"><span class="fas fa-trash-alt" aria-hidden="true"> Archive</span></a>';
            content = content + '<a data-id="edit_report" data-msg-id="' + msg._id + '" data-node-id="' + msg.message.id + '" class="btn btn-outline-warning btn-sm" style="font-size:10px" href="#" role="button" data-toggle="tooltip" data-placement="bottom" title="Edit Report"><span class="fas fa-edit" aria-hidden="true"> Edit</span></a>';
            content = content + '<a data-id="move_report" data-msg-id="' + msg._id + '" data-node-id="' + msg.message.id + '" class="btn btn-outline-warning btn-sm" style="font-size:10px" href="#" role="button" data-toggle="tooltip" data-placement="bottom" title="Move Report"><span class="fas fa-expand-arrows-alt" aria-hidden="true"> Move</span></a>';
            content = content + '<a data-id="confirm_report" data-msg-id="' + msg._id + '" data-node-id="' + msg.message.id + '" class="btn btn-outline-success btn-sm" style="font-size:10px" href="#" role="button" data-toggle="tooltip" data-placement="bottom" title="Confirm Report"><span class="fas fa-user-check" aria-hidden="true"> Confirm</span></a>';
            return content;
        });
        $('#pop_location').html(function(){
            if (msg.message.loc.length > 0) {
                return '<span class="text-warning font-weight-bolder">@: <span class="text-white font-weight-normal">' + msg.message.loc + '</span></span> ';
            } else {
                return null;
            }
        });
        $('#pop_comment').html(function(){
            if (msg.message.comment.length > 0) {
                return '<span class="text-warning font-weight-bolder">txt: <span class="text-white font-weight-normal">' + msg.message.comment + '</span></span> ';
            } else {
                return null;
            }
        });
    }
    if(msg.message.type == "green"){
        $('#pop_pic').html(avatar);
        $('#pop_time').html('(' + convertDateTime(msg.dateChanged) + ')');
        $('#pop_threat').html('');     
        $('#pop_ships').html('');
        $('#pop_buttons').html(function(){
            var content = '';
            content = content + '<a data-id="delete_report" data-msg-id="' + msg._id + '" data-node-id="' + msg.message.id + '" class="btn btn-outline-danger btn-sm" style="font-size:10px" href="#" role="button" data-toggle="tooltip" data-placement="bottom" title="Archive Report"><span class="fas fa-trash-alt" aria-hidden="true"> Archive</span></a>';
            content = content + '<a data-id="confirm_report" data-msg-id="' + msg._id + '" data-node-id="' + msg.message.id + '" class="btn btn-outline-secondary btn-sm" style="font-size:10px" href="#" role="button" data-toggle="tooltip" data-placement="bottom" title="Confirm Report"><span class="fas fa-user-check" aria-hidden="true"> Confirm</span></a>';
            return content;
        });
        $('#pop_location').html('');
        $('#pop_comment').html('<span class="text-warning font-weight-bolder">txt: <span class="text-success font-weight-normal">System <span class="text-danger font-weight-bolder">seems</span> to be save.</span></span> ');
    }
    return $('#popover_content').html();
}

function updateData(){
    const unique_id = new Set(alert_data.map(item => item.message.id));
    for (id of unique_id){
        const alerts_for_id = alert_data.filter(item => item.message.id === id)
        content = createPopoverHeader($('circle[data-node-id="' + id + '"]'));  
        for (j in alerts_for_id){                  
            const sum_number = alert_data.filter(item => item.message.id === id).reduce((sum, result) => sum + result.message.number, 0);
            if (alerts_for_id[j].message.type == 'enemy'){
                $('circle[data-node-id="' + id + '"]').css("fill", "#d10f0f");
                $('path[data-node-id="' + id + '"]').css("fill","#801d1d");
            }
            if (alerts_for_id[j].message.type == 'green'){
                $('circle[data-node-id="' + id + '"]').css("fill", "#00ff00");
                $('path[data-node-id="' + id + '"]').css("fill","#1d801d");  
            }
            const latest_date = alert_data.filter(item => item.message.id === id).sort((a,b) => new Date(b.dateChanged).getTime() - new Date(a.dateChanged).getTime())[0];
            var title = '<span class="text-danger font-weight-bolder">' + sum_number +'</span><span style="font-size: 10px"> (' + convertDateTime(latest_date.dateChanged) +')</span>';
            $('circle[data-node-id="' + id + '"]').attr("data-original-title", title);
            if (user_map_settings.show_tooltips == 1){
                $('circle[data-node-id="' + id + '"]').tooltip('show');
            } else {
                $('circle[data-node-id="' + id + '"]').tooltip('show');
                $('circle[data-node-id="' + id + '"]').tooltip('hide');
            }
            content = content + fillPopover(alerts_for_id[j]);
            $('circle[data-node-id="' + id + '"]').attr("data-content", content);
        }
    }    
    // follow path of alert
    d3.selectAll('path[data-node-type="alert_path"]').remove();
    //var color = d3.scaleOrdinal(d3.schemeCategory10);                              // http://bl.ocks.org/emmasaunders/f4902478bcfa411c77a412c02087bed4 
    var color = ['#B71C1C', '#F57F17', '#33691E', '#880E4F', '#1A237E', '#B71C1C', '#F57F17', '#33691E', '#880E4F', '#1A237E', '#B71C1C', '#F57F17', '#33691E', '#880E4F', '#1A237E', '#B71C1C', '#F57F17', '#33691E', '#880E4F', '#1A237E'];                    // https://materialuicolors.co/?ref=uxprocc
    for (i in alert_data){
        const id = (alert_data[i].message.id);
        const alerts_for_id = alert_data.filter(item => item.message.id === id)
        for (j in alerts_for_id){
            const predecessors = [];
            const predecessors_id = alerts_for_id[j].message.predecessors.slice(-5); // limit to last 5 entries
            for (pre_id in predecessors_id) {
                const id = (predecessors_id[pre_id]);
                const x_pos = $('circle[data-node-id="' + id + '"]').attr("cx");
                const y_pos = $('circle[data-node-id="' + id + '"]').attr("cy");
                predecessors.push([x_pos,y_pos]);
            }
            const x_pos = $('circle[data-node-id="' + id + '"]').attr("cx");
            const y_pos = $('circle[data-node-id="' + id + '"]').attr("cy");
            predecessors.push([x_pos,y_pos]);

            var lineGenerator = d3.line()
	            .curve(d3.curveCardinal.tension(0));                               // http://bl.ocks.org/d3indepth/b6d4845973089bc1012dec1674d3aff8 + https://bl.ocks.org/d3indepth/64be9fc39a92ef074034e9a8fb29dcce + http://jsfiddle.net/maxl/mNmYH/2/ 
            var pathData = lineGenerator(predecessors);

            const container = d3.select('g[data-node-type="alert_flow"');
            container.append('path')
                .attr("data-node-id", alerts_for_id[j]._id)
                .attr("data-node-type", "alert_path")
                .attr('d', pathData)
                .style("stroke", color[i])
                .style("stroke-width", 4)
                .style("fill-opacity", 0.0); 
            
        }
    }
}




function resetForm($form) {                                                                 
    $form.find('input[type="number"], input:text, input:password, input:file, select, textarea').val(0);
    $('#report_location').val('');
    $('#report_comment').val('');
    $form.find('input:radio, input:checkbox')
        .prop('checked',false).prop('selected',false);
    $("#report_send").attr("data_type", "save");
    $("#report_send").attr("data-msg-id", "");
}

function resetUI(){
    $('circle[data-node-type="solar_system"]').popover('hide');
    $('#report_enemy_modal').modal('hide'); 
    hideLegend();
    $("#report_systemname").removeClass();
    $('[data-type="selector"]').remove();
    resetForm($('#report'));
}









function convertDateTime(datetime){
    const DateTime = luxon.DateTime;
    const changed =  DateTime.fromISO(datetime).minus({ seconds: 10 }).toRelative({ unit: "minutes", locale: "en" });
    const changed_small = changed.split(" ");
    const changed_final = changed_small[0] + "m " + changed_small[2];
    return changed_final;
}



function updateMessageBox(alert_act_data){
    $('#message_box').html('');
    for (i in alert_act_data){
        var action = '';
        switch (alert_act_data[i].action){
            case "CREATED":
                action = '<span class="high-sec">[ADD]</span>';
                break;
            case "EDITED":
                action = '<span class="low-sec">[EDIT]</span>';
                break;
            case "ARCHIEVED":
                action = '<span class="null-sec">[ARCH]</span>';
                break;
            case "MOVED":
                action = '<span class="low-sec">[MOVE]</span>';
                break;
            case "CONFIRMED":
                action = '<span class="high-sec">[CONF]</span>';
                break;
        }
        const ago = convertDateTime(alert_act_data[i].date);
        const system = '<span class="friendly">' + alert_act_data[i].msg.message.system + '</span>';
        function ships(msg){
            var content = '';
            if (msg.message.type == "enemy"){
                if (msg.message.shiptype.u > 0) {
                    content += '<span class="text-danger">' + msg.message.shiptype.u + " unknown </span>";
                }
                if (msg.message.shiptype.f > 0) {
                    content += '<span class="text-danger">' + msg.message.shiptype.f + " frigate </span>";
                }
                if (msg.message.shiptype.d > 0) {
                    content += '<span class="text-danger">' + msg.message.shiptype.d + " destroyer </span>";
                }
                if (msg.message.shiptype.c > 0) {
                    content += '<span class="text-danger">' + msg.message.shiptype.c + " cruiser </span>";
                }
                if (msg.message.shiptype.bc > 0) {
                    content += '<span class="text-danger">' + msg.message.shiptype.bc + " BC </span>";
                }
                if (msg.message.shiptype.bs > 0) {
                    content += '<span class="text-danger">' + msg.message.shiptype.bs + " BS </span>";
                }
                if (msg.message.shiptype.i > 0) {
                    content += '<span class="text-danger">' + msg.message.shiptype.i + " industrial </span>";
                }
            }
            if (msg.message.type == "green"){
                content += '<span class="text-success">System >seems< to be save </span>';
            }
            return content;
        };
        const username = alert_act_data[i].username;
        var inactive = '';
        if(alert_act_data[i].msg.active == false){
            inactive = '<span> [archieved]</span>';
        }
        const text  = '<div class="row" style="font-size:10px">'
                    + '<div class="col pr-1 pl-1">'
                    + ago
                    + ' - '
                    + system
                    + ' : '
                    + ships(alert_act_data[i].msg)
                    + action
                    + ' '
                    + ' by '
                    + username                       
                    + inactive
                    + '</div></div>';
        $('#message_box').prepend(text);
    }
}

function correctSystem(direction){
    x = d3.selectAll('circle[data-node-id="' + last_clicked_id + '"]').attr("cx");
    y = d3.selectAll('circle[data-node-id="' + last_clicked_id + '"]').attr("cy");
    x_b = d3.select('[data-node-type=background]').attr('data-x-b');
    x_m = d3.select('[data-node-type=background]').attr('data-x-m');
    y_b = d3.select('[data-node-type=background]').attr('data-y-b');
    y_m = d3.select('[data-node-type=background]').attr('data-y-m');
    last_clicked_sys = {
        sys_id: last_clicked_id,
        x: x,
        y: y,
        x_b: x_b,
        x_m: x_m,
        y_b: y_b,
        y_m: y_m
    };
    if (direction == "left"){
        x_old = d3.selectAll('circle[data-node-id="' + last_clicked_id + '"]').attr("cx");
        d3.selectAll('circle[data-node-id="' + last_clicked_id + '"]').attr("cx", parseFloat(x_old) - 5);
    }
    if (direction == "right"){
        x_old = d3.selectAll('circle[data-node-id="' + last_clicked_id + '"]').attr("cx");
        d3.selectAll('circle[data-node-id="' + last_clicked_id + '"]').attr("cx", parseFloat(x_old) + 5);
    }
    if (direction == "up"){
        y_old = d3.selectAll('circle[data-node-id="' + last_clicked_id + '"]').attr("cy");
        d3.selectAll('circle[data-node-id="' + last_clicked_id + '"]').attr("cy", parseFloat(y_old) - 5);
    }
    if (direction == "down"){
        y_old = d3.selectAll('circle[data-node-id="' + last_clicked_id + '"]').attr("cy");
        d3.selectAll('circle[data-node-id="' + last_clicked_id + '"]').attr("cy", parseFloat(y_old) + 5);
    }       
}

function getRegionNameFromId(id){
    const region_found = sys_reg_data.find(function (data) {
        if (data.region_id == id){
            return data.region_name;
        } 
    });
    return region_found.region_name;
}

//Values calculated for the buttons to do +1 +10 or -1 -10 and store in the coresponding fields
function changeValue(id, operator, value){
    if (operator == "sub"){
        current_value = parseInt(document.getElementById(id).value);
        if (isNaN(current_value)){
            new_value = 0 - parseInt(value);
            if (new_value > 0){
                document.getElementById(id).value = parseInt(new_value);
            } else {
                document.getElementById(id).value = 0;
            }
        } else {
            new_value = current_value - parseInt(value);
            if (new_value > 0){
                document.getElementById(id).value = parseInt(new_value);
            } else {
                document.getElementById(id).value = 0;
            }
        }
    }
    if (operator == "add"){
        current_value = parseInt(document.getElementById(id).value);
        if (isNaN(current_value)){
            new_value = 0 + parseInt(value);
            document.getElementById(id).value = parseInt(new_value);
        } else {
            new_value = current_value + parseInt(value);
            document.getElementById(id).value = parseInt(new_value);
        }
    }    
}

function stars(star_amount){
    content = '';
    if (star_amount >= 0){
        content =           '<span class="far fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="far fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="far fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="far fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="far fa-star low-sec" aria-hidden="true"></span>';
    }
    if (star_amount > 10){
        content =           '<span class="fas fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="far fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="far fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="far fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="far fa-star low-sec" aria-hidden="true"></span>';
    }
    if (star_amount > 50){
        content =           '<span class="fas fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="fas fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="far fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="far fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="far fa-star low-sec" aria-hidden="true"></span>';
    }
    if (star_amount > 100){
        content =           '<span class="fas fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="fas fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="fas fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="far fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="far fa-star low-sec" aria-hidden="true"></span>';
    }
    if (star_amount > 250){
        content =           '<span class="fas fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="fas fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="fas fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="fas fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="far fa-star low-sec" aria-hidden="true"></span>';
    }
    if (star_amount > 500){
        content =           '<span class="fas fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="fas fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="fas fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="fas fa-star low-sec" aria-hidden="true"></span>';
        content = content + '<span class="fas fa-star low-sec" aria-hidden="true"></span>';
    }
    return content;
}