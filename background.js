chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "quick-edit",
    title: " Edit Text",
    contexts: ["selection"]  // chỉ hiện khi có chọn đoạn text
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "quick-edit") {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      function: (selectedText) => {
        window.postMessage({ type: "OPEN_QUICK_EDIT", text: selectedText }, "*");
      },
      args: [info.selectionText]
    });
  }
});
