Telegram.WebApp.ready();
var SERVER_ADDR = "";
var SERVER_PORT = "";

Telegram.WebApp.CloudStorage.getItem("ServerAddress", (error, value) => {
  if (error) {
    Telegram.WebApp.showAlert(
      "An error occurred while getting the server address"
    );
    return;
  }
  if (!value) {
    Telegram.WebApp.showAlert("No value found for server address!");
    return;
  }
  console.log("Retrieved server address from cloud storage:", value);
  SERVER_ADDR = value;
  SetupSocket();
});

Telegram.WebApp.CloudStorage.getItem("ServerPort", (error, value) => {
  if (error) {
    Telegram.WebApp.showAlert(
      "An error occurred while getting the server port"
    );
    return;
  }
  if (!value) {
    Telegram.WebApp.showAlert("No value found for server port!");
    return;
  }
  console.log("Retrieved server port from cloud storage:", value);
  SERVER_PORT = value;
  SetupSocket();
});

var socket = null;

function SetupSocket() {
  if (SERVER_ADDR != "" && SERVER_PORT != "" && socket == null) {
    socket = io("wss://" + SERVER_ADDR + ":" + SERVER_PORT);
  }
}

function LoadAvailableProjects() {
  try {
    if (!socket.connected) {
      setTimeout(LoadAvailableProjects, 1000);
      return;
    }
  } catch (e) {
    setTimeout(LoadAvailableProjects, 1000);
    return;
  }
  Dropdown = document.getElementById("ProjectsDropdown");
  Spinner = document.getElementById("spinner");
  LoadBtn = document.getElementById("LoadBtn");
  socket.emit("GetAvailableProjects", "");
  socket.on("ListAvailableProjects", (arg, callback) => {
    Spinner.style.display = "none";
    LoadBtn.removeAttribute("disabled");
    arg["Projects"].forEach((element) => {
      var opt = document.createElement("option");
      opt.value = element;
      opt.innerHTML = element;
      Dropdown.appendChild(opt);
    });
  });
}

function LoadProject(name) {
  var data = {
    type: "Load",
  };
  data["Project"] = name;
  Telegram.WebApp.CloudStorage.setItem("LoadedProject", data["Project"]);
  Telegram.WebApp.sendData(JSON.stringify(data));
  Telegram.WebApp.close();
}

function LoadSelectedProject() {
  Dropdown = document.getElementById("ProjectsDropdown");
  if (Dropdown.value == "") {
    Telegram.WebApp.showAlert("Please select a project!");
    return;
  }
  LoadProject(Dropdown.value);
}

function Clone() {
  if (!socket.connected) {
    Telegram.WebApp.showAlert(
      "Something is wrong with the server connection, Please check your settings and try again!"
    );
    return;
  }
  ProgressBar = document.getElementById("GitProgressBar");
  ProgressPercentage = document.getElementById("GitProgressPercentage");
  CloneURL = document.getElementById("CloneURLInput");
  CloneDir = document.getElementById("CloneDirInput");

  var xhr = new XMLHttpRequest();
  xhr.open(
    "POST",
    "https://" + SERVER_ADDR + ":" + SERVER_PORT + "/git/clone",
    true
  );
  xhr.setRequestHeader("Content-Type", "application/json");
  xhr.send(
    JSON.stringify({
      URL: CloneURL.value,
      Directory: CloneDir.value,
    })
  );

  ProgressBar.style.display = "inline";
  ProgressPercentage.style.display = "inline";
  ProgressBar.removeAttribute("value");
  CloneURL.disabled = "true";
  CloneDir.disabled = "true";
  socket.on("CloneMaxProgress", (arg, callback) => {
    ProgressBar.max = arg;
  });
  socket.on("CloneStatus", (arg, callback) => {
    ProgressBar.style.display = "none";
    ProgressPercentage.style.display = "none";
    CloneURL.removeAttribute("disabled");
    CloneDir.removeAttribute("disabled");
    var projName = "";
    if (arg["data"] === "Success") {
      if (CloneDir.value === "") {
        gitName =
          CloneURL.value.split("/")[CloneURL.value.split("/").length - 1];
        projName = gitName.substring(0, gitName.lastIndexOf(".git")) || gitName;
      } else {
        projName =
          CloneDir.value.split("/")[CloneURL.value.split("/").length - 1];
      }
      LoadProject(projName);
      return;
    }
    Telegram.WebApp.showAlert(
      "Error occurred while cloning the repository: " + arg["data"]
    );
  });
  socket.on("CloneProgress", (arg, callback) => {
    ProgressBar.value = arg;
    ProgressPercentage.innerHTML =
      String(Math.round((arg / ProgressBar.max) * 100 * 100) / 100) + "%";
  });
}
