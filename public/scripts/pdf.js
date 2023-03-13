import { getCurrentDateDisplayed } from "./data.js";
import { MonthData } from "./monthData.js";


window.html2canvas = html2canvas;
window.jsPDF = window.jspdf.jsPDF;


const downloadButton = document.querySelector("#download-button");
downloadButton.addEventListener('click', ()=> {

    let currentDate = getCurrentDateDisplayed();
    var monthData = new MonthData(currentDate);
    let calendarWeeks = monthData.getCalendarWeeksInMonth();

    // Create a new jsPDF object
    // Note: 1 means landscape
    var doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
    });

    // Dimensions of letter size paper in landscape
    const pdfHeight = 216;
    const pdfWidth = 279;

    
    // Get the month header
    var monthHeader = document.querySelector("#current-month");

    // Add month header to pdf
    html2canvas(monthHeader).then(canvas => {

        const img = document.createElement('img');
        img.src = canvas.toDataURL();

        let monthHeaderSize = 35;
        let x = (pdfWidth - monthHeaderSize)/2.0 + 8;
        let y = 5;
        let rotation = 0;

        doc.addImage(img, 'JPEG', x, y, monthHeaderSize, 0, null, 'FAST', rotation);
    })


    // Get the table
    var calendar = document.querySelector("#calendar");

    // Remove flashing green animation from td and select elements in table
    var flashingElements = document.querySelectorAll(".edited-cell, .edited-cell select");
    flashingElements.forEach(element => {
        element.style.animation = 'none';
    })

    // Add calendar to pdf
    html2canvas(calendar).then(canvas => {

        const img = document.createElement('img');
        img.src = canvas.toDataURL();

        let calendarSize = 240;
        if (calendarWeeks > 5)
            calendarSize *= 0.85;

        let x = (pdfWidth-calendarSize)/2.0 + 8;
        let y = 18;
        let rotation = 0;

        doc.addImage(img, 'JPEG', x, y, calendarSize, 0, null, 'FAST', rotation);

        // File name
        let fileName = `${monthData.getMonthString()}-${currentDate.getFullYear()}-schedule.pdf`;

        // Download pdf
        doc.save(fileName);
    })

});
