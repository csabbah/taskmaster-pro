var tasks = {};

// --------- --------- --------- Handle Date and style accordingly
var rightNow = moment().format('MMMM Do, YYYY - hh:mm:ss a');

var tomorrow = moment().add(1, 'day').format('dddd, MM-D-YYYY [at] hh:mm:ss A');

var pastDate = moment('12-01-1999', 'MM-DD-YYYY').format('dddd, MM/DD/YY');

var auditTask = function (taskEl) {
  // get date from task element
  var date = $(taskEl).find('span').text().trim();

  // convert to moment object at 5:00pm
  var time = moment(date, 'L').set('hour', 17);

  // remove any old classes from element
  $(taskEl).removeClass('list-group-item-warning list-group-item-danger');

  // apply new class if task is near/over due date
  if (moment().isAfter(time)) {
    $(taskEl).addClass('list-group-item-danger');
  } else if (Math.abs(moment().diff(time, 'days')) <= 2) {
    $(taskEl).addClass('list-group-item-warning');
  }
};

// --------- --------- --------- Create the tasks themselves
var createTask = function (taskText, taskDate, taskList) {
  // create elements that make up a task item
  var taskLi = $('<li>').addClass('list-group-item');

  var taskSpan = $('<span>')
    .addClass('badge badge-primary badge-pill')
    .text(taskDate);

  var taskP = $('<p>').addClass('m-1').text(taskText);

  // append span and p element to parent li
  taskLi.append(taskSpan, taskP);

  // check due date
  auditTask(taskLi);

  // append to ul list on the page
  $('#list-' + taskList).append(taskLi);
};

var loadTasks = function () {
  tasks = JSON.parse(localStorage.getItem('tasks'));

  // if nothing in localStorage, create a new object to track all task status arrays
  if (!tasks) {
    tasks = {
      toDo: [],
      inProgress: [],
      inReview: [],
      done: [],
    };
  }

  // loop over object properties
  $.each(tasks, function (list, arr) {
    // then loop over sub-array
    arr.forEach(function (task) {
      createTask(task.text, task.date, list);
    });
  });
};

var saveTasks = function () {
  localStorage.setItem('tasks', JSON.stringify(tasks));
};

// ------- ------- ------- Edit existing To do description
// 1st) Here we add an event listener to the p element inside the list-group container (list)
$('.list-group').on('click', 'p', function () {
  // 'this' is an object, so we extract the text and trim the white space
  var text = $(this).text().trim();
  // Above is similar to doing: var text = this.innerText

  // Essentially, we replace the p element we click on with the new textarea element created
  // Then we assign the value of the text so it looks like we're editing the existing value
  var textInput = $('<textarea>').addClass('form-control').val(text);
  $(this).replaceWith(textInput);
  // Focus on the textarea field
  textInput.trigger('focus');
});

// 2nd) Here we save the new data and revert back to the p element
// blur wil trigger as soon as the user interact with anything OTHER than the textarea
// The event fires off AFTER we click away from being hovered over the textarea field
$('.list-group').on('blur', 'textarea', function () {
  // get the textarea's current value/text
  var text = $(this).val().trim();

  // get the parent ul's id attribute
  var status = $(this).closest('.list-group').attr('id').replace('list-', '');

  // get the task's position in the list of other li elements
  var index = $(this).closest('.list-group-item').index();
  tasks[status][index].text = text;
  saveTasks();

  // recreate p element
  var taskP = $('<p>').addClass('m-1').text(text);

  // replace textarea with p element
  $(this).replaceWith(taskP);
});

// ------- ------- ------- Edit existing date
// due date was clicked
$('.list-group').on('click', 'span', function () {
  // get current text
  var date = $(this).text().trim();

  // create new input element
  var dateInput = $('<input>')
    .attr('type', 'text')
    .addClass('form-control')
    .val(date);

  $(this).replaceWith(dateInput);

  // enable jquery ui datepicker
  dateInput.datepicker({
    minDate: 1,
    onClose: function () {
      // when calendar is closed, force a "change" event on the `dateInput`
      // Essentially, by clicking away from the date prompt, it will register
      $(this).trigger('change');
    },
  });

  // automatically bring up the calendar
  dateInput.trigger('focus');
});

// value of due date was changed
$('.list-group').on('change', "input[type='text']", function () {
  // get current text
  var date = $(this).val().trim();

  // get the parent ul's id attribute
  var status = $(this).closest('.list-group').attr('id').replace('list-', '');

  // get the task's position in the list of other li elements
  var index = $(this).closest('.list-group-item').index();

  // update task in array and re-save to localstorage
  tasks[status][index].date = date;
  saveTasks();

  // recreate span element with bootstrap classes
  var taskSpan = $('<span>')
    .addClass('badge badge-primary badge-pill')
    .text(date);

  // replace input with span element
  $(this).replaceWith(taskSpan);

  // Pass task's <li> element into auditTask() to check new due date
  auditTask($(taskSpan).closest('.list-group-item'));
});

// ------- ------- ------- Pop up trigger
// modal was triggered
$('#task-form-modal').on('show.bs.modal', function () {
  // clear values
  $('#modalTaskDescription, #modalDueDate').val('');
});

// modal is fully visible
$('#task-form-modal').on('shown.bs.modal', function () {
  // highlight textarea
  $('#modalTaskDescription').trigger('focus');
});

// save button in modal was clicked
$('#task-form-modal .btn-primary').click(function () {
  // get form values
  var taskText = $('#modalTaskDescription').val();
  var taskDate = $('#modalDueDate').val();

  if (taskText && taskDate) {
    createTask(taskText, taskDate, 'toDo');

    // close modal
    $('#task-form-modal').modal('hide');

    // save in tasks array
    tasks.toDo.push({
      text: taskText,
      date: taskDate,
    });

    saveTasks();
  }
});
// remove all tasks
$('#remove-tasks').on('click', function () {
  for (var key in tasks) {
    tasks[key].length = 0;
    $('#list-' + key).empty();
  }
  saveTasks();
});

// load tasks for the first time
loadTasks();

// --------- --------- --------- Sorting and adding an event to the drag and drop (save position of tasks to local)
// This allows us to sort the UL elements across the multiple columns in the project
$('.card .list-group').sortable({
  connectWith: $('.card .list-group'),
  scroll: false,
  tolerance: 'pointer',
  helper: 'clone',
  update: function (event) {
    // array to store the task data in
    var tempArr = [];

    // loop over current set of children in sortable list
    $(this)
      .children()
      .each(function () {
        var text = $(this).find('p').text().trim();

        var date = $(this).find('span').text().trim();

        // add task data to the temp array as an object
        tempArr.push({
          text: text,
          date: date,
        });
      });

    // trim down list's ID to match object property
    var arrName = $(this).attr('id').replace('list-', '');

    // update array on tasks object and save
    tasks[arrName] = tempArr;
    saveTasks();
  },
});

// --------- --------- --------- Handle the drag and drop to delete event
$('#trash').droppable({
  accept: '.card .list-group-item',
  tolerance: 'touch',
  drop: function (event, ui) {
    // jQueryui has a second 'ui' parameter in this instance that tracks which element is being hovered over a certain wrapper
    ui.draggable.remove();
  },
  over: function (event, ui) {
    // console.log('over');
  },
  out: function (event, ui) {
    // console.log('out');
  },
});

// --------- --------- --------- Date picker
$('#modalDueDate').datepicker({
  minDate: 1,
});

// --------- --------- --------- Alert
setInterval(function () {
  $('.card .list-group-item').each(function (index, el) {
    auditTask(el);
  });
}, 1000 * 60 * 30);
