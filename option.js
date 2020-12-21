function submit() {
  function clear() { document.getElementById("after").innerHTML = "" };
  clear();
  var api = document.getElementById("api").value;
  fetch("https://www.virustotal.com/vtapi/v2/url/report?apikey=" + api + "&resource=google.com").then((response) => {
          var status = response.status;
          if (status == 403) {
            console.log("status is " + "%c" + status + "%c. seems like the api key invalid...", "color:red", "color:black");
            document.getElementById("after").innerHTML = "<strong>המפתח שהזנת לא עובד... נסה לעבור שוב על ההוראות ולבדוק שהועתק כראוי</strong>"
            return;
          } else {
  chrome.storage.local.set({ api: `${api}` });
  document.getElementById("api").value = "";
  document.getElementById("after").innerHTML = "<strong>ההגדרות נשמרו</strong>"
  document.getElementById("apiplace").innerHTML = ` <strong>מפתח API בשימוש:</strong> ${api} `
  collectmenu();
  console.log("api key saved in localstorage. the key: " + api);
  setTimeout(clear, 2000);
}})}

document.getElementById("but").addEventListener("click", submit);
document.getElementById("api").addEventListener('keydown', function(e){
  if (document.getElementById("api").value === '') return;
  if (e.which === 13) { submit() };
});

chrome.storage.local.get(["api"], function (result) {
  if (typeof result.api === "undefined") {
    document.getElementById("apiplace").innerHTML = "<strong>לא מוגדר מפתח API</strong>"
  } 
  else {
    document.getElementById("apiplace").innerHTML = ` <strong>מפתח API בשימוש:</strong> ${result.api} `
  }
});