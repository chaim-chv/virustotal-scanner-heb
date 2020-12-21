function handleUpdated(tabId, tabInfo) {
  if (!tabInfo.url || ["chrome:", "about:", "moz-extension:"].some((p) => tabInfo.url.startsWith(p))) {
    console.log("❌ doesnt support this tab");
    chrome.browserAction.setIcon({ path: "icons/icongray24.png", tabId: tabId });
    chrome.browserAction.setBadgeText({ text: `` });
    chrome.browserAction.setTitle({ title: "וירוסטוטאל (אין מידע על טאב נוכחי / טאב מערכת)" });
    chrome.contextMenus.removeAll();
    collectmenu();
    return;
  }
  if (["https://www.google.com", "https://www.virustotal.com"].some((p) => tabInfo.url.startsWith(p))) {
    console.log("not for search - google etc");
    chrome.browserAction.setIcon({ path: "icons/ok.png", tabId: tabId });
    chrome.browserAction.setBadgeText({ text: `` });
    chrome.browserAction.setTitle({ title: "וירוסטוטאל (כתובת לא לסריקה)" });
    chrome.contextMenus.removeAll();
    collectmenu();
    return;
  }
  var domain = new URL(tabInfo.url);
  chrome.storage.local.get(["sites"], function (result) {
    if (result.sites.indexOf(domain.hostname) > -1) {
      console.log("domain from OK domain list");
      chrome.browserAction.setIcon({ path: "icons/ok.png", tabId: tabId });
      chrome.browserAction.setBadgeText({ text: `` });
      chrome.browserAction.setTitle({ title: "וירוסטוטאל - כתובת שנשמרה במאגר כמאושרת" });
      chrome.contextMenus.removeAll();
      chrome.contextMenus.create({
        title: "הסר ממאגר הכתובות האמינות",
        contexts: ["browser_action"],
        onclick: function () {
          var tab = chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
            var url = new URL(tabs[0].url);
            chrome.storage.local.get(["sites"], function (result) {
              var arr = result.sites.filter((e) => e !== url.hostname);
              chrome.storage.local.set({ sites: arr }, function () {
                console.log(arr);
              });
            });
            console.log(`${url.hostname} removed by the user from trust list`);
          });
        },
      });
      collectmenu();
      return;
    } else {
      console.log("tab url is " + "%c" + tabInfo.url + "\n" + "%cthe domain, from this url, is " + "%c" + domain.hostname + "%c\nwe will fetch it bellow:","color: green","color:black","color:green","color:black");
      chrome.browserAction.setIcon({ path: "icons/iconcolor24.png", tabId: tabId });
      chrome.browserAction.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
      chrome.browserAction.setBadgeText({ text: `` });
      chrome.storage.local.get(["api"], function (result) {
        var api = result.api;
        fetch("https://www.virustotal.com/vtapi/v2/url/report?apikey=" + api + "&resource=" + domain.hostname).then((response) => {
          var status = response.status;
          if (status == 204) {
            console.log("status is " + "%c" + status + "%c. we may pass the qoutass... going gray", "color:red", "color:black");
            chrome.browserAction.setIcon({ path: "icons/icongray24.png", tabId: tabId });
            chrome.browserAction.setBadgeBackgroundColor({ color: "#ffffff" });
            chrome.browserAction.setBadgeText({ text: `🙄` });
            chrome.browserAction.setTitle({ title: "API-תקלה עקב מכסת ה\nלחץ על סמל התוסף כדי לפתוח דוח וירוסטוטאל על הדומיין הנוכחי" });
            chrome.contextMenus.removeAll();
            collectmenu();
            return;
          }
          if (status == 200) {
            console.log("status is " + "%c" + status + "%c. and this is the report:", "color:green", "color:black");
            response.json().then((data) => {
              console.log(data);
              if (data.positives > 0 && data.positives < 4) {
                chrome.browserAction.setIcon({ path: "icons/warn.png", tabId: tabId });
                chrome.browserAction.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
                chrome.browserAction.setBadgeText({ text: `${data.positives}` });
                chrome.browserAction.setTitle({ title: `מנועי סריקה סימנו את האתר הזה כמסוכן ${data.positives}\n${domain.hostname} לחץ על סמל התוסף כדי לפתוח דוח וירוסטוטאל המלא על ` });
                chrome.contextMenus.removeAll();
                chrome.contextMenus.create({
                  title: "הוסף לרשימת האמינים",
                  contexts: ["browser_action"],
                  onclick: function () {
                    var tab = chrome.tabs.query(
                      { currentWindow: true, active: true },
                      (tabs) => {
                        var url = new URL(tabs[0].url);
                        chrome.storage.local.get(["sites"], function (result) {
                          result.sites.push(url.hostname);
                          chrome.storage.local.set(
                            { sites: result.sites },
                            function () {}
                          );
                        });
                        console.log(
                          `${url.hostname} added by user to trust list`
                        );
                      }
                    );
                  },
                });
                collectmenu();
                console.log("%c ‼ " + data.positives + " virus alert found", "color:red");
              } else {
                if (data.positives > 3) {
                  chrome.browserAction.setIcon({ path: "icons/warn.png", tabId: tabId });
                  var noturl = "https://www.virustotal.com/gui/domain/" + domain.hostname;
                  var options = {
                    type: "basic",
                    title: "וירוס-טוטאל",
                    message: "ישנם " + data.positives + " דיווחים על סיכונים באתר הזה\n\nלחץ על ההודעה כדי להיכנס לדוח של וירוסטוטאל על האתר",
                    iconUrl: chrome.runtime.getURL("icons/warn.png"),
                  };
                  chrome.notifications.create(noturl, options, function (notificationId) {
                      noturl;
                    });
                  chrome.notifications.onClicked.addListener(function (notificationId) {
                    chrome.tabs.create({ url: notificationId });
                  });
                  chrome.browserAction.setBadgeBackgroundColor({ color: [255, 0, 0, 255] });
                  chrome.browserAction.setBadgeText({ text: `${data.positives}` });
                  chrome.browserAction.setTitle({ title: `לתשומת לב: ${data.positives} מנועי סריקה סימנו את האתר הזה כמסוכן \n${domain.hostname} לחץ על סמל התוסף כדי לפתוח דוח וירוסטוטאל המלא על ` });
                  console.log("%c ‼ " + data.positives + " virus alert found! notificaion showed", "color:red");
                  chrome.contextMenus.removeAll();
                  chrome.contextMenus.create({
                    title: "הוסף לרשימת האמינים",
                    contexts: ["browser_action"],
                    onclick: function () {
                      var tab = chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
                          var url = new URL(tabs[0].url);
                          chrome.storage.local.get(
                            ["sites"],
                            function (result) {
                              result.sites.push(url.hostname);
                              chrome.storage.local.set(
                                { sites: result.sites },
                                function () {}
                              );
                            }
                          );
                          console.log(`${url.hostname} added by user to trust list`);
                        }
                      );
                    },
                  });
                  collectmenu();
                } else {
                  chrome.browserAction.setIcon({ path: "icons/ok.png", tabId: tabId });
                  chrome.browserAction.setTitle({ title: `אין אזהרות לאתר זה\n${domain.hostname} לחץ על סמל התוסף כדי לפתוח דוח וירוסטוטאל המלא על ` });
                  console.log("%c ✔✔ no virus found in report. going OK greeeeen ✔✔", "color:green");
                  chrome.contextMenus.removeAll();
                  collectmenu();
                  chrome.storage.local.get(["collect"], function (result) {
                    if (result.collect == true) {
                      chrome.storage.local.get(["sites"], function (result) {
                        result.sites.push(domain.hostname);
                        chrome.storage.local.set(
                          { sites: result.sites },
                          function () {}
                        );
                      });
                    }
                    if (result.collect == false) {
                      return;
                    }
                  });
                }
              }
            });
          }
        });
      });
    }
  });
}

function collectmenu() {

  chrome.contextMenus.create({ type: "separator" });
  
  chrome.contextMenus.create({
    title: "שמירת כתובות אמינות במאגר",
    contexts: ["browser_action"],
    id: "collect",
  });

  chrome.contextMenus.create({
    title: "שמור",
    contexts: ["browser_action"],
    parentId: "collect",
    id: "save",
    type: "radio",
    onclick: function() {
      chrome.storage.local.set({ collect: true }, function () {});
      console.log(`collecting set to true`);
    },
  });

  chrome.contextMenus.create({
    title: "אל תשמור",
    contexts: ["browser_action"],
    parentId: "collect",
    id: "dont",
    type: "radio",
    onclick: function() {
      chrome.storage.local.set({ collect: false }, function () {});
      console.log(`collecting set to false`);
    },
  });

  chrome.contextMenus.create({
    title: "הגדרות",
    contexts: ["browser_action"],
    id: "settings",
    onclick: function() {
      chrome.runtime.openOptionsPage();
    }
  })

  chrome.storage.local.get(["collect"], function (result) {
    if (result.collect == true) {
      chrome.contextMenus.update("save", {
        checked: true,
      });
    }
    if (result.collect == false) {
      chrome.contextMenus.update("dont", {
        checked: true,
      });
    }
  });

  chrome.contextMenus.create({
    type: "separator",
    contexts: ["browser_action"],
    parentId: "collect",
  });

  chrome.contextMenus.create({
    title: "נקה את מאגר הכתובות האמינות",
    contexts: ["browser_action"],
    parentId: "collect",
    id: "clear",
    onclick: function () {
      chrome.storage.local.set({ sites: ["example.com"] }, function () {});
      console.log(`safe-site list cleared by the user`);
    },
  });
}

chrome.browserAction.onClicked.addListener(function () {
  chrome.storage.local.get(["api"], function (result) {
    if (typeof result.api === "undefined") {
      chrome.runtime.openOptionsPage();
    } else {
      var tab = chrome.tabs.query( { currentWindow: true, active: true }, (tabs) => {
          var url = new URL(tabs[0].url);
          if (!tabs[0].url || ["chrome:", "about:", "moz-extension:", "https://www.google.com", "https://www.virustotal.com"].some((p) => tabs[0].url.startsWith(p))) {
            return;
          } else {
            chrome.tabs.create({ url: "https://www.virustotal.com/gui/domain/" + url.hostname });
          }
        }
      );
    }
  });
});

window.onload = function () {
  console.log("Extension has started...");
  chrome.storage.local.get(["sites"], function (result) {
    if (typeof result.sites === "undefined") {
      console.log("no site list, starting one with example.com");
      chrome.storage.local.set({ sites: ["example.com"] }, function () {});
    } else {
      console.log("safe site list found, have " + result.sites.length + " sites in the list");
      return;
    }
  });
  chrome.storage.local.get(["collect"], function (result) {
    if (typeof result.collect === "undefined") {
      console.log("no collect safe sites choice, set as true by default");
      chrome.storage.local.set({ collect: true }, function () {});
    } else {
      console.log("collecting safe sites: " + result.collect);
      return;
    }
  });
  chrome.storage.local.get(["api"], function (result) {
    if (typeof result.api === "undefined") {
      console.log("no api key in storage, warning user");
      chrome.browserAction.setIcon({ path: "icons/warn.png" });
      chrome.browserAction.setTitle({
        title: `אישי. לחץ על הסמל כדי לגשת להגדרות API עוד לא הגדרת מפתח`,
      });
      chrome.storage.onChanged.addListener(function () {
        chrome.storage.local.get(["api"], function (result) {
          if (typeof result.api === "undefined") {
            return;
          } else {
            console.log("api key set: " + result.api);
            chrome.tabs.onUpdated.addListener(handleUpdated);
          }
        });
      });
    } 
    else {
      console.log("api key found: " + result.api);
      chrome.tabs.onUpdated.addListener(handleUpdated);
    }
  });
  chrome.contextMenus.removeAll();
  collectmenu();
};