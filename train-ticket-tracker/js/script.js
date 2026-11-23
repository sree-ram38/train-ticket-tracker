const MILLISECONDS_IN_A_DAY = 24 * 60 * 60 * 1000;
const TRAINS_KEY = "trains";
const THEME_KEY = "theme";

const themeButton = document.getElementById("theme-button");
const addTrainForm = document.getElementById("add-train-form");
const trainNameInput = document.getElementById("train-name");
const routeInput = document.getElementById("route");
const journeyDateInput = document.getElementById("journey-date");
const bookingWindowInput = document.getElementById("booking-window");
const previewBox = document.getElementById("preview");
const trainListElement = document.getElementById("train-list");
const startDateInput = document.getElementById("start-date");
const endDateInput = document.getElementById("end-date");
const todayButton = document.getElementById("today-button");
const differenceError = document.getElementById("difference-error");
const differenceResult = document.getElementById("difference-result");


function readFromStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    return null;
  }
}

function writeToStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    return;
  }
}

function loadTrains() {
  const savedText = readFromStorage(TRAINS_KEY);
  if (!savedText) {
    return [];
  }
  try {
    const savedTrains = JSON.parse(savedText);
    return Array.isArray(savedTrains) ? savedTrains : [];
  } catch (error) {
    return [];
  }
}

function saveTrains() {
  writeToStorage(TRAINS_KEY, JSON.stringify(trains));
}

let trains = loadTrains();


function applyTheme(themeName) {
  document.documentElement.setAttribute("data-theme", themeName);
  themeButton.textContent = themeName === "dark" ? "Switch to light theme" : "Switch to dark theme";
}

function getStartingTheme() {
  const savedTheme = readFromStorage(THEME_KEY);
  if (savedTheme === "light" || savedTheme === "dark") {
    return savedTheme;
  }
  const computerPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return computerPrefersDark ? "dark" : "light";
}

themeButton.addEventListener("click", function () {
  const currentTheme = document.documentElement.getAttribute("data-theme");
  const newTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme(newTheme);
  writeToStorage(THEME_KEY, newTheme);
});


function pluralize(count, word) {
  return count + " " + word + (count === 1 ? "" : "s");
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getTodayText() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return year + "-" + month + "-" + day;
}

function dateTextToNumber(dateText) {
  const parts = dateText.split("-");
  const year = Number(parts[0]);
  const monthIndex = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  return Date.UTC(year, monthIndex, day);
}

function numberToDateText(number) {
  return new Date(number).toISOString().slice(0, 10);
}

function addDays(dateText, daysToAdd) {
  return numberToDateText(dateTextToNumber(dateText) + daysToAdd * MILLISECONDS_IN_A_DAY);
}

function daysBetween(startText, endText) {
  const difference = dateTextToNumber(endText) - dateTextToNumber(startText);
  return Math.round(difference / MILLISECONDS_IN_A_DAY);
}

function formatDate(dateText) {
  return new Date(dateTextToNumber(dateText)).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC"
  });
}

function getDifference(startText, endText) {
  const startParts = startText.split("-").map(Number);
  const endParts = endText.split("-").map(Number);

  let years = endParts[0] - startParts[0];
  let months = endParts[1] - startParts[1];
  let days = endParts[2] - startParts[2];

  if (days < 0) {
    months = months - 1;
    const daysInPreviousMonth = new Date(Date.UTC(endParts[0], endParts[1] - 1, 0)).getUTCDate();
    days = days + daysInPreviousMonth;
  }

  if (months < 0) {
    years = years - 1;
    months = months + 12;
  }

  return { years: years, months: months, days: days };
}

function describeDifference(difference) {
  const parts = [];
  if (difference.years > 0) {
    parts.push(pluralize(difference.years, "year"));
  }
  if (difference.months > 0) {
    parts.push(pluralize(difference.months, "month"));
  }
  if (difference.days > 0) {
    parts.push(pluralize(difference.days, "day"));
  }
  return parts.length > 0 ? parts.join(" ") : "0 days";
}


function getTrainStatus(train, todayText) {
  const opensOn = addDays(train.journeyDate, -train.bookingWindow);

  if (todayText > train.journeyDate) {
    return { opensOn: opensOn, isPast: true, colorClass: "status-done", bigText: "Done", label: "Journey passed" };
  }
  if (todayText === opensOn) {
    return { opensOn: opensOn, isPast: false, colorClass: "status-open", bigText: "Today", label: "Booking opens today" };
  }
  if (todayText > opensOn) {
    return { opensOn: opensOn, isPast: false, colorClass: "status-open", bigText: "Open", label: "Booking is open" };
  }

  const daysToWait = daysBetween(todayText, opensOn);
  return {
    opensOn: opensOn,
    isPast: false,
    colorClass: daysToWait <= 7 ? "status-soon" : "",
    bigText: String(daysToWait),
    label: daysToWait === 1 ? "day to go" : "days to go"
  };
}

function showPreview() {
  const journeyDate = journeyDateInput.value;
  const bookingWindow = parseInt(bookingWindowInput.value, 10);

  if (!journeyDate || !bookingWindow || bookingWindow < 1) {
    previewBox.hidden = true;
    return;
  }

  const todayText = getTodayText();
  const status = getTrainStatus({ journeyDate: journeyDate, bookingWindow: bookingWindow }, todayText);
  let message = "";
  let extraClass = "";

  if (status.isPast) {
    message = "This journey date has already passed.";
    extraClass = "closed";
  } else if (todayText === status.opensOn) {
    message = "That is today, so booking opens today.";
  } else if (todayText > status.opensOn) {
    message = "That was " + pluralize(daysBetween(status.opensOn, todayText), "day") + " ago, so booking is already open.";
  } else {
    const daysToWait = daysBetween(todayText, status.opensOn);
    message = "That is " + describeDifference(getDifference(todayText, status.opensOn)) + " from today (" + pluralize(daysToWait, "day") + ").";
    if (daysToWait <= 7) {
      extraClass = "soon";
    }
  }

  previewBox.className = "preview " + extraClass;
  previewBox.innerHTML =
    "Booking opens on <b>" + formatDate(status.opensOn) + "</b> " +
    '<span class="hint">(' + bookingWindow + " days before " + formatDate(journeyDate) + ")</span><br>" +
    message;
  previewBox.hidden = false;
}

function buildTicketHtml(train, status, todayText) {
  const waitText = !status.isPast && todayText < status.opensOn
    ? describeDifference(getDifference(todayText, status.opensOn))
    : "–";
  const travelText = !status.isPast
    ? describeDifference(getDifference(todayText, train.journeyDate))
    : "–";
  const routeHtml = train.route ? '<div class="route-text">' + escapeHtml(train.route) + "</div>" : "";
  const pastClass = status.isPast ? "past" : "";

  return (
    '<li class="ticket ' + pastClass + '">' +
      '<div class="ticket-main">' +
        '<div class="train-name">' + escapeHtml(train.name) + "</div>" +
        routeHtml +
        "<dl>" +
          "<dt>Journey</dt><dd>" + formatDate(train.journeyDate) + "</dd>" +
          "<dt>Opens</dt><dd>" + formatDate(status.opensOn) + ' <span class="hint">(' + train.bookingWindow + " days before)</span></dd>" +
          "<dt>Wait</dt><dd>" + waitText + "</dd>" +
          "<dt>Until travel</dt><dd>" + travelText + "</dd>" +
        "</dl>" +
      "</div>" +
      '<div class="ticket-stub">' +
        '<div class="big-text ' + status.colorClass + '">' + status.bigText + "</div>" +
        '<div class="status-text ' + status.colorClass + '">' + status.label + "</div>" +
        '<button type="button" class="small-button remove-button" data-id="' + train.id + '">Remove</button>' +
      "</div>" +
    "</li>"
  );
}

function showTrainList() {
  const todayText = getTodayText();

  const items = trains.map(function (train) {
    return { train: train, status: getTrainStatus(train, todayText) };
  });

  items.sort(function (a, b) {
    if (a.status.isPast !== b.status.isPast) {
      return a.status.isPast ? 1 : -1;
    }
    return a.status.opensOn.localeCompare(b.status.opensOn);
  });

  if (items.length === 0) {
    trainListElement.innerHTML = '<li class="empty-message">No trains yet. Add a train and journey date above.</li>';
    return;
  }

  trainListElement.innerHTML = items
    .map(function (item) {
      return buildTicketHtml(item.train, item.status, todayText);
    })
    .join("");
}

addTrainForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const newTrain = {
    id: Date.now().toString(36),
    name: trainNameInput.value.trim(),
    route: routeInput.value.trim(),
    journeyDate: journeyDateInput.value,
    bookingWindow: Math.max(1, parseInt(bookingWindowInput.value, 10) || 60)
  };

  trains.push(newTrain);
  saveTrains();
  showTrainList();

  trainNameInput.value = "";
  routeInput.value = "";
  journeyDateInput.value = "";
  showPreview();
  trainNameInput.focus();
});

trainListElement.addEventListener("click", function (event) {
  const removeButton = event.target.closest(".remove-button");
  if (!removeButton) {
    return;
  }
  const idToRemove = removeButton.dataset.id;
  trains = trains.filter(function (train) {
    return train.id !== idToRemove;
  });
  saveTrains();
  showTrainList();
});

journeyDateInput.addEventListener("input", showPreview);
bookingWindowInput.addEventListener("input", showPreview);


function showDateDifference() {
  const firstDate = startDateInput.value;
  const secondDate = endDateInput.value;

  differenceError.textContent = "";

  if (!firstDate || !secondDate) {
    differenceResult.innerHTML = "";
    return;
  }

  const isBackwards = firstDate > secondDate;
  const earlierDate = isBackwards ? secondDate : firstDate;
  const laterDate = isBackwards ? firstDate : secondDate;

  if (isBackwards) {
    differenceError.textContent = "The “to” date is earlier, so the result is counted backwards.";
  }

  const difference = getDifference(earlierDate, laterDate);
  const totalDays = daysBetween(earlierDate, laterDate);
  const totalMonths = difference.years * 12 + difference.months;
  const totalWeeks = (totalDays / 7).toFixed(1);

  differenceResult.innerHTML =
    '<div class="result">' +
      "<div><b>" + difference.years + "</b><span>" + (difference.years === 1 ? "year" : "years") + "</span></div>" +
      "<div><b>" + difference.months + "</b><span>" + (difference.months === 1 ? "month" : "months") + "</span></div>" +
      "<div><b>" + difference.days + "</b><span>" + (difference.days === 1 ? "day" : "days") + "</span></div>" +
    "</div>" +
    '<p class="totals">' + pluralize(totalDays, "day") + " in total, or " + pluralize(totalMonths, "full month") + ", or " + totalWeeks + " weeks.</p>";
}

startDateInput.addEventListener("input", showDateDifference);
endDateInput.addEventListener("input", showDateDifference);
todayButton.addEventListener("click", function () {
  startDateInput.value = getTodayText();
  showDateDifference();
});


applyTheme(getStartingTheme());
journeyDateInput.min = getTodayText();
startDateInput.value = getTodayText();
showTrainList();
showDateDifference();
