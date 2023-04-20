import { changeMonth, getCurrentDateDisplayed, getEmployeeNames, getMonthData,
    getTimeIncrementOptions, setData, addEmployeeToEmployeeList, removeEmployeeFromEmployeeList,
    dayOfWeekDict, setWeeklyEmployee, getDateRefString, addToEditHistory, directoryExists, getEditHistory,
    getSummerCloseTime, getWinterCloseTime } from "./data.js";
import { MonthData } from "./monthData.js";
import { NoPreviousDataError, NoFurtherDataError } from "./errors.js";
import { getUsersName, isAdmin } from "./auth.js";

const loggedOutLinks = document.querySelectorAll(".logged-out");
const loggedInLinks = document.querySelectorAll(".logged-in");

var currentUser;

export const setupUI = (user, isAdmin, isVerified) => {

    currentUser = user;

    // If user is logged in
    if (user) {

        // Toggle UI elements
        loggedInLinks.forEach(item => item.style.display = 'block');
        loggedOutLinks.forEach(item => item.style.display = 'none');

        // If user is not yet verified
        if (!(isVerified || isAdmin)) {
            let unverifiedMessage = document.getElementById("unverified-message");
            unverifiedMessage.style.display = "block";
            return;
        }

        // Show calendar data and start on current date
        let currentDate = new Date();
        updateCalendar(currentDate, 0);

        // Initialize buttons
        initializeButtons(isAdmin);

        let downloadButton = document.querySelector("#download-button-container");
        if (isAdmin) {
            // Show download button
            downloadButton.style.visibility = 'visible';
        }
        else {
            // Hide download button
            downloadButton.style.visibility = 'hidden';
        }

        // Show demo modal
        var demoModalElement = document.getElementById("modal-demo");
        var demoModal = M.Modal.getInstance(demoModalElement);
        demoModal.open();
    }
    // When user logs out
    else {
        // Toggle UI elements
        loggedInLinks.forEach(item => item.style.display = 'none');
        loggedOutLinks.forEach(item => item.style.display = 'block');

        // Hide unverified message
        let unverifiedMessage = document.getElementById("unverified-message");
        unverifiedMessage.style.display = "none";

        // Remove current table data
        let calendarTable = document.getElementById("calendar");
        // Loop over all the child nodes of the table
        for (let i = calendarTable.childNodes.length - 1; i >= 0; i--) {
            const childNode = calendarTable.childNodes[i];
            // Check if the child node is a tr element
            if (childNode.tagName === "TR") {
                // Remove the tr element
                calendarTable.removeChild(childNode);
            }
        }
        
        // Turn off edit mode if it is on when logging out
        if (isEditing)
            toggleEditMode();
    }
}

var isEditing = false;

/*
    Setup for Materialize components
*/
document.addEventListener('DOMContentLoaded', function() {

    // Popups
    var modals = document.querySelectorAll('.modal');
    M.Modal.init(modals);

    initializeMaterializeSelectDropdowns();
});

window.onload = function() {
    updateOpenCloseTime();
    addListenerToSettingsModal();
}


/*
    Initializing functions
*/

function initializeButtons(isAdmin) {
    let editButton = document.getElementById("edit-button");

    editButton.onclick = () => toggleEditMode(isAdmin);

    // Set previous and next month buttons 'onclick' function
    let prevMonthButton = document.getElementById("prevMonthButton")
    prevMonthButton.onclick = () => updateCalendar(getCurrentDateDisplayed(), 11)

    let nextMonthButton = document.getElementById("nextMonthButton")
    nextMonthButton.onclick = () => updateCalendar(getCurrentDateDisplayed(), 1)

    let settingsButton = document.getElementById("settings-button");
    settingsButton.addEventListener('click', updateSettings(isAdmin));
}

async function initializeNewEmployeeForm(isAdmin) {

    // Add/Remove employee form in settings
    const employeeForm = document.getElementById("add-employee-form");

    // Add employee
    employeeForm.addEventListener('submit', (e)=> {
        e.preventDefault();

        let newEmployee = employeeForm["new-employee"].value;

        /* Fix code below in original website */
        
        // If the form was not submitted empty and the value submitted doesn't contain HTML
        addEmployeeToEmployeeList(newEmployee).then(function() {
            alert("Employee added successfully");

            // Add click listener to remove button next to newly added employee
            initializeRemoveEmployeeButtons();

            updateSettings(isAdmin);
            addEmployeeToDropdowns(newEmployee);

            employeeForm.reset();
        })
        .catch(error => {
            alert(error.message);
        });

        
    });

}

function initializeRemoveEmployeeButtons() {

    var buttons = document.querySelectorAll(".remove-employee");

    buttons.forEach(button => {

        button.addEventListener('click', ()=> {
            removeEmployeeFromEmployeeList(button.name).then(function() {
                updateSettings(true);
            });
        });
    });
}

function initializeMaterializeSelectDropdowns() {
    // Dropdown
    var options = {

    };

    var elems = document.querySelectorAll('select');
    var instances = M.FormSelect.init(elems, options);
}


/*
    Calendar functions
*/

function createCalendarMonth(shiftData, calendarElement) {

    // If calender element exists, clear it
    if (calendarElement != null)
        clearCalendar(calendarElement);

    let table = document.getElementById("calendar");
    calendarElement = table;

    let monthData = new MonthData(getCurrentDateDisplayed());

    // Fill days in first week before the 1st of the month with empty box
    let dayOfWeekIndex = 0;
    let row = document.createElement("tr");
    row.className = "week";

    // While day of week is not the first of the month
    while (dayOfWeekIndex < monthData.firstDayIndexOfMonth) {
        let cell = document.createElement("td");
        cell.className = "table-filler";
        row.appendChild(cell);

        dayOfWeekIndex = (dayOfWeekIndex + 1) % 7;
    }
    table.appendChild(row);

    // Add days in month
    let day = 1;

    // Loop through days in month and create new table cell for each day
    while (day <= monthData.daysInMonth) {

        // Create new row on a Sunday
        if (dayOfWeekIndex == 0) {
            row = document.createElement("tr");
            row.className = "week";
            table.appendChild(row);
        }

        let cell = document.createElement("td");

        // Add edited indicator if edit-history exists
        let editHistory = shiftData[day]["edit-history"];

        // Create day header
        let dayHeaderContainer = document.createElement('div');
        dayHeaderContainer.setAttribute('class', 'day-number-container');
        dayHeaderContainer.setAttribute('id', `day-number-${day}`);
        dayHeaderContainer.innerHTML += `<div class="day-number">${day}</div>`;

        let editIndicatorElement = createEditedIndicator(day);

        // Add edit history indicator if there has been any edits to day
        if (editHistory) {
            dayHeaderContainer.appendChild(editIndicatorElement);
            cell.classList.add('edited-cell');
        }

        // Append day to cell
        cell.appendChild(dayHeaderContainer);


        var dayData = Object.values(shiftData[day]);

        /*  Cycle through employees scheduled to work that day and add them to calendar
            Note: There could potentially be more than 2 people working in a day */
        for (let i=0; i<dayData.length; i++) {

            let workerData = dayData[i];
            let worker = workerData["worker"];
            let startTime = workerData["start"];
            let endTime = workerData["end"];

            // Skip edit history
            if (!worker) continue;

            /*  Adds the data for one worker's shift:
                This includes: the workers name, the time they start their shift,
                and the time they finish. */
            cell.innerHTML += `
                <div class="time">
                    <span class="specific-time input-field">
                        <select id="${day}-${i}-start" class="browser-default time-select" disabled>
                            ${getTimeIncrementOptions(8, 21, 30, startTime)}
                        </select>
                    </span>
                     - 
                     <span class="specific-time input-field">
                        <select id="${day}-${i}-end" class="browser-default time-select" disabled>
                            ${getTimeIncrementOptions(8, 21, 30, endTime)}
                        </select>
                    </span>
                </div>
                <div class="worker-name-slot input-field">
                    <select id="${day}-${i}-worker" class="browser-default bold-select workers-dropdown" disabled>
                        <option value="${worker}">${worker}</option>
                    </select>
                </div>
            `;
        }
        // Add table cell to current row
        row.appendChild(cell);

        day++;
        dayOfWeekIndex = (dayOfWeekIndex + 1) % 7;
    }

    // Fill remaining cells in week
    while (dayOfWeekIndex != 0) {
        let cell = document.createElement("td");
        cell.className = "table-filler";
        row.appendChild(cell);

        dayOfWeekIndex = (dayOfWeekIndex + 1) % 7;
    }

}

export function updateCalendar(date, monthDelta) {

    // Get calendar element
    let calendar = document.getElementById("calendar");

    try {

        changeMonth(date, monthDelta);

        // Update month header
        adjustCurrentMonthHeader(getCurrentDateDisplayed());

        // Update open and close times
        updateOpenCloseTime();

        // Get calendar data from data.js
        getMonthData(getCurrentDateDisplayed()).then(data => {
            // Create new calendar to replace old calendar with
            createCalendarMonth(data, calendar);

            /*  Must initialize materialize select elements again since
            we just added more select elements in the table above */
            initializeMaterializeSelectDropdowns();
            // addOnChangeFunctionToDropdowns();
            addListenersToEditHistory();

            isAdmin().then(admin => {
                // Only add weekly option if user is an admin
                addOnChangeToDropdowns(admin);
            })
        });

        addEmployeeNamesToDropdowns();
    }
    catch (error) {
        if (error instanceof NoPreviousDataError) {
            alert("No previous data available");
          } else if (error instanceof NoFurtherDataError) {
            alert("No further data available");
          }
    }

}

function clearCalendar(calendarElement)
{
    removeWeekNodes(calendarElement)
}

function removeWeekNodes(node) {
    var childNodes = node.childNodes;
    for (var i = childNodes.length - 1; i >= 0; i--) {
      if (childNodes[i].nodeType === 1 && childNodes[i].classList.contains("week")) {
        node.removeChild(childNodes[i]);
      }
    }
}


function adjustCurrentMonthHeader(date) {
    var monthHeader = document.getElementById("current-month");
    monthHeader.innerText = date.toLocaleString("en-US", {month: "long"});
}


/*
    Edit History functions
*/

function addListenersToEditHistory() {
    let editHistoryElement = document.querySelectorAll(".edited-day");

    editHistoryElement.forEach(element => {
        let day = element.getAttribute('data-day');
        element.addEventListener('click', () => showEditHistory(day));
    })
}

function updateEditHistory(dropdown, event) {

    var selectedOption = event.target.value;

    var lastValue = dropdown.lastValue;
    dropdown.lastValue = selectedOption;

    var dropdownInfo = event.target.id.split("-");
    var day = dropdownInfo[0];
    var shift = dropdownInfo[1];
    var dropdownType = dropdownInfo[2];

    // If the changed day has not been edited already
    let editIndicator = document.querySelector(`#edited-day-${day}`);
    if (editIndicator == null) {
        var dayHeader = document.querySelector(`#day-number-${day}`);
        dayHeader.appendChild(createEditedIndicator(day));
    }

    // Current date and time
    const date = new Date();

    // Add user's name to edit history
    addToEditHistory(`shifts/${getDateRefString(getCurrentDateDisplayed())}/${day}/edit-history`, {
        editor: getUsersName(),
        date: date.toUTCString(),
        lastValue: lastValue,
        newValue: selectedOption,
        shift: shift,
        changeType: dropdownType
    });
}

function showEditHistory(day, event) {
    getEditHistory(day).then(history => {

        let edits = Object.values(history.val());

        var editHistoryDateHeader = document.getElementById("edits-day");
        let currentDateDisplayed = getCurrentDateDisplayed();
        let month = currentDateDisplayed.toLocaleString("en-US", {month: "long"});
        editHistoryDateHeader.textContent = `Edit History - ${month} ${day}`;

        // Add edit history to modal
        var editDataList = document.getElementById("edit-history-data");
        
        // Remove previous children from editDataList (May have to change
        // since this method of removing children can cause other issues with listeners)
        editDataList.innerHTML = "";

        edits.forEach(edit => {

            let shift = edit["editInfo"]["shift"];
            let lastValue = edit["editInfo"]["lastValue"];
            let newValue = edit["editInfo"]["newValue"];
            let editor = edit["editInfo"]["editor"];
            let dateString = edit["editInfo"]["date"];

            var dateFromString = new Date(dateString);

            const options = {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: 'numeric',
            hour12: true,
            timeZone: 'CST'
            };

            const formattedDateTimeString = dateFromString.toLocaleString('en-US', options);

            // Create li element that will go in Edit history modal
            let liElement = document.createElement("li");
            liElement.classList.add("collection-item");
            liElement.classList.add("edits");

            liElement.innerHTML = `
                <div class="corner-div">
                <span class="${shift == 0 ? "green":"red"}-text">${shift == 0 ? "Open":"Close"}</span>
                </div>
                <div class="changes-container" style="display: flex;">
                    <div class="initial-value" style="margin-top: auto; margin-bottom: auto;">${lastValue}</div>
                    <i class="small material-icons" style="padding: 5px;">trending_flat</i>
                    <div class="new-value" style="margin-top: auto; margin-bottom: auto;">${newValue}</div>
                </div>
                <div class="date-of-edit"><span class="blue-text">${editor}</span> made a change on ${formattedDateTimeString}</div>
            `;

            // Add new list element to list
            editDataList.appendChild(liElement);
        })

        var editHistoryElement = document.getElementById("modal-history");
        var editHistoryModal = M.Modal.getInstance(editHistoryElement);
        editHistoryModal.open();

    });
}

function createEditedIndicator(day) {

    const a = document.createElement('a');
    a.setAttribute('class', 'edited-day');
    a.setAttribute('id', `edited-day-${day}`);
    a.setAttribute('data-day', `${day}`)

    const i = document.createElement('i');
    i.textContent = 'Edited';
    a.appendChild(i);

    a.addEventListener('click', (event) => showEditHistory(day, event));

    return a;
}

function toggleEditMode(isAdmin) {

    var dropDownTags = document.querySelectorAll("select");

    

    dropDownTags.forEach(element => {
        if (element.classList.contains("admin-only")) {
            if (isAdmin) {
                element.disabled = !element.disabled;
            }
        }
        else {
            element.disabled = !element.disabled;
        }
        
    });

    isEditing = !isEditing;
}


/*
    Settings functions
*/

function addListenerToSettingsModal() {
    var settingsModal = document.getElementById("modal-settings");
    settingsModal.M_Modal.options.onOpenEnd = initializeRemoveEmployeeButtons;
}

// Removes data that may be seen in HTML after logout
export function clearSettingsData() {
    var currentEmployees = document.getElementById("current-employees");
    currentEmployees.innerHTML = '';
}

function updateSettings(isAdmin) {

    // Update Account info section
    var nameSlot = document.getElementById("settings-name-slot");
    var emailSlot = document.getElementById("settings-email-slot");

    nameSlot.textContent = currentUser.displayName;
    emailSlot.textContent = currentUser.email;

    // Update admin settings
    var adminSettings = document.getElementById("admin-settings");

    if (isAdmin) {
        
        adminSettings.style.display = "block";
        
        var currentEmployees = document.getElementById("current-employees");
    
        // Reset employees in list
        currentEmployees.innerHTML = '';

        // Add employees to current employee section of settings
        getEmployeeNames().then(employees => {
            employees.forEach(employee => {
                let employeeName = employee.val()["employee"];
                currentEmployees.innerHTML += `
                    <li style="font-size: 20px; padding: 5px; display: inline-flex;">
                        <span>
                            ${employeeName}
                        </span>
                        <a class='remove-employee' name='${employeeName}' style='cursor: pointer;'>
                            <i class='material-icons'>clear</i>
                        </a>
                    </li>
                `;
            });

            initializeNewEmployeeForm(isAdmin);
        });
        
    }
    else {
        adminSettings.style.display = "none";
    }

}


/*
    Dropdown functions
*/

function addEmployeeNamesToDropdowns() {
    
    getEmployeeNames().then(employees => {

        let html = '';

        employees.forEach(employee => {
            html += `<option value='${employee.val()["employee"]}'>${employee.val()["employee"]}</option>`;
        });

        // Add 'OPEN' as an option for a shift
        html += "<option value='OPEN'>OPEN</option>";

        // Add employee names to all name select tags
        let dropdowns = document.querySelectorAll("select.workers-dropdown");
        
        dropdowns.forEach(dropdown => {
            let currentVisibleOption = 
                `<option value='${dropdown.options[0].text}'>${dropdown.options[0].text}</option>`;
            let editedHtml = html.replace(currentVisibleOption, "");
            dropdown.innerHTML += editedHtml;
        });
    });
}

function addEmployeeToDropdowns(employee) {

    let html = ''; 

    html += `<option value='${employee}'>${employee}</option>`;

    // Add employee names to all name select tags
    let dropdowns = document.querySelectorAll("select.workers-dropdown");
    
    dropdowns.forEach(dropdown => {
        dropdown.innerHTML += html;
    });
}

function setDataOnChange(dropdown, event) {

    var selectedOption = event.target.value;

    // Set the piece of data to the new value using the id

    let date = getCurrentDateDisplayed();

    // Create reference string
    let pathData = dropdown.id.split("-");
    let path = `shifts/${getDateRefString(date)}`;

    pathData.forEach(data => {
        path += `/${data}`;
    });

    setData(path, dropdown.value);

}

function addWeeklyPopupFunctionality(dropdown, event) {

    var selectedOption = event.target.value;

    dropdown.lastValue = selectedOption;

    var dropdownInfo = event.target.id.split("-");
    var day = dropdownInfo[0];
    var shift = dropdownInfo[1];

    // Need to determine the day of week based on the day of month
    let dateDisplayed = getCurrentDateDisplayed();
    var newDate = new Date(dateDisplayed.getFullYear(), dateDisplayed.getMonth(), day);
    var dayOfWeek = dayOfWeekDict[newDate.getDay()];

    // Make popup visible
    popup.classList.add("showPopup");

    // Get location of dropdown
    var rect = event.target.getBoundingClientRect();
    var x = rect.left + window.scrollX + 5;
    var y = rect.top + window.scrollY + 45;

    popup.style.top = y + "px";
    popup.style.left = x + "px";

    var yesButton = document.getElementById("yes");
    var noButton = document.getElementById("no");

    yesButton.addEventListener("click", function() {

        // Add name to repeat-shifts for given day
        setWeeklyEmployee(day, dayOfWeek, shift, selectedOption).then(() => {
            location.reload();
        });

        // Hide popup
        popup.classList.remove("showPopup");
    });

    noButton.addEventListener("click", function() {
        // Hide popup
        popup.classList.remove("showPopup");
    });

    // Dismiss popup when clicked outside of popup
    document.addEventListener("click", function(event) {
        if (!popup.contains(event.target)) {
            popup.classList.remove("showPopup");
        }
    });
}

function addOnChangeToDropdowns(isAdmin) {

    const dropdowns = document.querySelectorAll("select");
    
    dropdowns.forEach(dropdown => {

        dropdown.lastValue = dropdown.value;

        dropdown.addEventListener("change", function(event) {
            var confirmed = verifyAndConfirmChange(event)
            if (confirmed) {
                setDataOnChange(this, event);
                updateEditHistory(this, event);
                if (isAdmin && dropdown.classList.contains("workers-dropdown")) {
                    addWeeklyPopupFunctionality(this, event);
                }
            }
            else {
                // If the user cancels the change due to a conflict, set the value
                // back to the original value
                this.value = this.lastValue;
            }
        })

    });
    
}


/*
    Validation functions
*/

function isValidName(name) {
    const regex = /^[a-zA-Z' -]+$/;
    return regex.test(name);
}


/*
    Miscelaneous functions
*/

function updateOpenCloseTime() {
    var closeTimeElement = document.getElementById("close-time");

    let currentDate = getCurrentDateDisplayed();
    let currentMonth = currentDate.getMonth();

    // Summer months are inclusive
    let summerStartMonth = 5; // June
    let summerEndMonth = 8; // October

    if (currentMonth >= summerStartMonth && currentMonth <= summerEndMonth)
        closeTimeElement.textContent = getSummerCloseTime();
    else
        closeTimeElement.textContent = getWinterCloseTime();

}

function verifyAndConfirmChange(event) {

    var selectedOption = event.target.value;

    var dropdownInfo = event.target.id.split("-");
    var day = dropdownInfo[0];
    var shift = dropdownInfo[1];

    var otherEmployee = null;

    if (shift == 0) {
        // Check if close shift has the same employee
        otherEmployee = document.getElementById(`${day}-1-worker`)
    }
    else {
        // Check if open shift has the same employee
        otherEmployee = document.getElementById(`${day}-0-worker`)
    }

    if (otherEmployee.value == selectedOption) {
        var confirmed = confirm(
            "WARNING: The same employee is already working another shift that day. " +
            "Click 'OK' if you would like to continue with the changes."
        );
        return confirmed;
    }
    return true;
}