chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "editSelectedContent",
    title: "Chỉnh sửa nội dung",
    contexts: ["selection"],
  });
  console.log("Context menu created"); // Log để debug
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "editSelectedContent") {
    try {
      // Kiểm tra URL của tab
      const url = tab.url;
      if (!url.startsWith("http://") && !url.startsWith("https://")) {
        console.error("Cannot run on non-http/https pages:", url);
        return;
      }

      console.log("Executing content.js on tab:", tab.id, "URL:", url); // Log để debug
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"],
      }, () => {
        if (chrome.runtime.lastError) {
          console.error("Lỗi thực thi script:", chrome.runtime.lastError.message);
        } else {
          console.log("content.js executed successfully");
        }
      });
    } catch (error) {
      console.error("Lỗi trong background.js:", error);
    }
  }
});