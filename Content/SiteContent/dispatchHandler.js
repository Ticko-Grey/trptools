let dispatchTracker = {}
let loadeddispatchstring = ""

const Ajv = window.ajv7
const ajv = new Ajv();

const routecolors = {
    "6" : "#d5a55d",
    "9" : "#64ce7b",
    "10" : "#bbce64",
    "14" : "#6e6ec4",
    "16" : "#c86a6a"
}

const schema = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "Id": { "type": "integer" },
            "OwnerId": { "type": "integer" },
            "Name": { "type": "string" },
            "Depot": { "type": "string" }
        },
        "required": ["Id", "OwnerId", "Name", "Depot"]
    }
}

const validate = ajv.compile(schema);

function appendEntry(numindex) {
    const number = dispatchTracker["E_" + numindex].Id
    const info = dispatchTracker["E_" + numindex]

    // Create entry parent
    const entry = $('<tr>', {
        id: number,
    }).appendTo('#table');

    if (info.dead == true) {
        entry.css("background-color","#E37979");
    }

    // Set Vehicle ID
    $('<td>', {
        class: "number",
        text: number,
    }).appendTo(entry);

    // Set Owner Name
    let ownerName = $('<td>', {
        text: "Loading...",
    })

    ownerName.appendTo(entry);

    if (!info.username) {
        $.ajax({url: "/proxy/name?id="+info.OwnerId, success: function(result){
            ownerName.html(result.data);
            info.username = result.data
        }});
    } else {
        ownerName.html(info.username)
    }

    // load route (if it exists)

    let route
    if (!info.route) {
        route = " - "
    } else {
        route = info.route
    }
    const routeobj = $('<td>', {
        text: route,
        class: "route",
    }).appendTo(entry);

    // Manage checkbox

    let checkbox = $('<td>', {
        html: '<input type="checkbox">',
    })
    checkbox.appendTo(entry);

    if (info.assigned == true) {
        checkbox.find(":first-child").prop("checked", true)
    }

    checkbox.find(":first-child").change(function () {
        if ($(this).is(":checked")) {
            info.assigned = true
        } else {
            info.assigned = false
        }
    });

    const buttonholder = $('<td>', {
        class: 'buttonholder',
    }).appendTo(entry);

    // Add buttons
    $('<button>', {
        class: 'inputbutton solvebutton',
        text: 'Solve',
        style: 'background-color: #4CAF50;',
        click: function() {
            const solvedroute = autoSolve(info)

            modifyEntry(number, {
                type : 'route', 
                data : solvedroute
            })
        }
    }).appendTo(buttonholder);

    $('<button>', {
        class: 'inputbutton',
        text: 'Delete',
        style: 'background-color: #802c2c;',
        click: function() {
            modifyEntry(number, {type: 'delete'})
        }
    }).appendTo(buttonholder);

    $('<button>', {
        class: 'inputbutton',
        text: 'Edit',
        style: 'background-color: #81693d;',
        click: function() { 
            console.log(number)
            showCustom({
                title: "Apply edits for vehicle " + number,
                description: "",
                input: [
                    {title: "Route", id: "prompt-route", focus: true},
                ],
                buttons: [
                    {text: "Cancel", color: "#802c2c", function: closewindow},
                    {text: "Apply", color: "#4CAF50", function: apply}
                ]
            })

            $('#prompt-route').val(info.route)

            function apply() {
                modifyEntry(number, {type: 'route', data: $('#prompt-route').val()})
                closewindow()
            }
        }
    }).appendTo(buttonholder);

    $('<button>', {
        class: 'inputbutton',
        text: 'Information',
        style: 'background-color: #326da8;',
        click: function() {
            showCustom({
                title: "Vehicle information for " + number + ":",
                description: `Owner: ${info.username} <br> Depot: ${info.Depot} <br> Vehicle: ${info.Name}`,
                buttons: [
                    {text: "Close", color: "#4CAF50", function: closewindow}
                ]
            })
        }
    }).appendTo(buttonholder);
}

function createEntry(information) {
    if (dispatchTracker["E_" + information.Id]) return
    dispatchTracker["E_" + information.Id] = information
    appendEntry(information.Id)
}

function modifyEntry(number, modifications) {
    switch (modifications.type) {
        case 'route':
            // internal updates
            const routeobj = $("#" + number).find('.route')
            dispatchTracker["E_" + number].route = modifications.data
            // visual updates
            routeobj.text(modifications.data)
            let color = routecolors[modifications.data]
            if (!color) {color = '#bc42f5'}
            routeobj.css('background-color', color)
            const solvebutton = $("#" + number).find('.buttonholder').find('.solvebutton')
            solvebutton.css('background-color', '#7e8f46')
            solvebutton.text('Re-Solve')
          break;
        case 'delete':
            function yes_delete() {
                $("#" + number).remove();
                delete dispatchTracker["E_" + number]
                closewindow()
            }
        
            showCustom({
                title: "Delete " + number + "?",
                description: "Are you sure you want to delete bus " + number + " owned by " + dispatchTracker["E_" + number].username + "?",
                buttons: [
                    {text: "No", color: "#802c2c", function: closewindow},
                    {text: "Yes", color: "#4CAF50", function: yes_delete}
                ]
            })
          break;
        case 'dead':
            const obj = $("#" + number) 
            obj.css("background-color","#E37979");
            dispatchTracker["E_" + number].dead = true
        break;
    }
}

function loadAll(list) {
    let i = 0;
    while (i < list.length) {
        createEntry(list[i]);
        i++;
    }
}

function compare(current) {
    for (const i in dispatchTracker) {
        const item = dispatchTracker[i];

        let found = false;

        let b = 0;
        while (b < current.length) {
            if (current[b].Id == item.Id) {
                found = true
            }
            b++;
        }
        
        if (found == false) {
            modifyEntry(item.Id, {type: 'dead'})
        }    
    }
}

function validateString(data) {
    try {
        data = JSON.parse(data)

        if (validate(data)) {
            return true
        } else {
            $('#alert-parent').show()
            $('#alert-text').text("Invalid JSON")
            return false;
        }
    } catch {
        $('#alert-parent').show()
        $('#alert-text').text("Could not parse JSON")
        return false;
    }
}

async function paste() {
    const text = await navigator.clipboard.readText()
    let input = $('#prompt-data')
    input.val(text)
}

async function submit() {
    const input = $('#prompt-data')
    const val = input.val()
    const valid = validateString(val)
    if (valid == true) {
        loadeddispatchstring = JSON.parse(val);
        closewindow()

        compare(loadeddispatchstring)
        loadAll(loadeddispatchstring)
    }
}


function closewindow() {
    let item = $('#prompt-parent');
    const input = $('#prompt-data')
    $('#overlay').hide()
    item.hide();
    input.val("")
}

function show() {
    showCustom({
        title: "Input JSON",
        description: "Paste JSON data from ExportVehicleList command",
        input: [
            {title: '', id: 'prompt-data', textarea: true, focus: true}
        ],
        buttons: [
            {text: "Cancel", color: "#802c2c", function: closewindow},
            {text: "Paste", color: "#2c4980", width: "15%", function: paste},
            {text: "Submit", color: "#4CAF50", function: submit}
        ]
    })
}

function solveAll() {
    let i = 0;
    for (const i in dispatchTracker) {
        const item = dispatchTracker[i];
        if (item && !item.route) {
            const solvedroute = autoSolve(item)
            dispatchTracker[i].route = solvedroute

            modifyEntry(item.Id, {
                type : 'route', 
                data : solvedroute
            })
        }
    }
}


function showCustom(info) {
    $("#prompt-title").text(info.title)
    $("#prompt-desc").html(info.description)
    let focusbox = null

    const ih = $("#prompt-inputholder")
    ih.empty()
    if (info.input) {
        info.input.forEach((input) => {
            $('<h2>', {
                text: input.title
            }).appendTo(ih);


            if (input.textarea == true) {
                let obj = $('<textarea>', {
                    rows: 4,
                    cols: 50,
                    id: input.id,
                })
                if (input.focus == true) {focusbox = obj}
                obj.appendTo(ih);
            } else {
                let obj = $('<input>', {
                    id: input.id,
                })
                if (input.focus == true) {focusbox = obj}
                obj.appendTo(ih);
            }

        });
    }

    const bh = $("#prompt-buttonholder")
    bh.empty()
    info.buttons.forEach((button) => {
        if (!button.width) {button.width = '25%'}
        $('<button>', {
            class: 'inputbutton',
            text: button.text,
            style: `background-color: ${button.color}; width: ${button.width};`,
            click: button.function,
        }).appendTo(bh);
    });

    $('#prompt-parent').show();
    $('#overlay').show()
    if (focusbox) {focusbox.focus()}
}

// bottombar updates

setInterval(function() {
    // set total
    const total = Object.keys(dispatchTracker).length;
    $('#bottombar .all').text("Vehicles: " + total)

    // update route stats internally
    const calcroutestatus = {
        ['6'] : 0,
        ['9'] : 0,
        ['10'] : 0,
        ['14'] : 0,
        ['16'] : 0,
    }

    for (const key in dispatchTracker) {
        let item = dispatchTracker[key].route
        if (item) {
            calcroutestatus[item.toString()] = calcroutestatus[item.toString()] + 1
        }
    }

    routestatus = calcroutestatus

    // set route stats
    $('#bottombar .6').text("R6: " + routestatus['6'])
    $('#bottombar .9').text("R9: " + routestatus['9'])
    $('#bottombar .10').text("R10: " + routestatus['10'])
    $('#bottombar .14').text("R14: " + routestatus['14'])
    $('#bottombar .16').text("R16: " + routestatus['16'])
}, 500);