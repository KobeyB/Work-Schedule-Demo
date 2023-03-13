var dayOfWeekDict = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday"
};

export class MonthUtility {

    static changeMonth(date, monthDelta) {
        let currentMonth = date.getMonth();
        let currentYear = date.getFullYear();

        // Get next month by adding 1 mod 12
        let newMonth = (currentMonth + monthDelta) % 12;
        let newYear = currentYear;

        // If it is December, increment the year
        if (currentMonth == 11 && monthDelta == 1)
            newYear++;

        // If it is January, decrement the year
        else if (currentMonth == 0 && monthDelta == 11)
            newYear--;

        return new Date(newYear, newMonth);
    }

}

export class MonthData {

    constructor(date) {

        this.date = date;

        var currentMonth = date.getMonth();

        this.month = date.getMonth();

        this.lastMonth = (this.month + 11) % 12;

        this.daysInMonth = new Date(
            date.getFullYear(),
            currentMonth + 1,
            0).getDate();

        this.daysInLastMonth = this.calculateDaysInLastMonth(date);

        // The index regarding the day of week
        // (e.g. 0=Sunday, 1=Monday, etc.)
        this.firstDayIndexOfMonth = new Date(
            date.getFullYear(),
            currentMonth,
            1).getDay();

        this.firstDayOfFirstWeek = this.calculateFirstDayOfFirstWeek();

        this.weeksInMonth = this.calculateWeeksInCalendarMonth();

    }

    calculateFirstDayOfFirstWeek() {
        /*
        Start the first day of week as number of days in last month
        and backtrack to sunday to get first day of first week
        */
        var temp = this.daysInLastMonth;
        var tempDayIndex = this.firstDayIndexOfMonth;

        // If the first day of the week is the last day of the
        // last month
        if (tempDayIndex == 1)
            return this.daysInLastMonth;

        while (tempDayIndex > 1) {
            temp--;
            tempDayIndex--;
        }

        // If first day of week is the first of the month
        if (temp == this.daysInLastMonth) {
            temp = 1;
        }

        return temp;
    }

    calculateWeeksInCalendarMonth() {
        var day = this.firstDayOfFirstWeek;
        var weekCount = 0;
        var endOfLastMonthFlag = false;
        var endOfMonthFlag = false;

        while (weekCount < 100) {
            // Go to next day of week
            day += 7;
            // If first day of week is a sunday
            if (this.firstDayIndexOfMonth == 0) {
                endOfLastMonthFlag = true;
            }
            if (day >= this.daysInLastMonth && !endOfLastMonthFlag) {
                endOfLastMonthFlag = true;
                day = day % this.daysInLastMonth;
            }
            if (day >= this.daysInMonth && endOfLastMonthFlag && !endOfMonthFlag) {
                endOfMonthFlag = true;
            }
            weekCount++;
            // Keep going until we reach sunday
            if (endOfMonthFlag && endOfLastMonthFlag) {
                // If last day of month falls on a sunday
                if (day == this.daysInMonth)
                    weekCount++;
                return weekCount;
            }
        }
        return "Error"
    }

    calculateDaysInLastMonth(date)
    {
        var month = date.getMonth();
        var year = date.getFullYear();
        var lastMonth = month;

        // If the last month is from the previous year
        if (lastMonth <= 0) {
            year--;
        }

        var lastMonthDate = new Date(year, lastMonth, 0);
        var daysInLastMonth = lastMonthDate.getDate();

        return daysInLastMonth;
    }

    getCalendarWeeksInMonth() {
        const year = this.date.getFullYear();
        const month = this.date.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let numWeeks = 0;
        let daysProcessed = 0;
        let daysRemaining = daysInMonth;
      
        // If the first day of the month is not a Sunday, count that as the first week
        if (firstDayOfMonth !== 0) {
          numWeeks++;
          daysRemaining -= 7 - firstDayOfMonth;
          daysProcessed += 7 - firstDayOfMonth;
        }
      
        // Count the full weeks
        while (daysRemaining >= 7) {
          numWeeks++;
          daysRemaining -= 7;
          daysProcessed += 7;
        }
      
        // Count the last partial week, if necessary
        if (daysRemaining > 0) {
          numWeeks++;
        }
      
        return numWeeks;
    }
      
    getMonthString() {
        return this.date.toLocaleString("en-US", {month: "long"});;
    }
      
}
