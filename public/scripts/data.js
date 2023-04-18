/*
    Imports
*/

// Import custom Month classes
import { MonthData, MonthUtility } from "./monthData.js";

// Import error classes
import { NoPreviousDataError, NoFurtherDataError } from "./errors.js";

// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-analytics.js";
import { getDatabase, ref, set, get, push, child, onValue } from "https://www.gstatic.com/firebasejs/9.17.1/firebase-database.js";


/*
    Firebase data
*/

const firebaseConfig = {
    apiKey: "AIzaSyCYrn2S7CxFf5Ia7fjXayURIr0KixaTaQs",
    authDomain: "work-schedule-demo.firebaseapp.com",
    projectId: "work-schedule-demo",
    storageBucket: "work-schedule-demo.appspot.com",
    messagingSenderId: "583163637560",
    appId: "1:583163637560:web:94cd9b3575feb419e01bcd",
    measurementId: "G-FNLM1XNHBE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


/*
    Dates
*/

var currentDateDisplayed = new Date()

// Start records at January 1, 2023
const START_OF_SCHEDULE_RECORDS = new Date(2023, 0, 1);
// Set the furthest date of records to be one month ahead of current date
const END_OF_SCHEDULE_RECORDS = MonthUtility.changeMonth(currentDateDisplayed, 1);
/*
    Note that the purpose of the above two constants is to prevent someone from
    creating too many records in the database.
*/

var summerCloseTime = "9:00pm";
var winterCloseTime = "8:00pm";

export function getSummerCloseTime() {
    return summerCloseTime;
}

export function getWinterCloseTime() {
    return winterCloseTime;
}


/*
    Dictionaries
*/

export var dayOfWeekDict = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday"
};


export function changeMonth(date, monthDelta) {
    
    let tempDate = MonthUtility.changeMonth(date, monthDelta);

    if (tempDate < START_OF_SCHEDULE_RECORDS) {
        throw new NoPreviousDataError();
    }
    else if (tempDate > END_OF_SCHEDULE_RECORDS) {
        // Change date back to previous date
        throw new NoFurtherDataError();
    }

    currentDateDisplayed = tempDate;
}


async function getRepeatedShifts() {
    const database = getDatabase();
    const dbRef = ref(database);

    try {
        const snapshot = await get(child(dbRef, 'repeated-shifts'));
        return snapshot.val();
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export function getDateRefString(date) {
    return (date.getMonth() + 1) + "-" + date.getFullYear().toString();
}

export async function getMonthData(date) {
    // Create date reference string to be used to retrieve data
    var dateRefString = getDateRefString(date);

    const database = getDatabase();
    const dbRef = ref(database);
    
    try {
        const snapshot = await get(child(dbRef, `shifts/${dateRefString}`));
        let data = snapshot.val();
        
        /*
            Check if data exists in database.
        */
        // If the data doesn't exist, create a new month of data
        if (data == null) {
          console.log("Data does not exist. Creating new data...");
          return await writeShiftData(dateRefString);
        } else {
          // Return existing data
          console.log("Displaying previously existing data");
          return data;
        }
    } catch (error) {
        console.error(error);
        throw error;
    }
}


async function writeShiftData(dateRefString) {

    const repeatShiftData = await getRepeatedShifts();

    // Generate new data for month based on repeat-shift data
    let shiftData = createShiftMonthObj(repeatShiftData);

    return setData("shifts/" + dateRefString, shiftData);
}


function createShiftMonthObj(repeatShiftsData) {

    let monthData = new MonthData(currentDateDisplayed)

    let currentDay = 1
    let currentDayIndex = monthData.firstDayIndexOfMonth

    var obj = {};

    while (currentDay <=monthData.daysInMonth) {

        let workers = repeatShiftsData[dayOfWeekDict[currentDayIndex]];

        obj[currentDay] = {}

        // Add open employee to database for given day
        obj[currentDay][0] = {
            "worker": workers[0],
            "start": "Open",
            "end": "3:30pm"
        }

        // Add close employee to database for given day
        obj[currentDay][1] = {
            "worker": workers[1],
            "start": "3:30pm",
            "end": "Close"
        }

        currentDay++
        currentDayIndex = (currentDayIndex + 1) % 7
    }

    return obj;
}


export function getTimeIncrementOptions(startTime, endTime, step, currentTimeDisplayed) {

    var html = '';

    var suffix = "am";

    if (currentTimeDisplayed != "Open") {
        html += `
                <option value="Open">
                Open
                </option>
            `;
    }
    else {
        html += `
                <option value="Open" selected>
                Open
                </option>
            `;
    }

    if (currentTimeDisplayed != "Close") {
        html += `
                <option value="Close">
                Close
                </option>
            `;
    }
    else {
        html += `
                <option value="Close" selected>
                Close
                </option>
            `;
    }

    for (let i = startTime; i <= endTime; i++) {

        var hour = i;

        if (i  > 12) {
            hour = i - 12;
        }

        if (hour == 12) {
            suffix = "pm";
        }

        for (let j = 0; j < 60; j += step) {

            let time = `${hour}:${j < 10 ? '0' + j : j}${suffix}`;

            if (time == currentTimeDisplayed) {
                html += `
                    <option value="${time}" selected>
                    ${time}
                    </option>
                `;
            }
            else {
                html += `
                    <option value="${time}">
                    ${time}
                    </option>
                `;
            }
        }
    }

    return html;
}

export async function getEmployeeNames() {
    const database = getDatabase();
    const dbRef = ref(database);

    try {
        const snapshot = await get(child(dbRef, 'employee-list'));
        return snapshot;
    } catch (error) {
        console.error(error);
        throw error;
    }
}

export async function addEmployeeToEmployeeList(employee) {

    // Verify that name is valid
    if (!isValidName(employee)) {
        throw new Error("Invalid name");
    }

    const database = getDatabase();
    const employeeListRef = ref(database, 'employee-list');
    const newEmployeeRef = push(employeeListRef);
    await set(newEmployeeRef, {
        employee
    });
}

export function addToEditHistory(path, editInfo) {
    const database = getDatabase();
    const editHistoryRef = ref(database, path);
    const newEditRef = push(editHistoryRef);
    set(newEditRef, {
        editInfo
    });
}

export function getCurrentDateDisplayed() {
    return currentDateDisplayed;
}

export async function setData(path, newData) {

    const database = getDatabase();
    // Write new data to database
    await set(ref(database, path), newData);
    console.log("Data successfully written to database");
    return newData;

}

export async function removeEmployeeFromEmployeeList(employeeName) {
    const database = getDatabase();
    const dbRef = ref(database);

    let employeeList = await getEmployeeNames();
    let employeeObj = await getObjectByValue("employee-list", employeeName);

    let generatedKeys = Object.keys(employeeList.val());

    let fullPath = '';

    // Loop through generated keys
    for (const key of generatedKeys) {
        fullPath = `employee-list/${key}`;

        let snapshot = await get(child(dbRef, fullPath));

        if (snapshot.val()["employee"] == employeeObj["employee"]) {
            await setData(`employee-list/${key}`, null);
            console.log("Data successfully deleted.");
        }
    }
    
}

export async function getKeyByValue(path, value) {
    const database = getDatabase();
    const dbRef = ref(database);

    const snapshot = await get(child(dbRef, path));

    var keyFound;

    snapshot.forEach(element => {
        let obj = element.val();
        let keys = Object.keys(obj);

        // Loop through all keys in object stored at given path
        keys.forEach(key => {
            if (obj[key] == value)
                keyFound = key;
        });

    });

    if (!keyFound)
        throw new Error(`No key was found for the value: ${value} in the path: ${path}`);

    return keyFound;
}

export async function getObjectByValue(path, value) {
    const database = getDatabase();
    const dbRef = ref(database);

    const snapshot = await get(child(dbRef, path));

    var objectFound;

    snapshot.forEach(element => {
        let obj = element.val();
        let keys = Object.keys(obj);

        // Loop through all keys in object stored at given path
        keys.forEach(key => {
            if (obj[key] == value)
                objectFound = obj;
        });

    });

    if (!objectFound)
        throw new Error(`No key was found for the value: ${value} in the path: ${path}`);

    return objectFound;
}

export async function setWeeklyEmployee(day, dayOfWeek, shift, employeeName) {

    let monthData = new MonthData(currentDateDisplayed);
    let dateRefString = getDateRefString(currentDateDisplayed);

    let count = 0;
    
    // Add employee to each remaining week in current month
    while (+day <= monthData.daysInMonth && count < 5) {
        await setData(`shifts/${dateRefString}/${day}/${shift}/worker`, employeeName);
        day = +day + +7;
        count++;
    }

    // Add employee to repeated-shifts list
    setData(`repeated-shifts/${dayOfWeek}/${shift}`, employeeName);
}

export async function directoryExists(path)  {

    const database = getDatabase();
    const dbRef = ref(database);

    const snapshot = await get(child(dbRef, path));

    return snapshot.val() != null;
}

export async function getEditHistory(day) {
    const database = getDatabase();
    const dbRef = ref(database);

    try {
        const snapshot = await get(child(dbRef, `shifts/${getDateRefString(currentDateDisplayed)}/${day}/edit-history`));
        return snapshot;
    } catch (error) {
        console.error(error);
        throw error;
    }
}


/*
    Validation functions
*/

function isValidName(name) {
    const regex = /^[a-zA-Z' -]+$/;
    return regex.test(name);
}