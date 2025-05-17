function showNotification(message, type = "error") {
  const notification = document.createElement("div");
  notification.style.position = "fixed";
  notification.style.top = "10px";
  notification.style.right = "10px";
  notification.style.padding = "10px";
  notification.style.background = type === "error" ? "#f44336" : "#4caf50";
  notification.style.color = "white";
  notification.style.borderRadius = "4px";
  notification.style.zIndex = "10000";
  notification.innerText = message;
  document.body.appendChild(notification);
  setTimeout(() => notification.remove(), 3000);
}

function sanitizeText(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.textContent;
}

function saveEditHistory(originalText, newText) {
  chrome.storage.local.get({ editHistory: [] }, (data) => {
    const history = data.editHistory;
    history.push({
      timestamp: new Date().toISOString(),
      original: originalText,
      edited: newText,
    });
    if (history.length > 50) history.shift();
    chrome.storage.local.set({ editHistory });
  });
}

function replaceTextInRange(range, newText) {
  const startNode = range.startContainer;
  const endNode = range.endContainer;
  const startOffset = range.startOffset;
  const endOffset = range.endOffset;

  if (startNode === endNode && startNode.nodeType === Node.TEXT_NODE) {
    const originalText = startNode.textContent;
    startNode.textContent =
      originalText.substring(0, startOffset) +
      newText +
      originalText.substring(endOffset);
  } else {
    const commonAncestor = range.commonAncestorContainer;
    const walker = document.createTreeWalker(
      commonAncestor,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) =>
          range.intersectsNode(node)
            ? NodeFilter.FILTER_ACCEPT
            : NodeFilter.FILTER_SKIP,
      }
    );

    let node;
    const nodesToUpdate = [];
    while ((node = walker.nextNode())) {
      nodesToUpdate.push(node);
    }

    nodesToUpdate.forEach((textNode, index) => {
      if (index === 0) {
        textNode.textContent =
          textNode.textContent.substring(0, startOffset) + newText;
      } else if (index === nodesToUpdate.length - 1) {
        textNode.textContent = textNode.textContent.substring(endOffset);
      } else {
        textNode.textContent = "";
      }
    });

    nodesToUpdate.forEach((node) => {
      if (node.textContent === "" && node.parentNode) {
        node.parentNode.removeChild(node);
      }
    });
  }
}

function createEditorPopup(selectedText, range) {
  const existing = document.getElementById("html-quick-edit-popup");
  if (existing) existing.remove();

  const popup = document.createElement("div");
  popup.id = "html-quick-edit-popup";
  popup.className = "html-quick-edit-popup";
  popup.style.position = "fixed";
  popup.style.zIndex = "10000";
  popup.style.left = "0px";
  popup.style.top = "0px";

  const fontAwesome = document.createElement("link");
  fontAwesome.rel = "stylesheet";
  fontAwesome.href = "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css";
  document.head.appendChild(fontAwesome);

  const title = document.createElement("h3");
  title.className = "html-quick-edit-title";
  const icon = document.createElement("i");
  icon.className = "fas fa-pencil-alt";
  title.appendChild(icon);
  title.appendChild(document.createTextNode(" CHỈNH SỬA NỘI DUNG"));
  title.style.textAlign = "center";

  const guide = document.createElement("div");
  guide.className = "html-quick-edit-guide";
  guide.textContent = "Nhấn Enter để lưu, Escape để hủy, Tab để xuống dòng.";

  const textarea = document.createElement("textarea");
  textarea.value = selectedText;
  textarea.className = "html-quick-edit-textarea";
  textarea.oninput = () => {
    textarea.classList.add("text-changed");
    setTimeout(() => textarea.classList.remove("text-changed"), 300);
  };
  textarea.onkeydown = (e) => {
    if (e.key === "Tab") {
      e.preventDefault();
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      textarea.value =
        textarea.value.substring(0, start) +
        "\n" +
        textarea.value.substring(end);
      textarea.selectionStart = textarea.selectionEnd = start + 1;
    }
  };

  const credit = document.createElement("div");
  credit.className = "html-quick-edit-credit";
  credit.textContent = "Extension này được làm bởi Duy Nguyễn 2kar6";

  popup.onkeydown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      try {
        const cleanedText = sanitizeText(textarea.value);
        replaceTextInRange(range, cleanedText);
        saveEditHistory(selectedText, cleanedText);
        popup.remove();
        showNotification("Đã lưu thay đổi!", "success");
      } catch (error) {
        showNotification("Lỗi khi lưu: " + error.message);
        console.error("Lỗi khi lưu:", error);
      }
    } else if (e.key === "Escape") {
      popup.remove();
    }
  };

  // Kéo thả
  let isDragging = false, currentX = 0, currentY = 0, initialX = 0, initialY = 0;

  title.style.cursor = "move";
  title.addEventListener("mousedown", (e) => {
    isDragging = true;
    initialX = e.clientX - currentX;
    initialY = e.clientY - currentY;
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  });

  function onMouseMove(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX;
      currentY = e.clientY - initialY;
      const popupRect = popup.getBoundingClientRect();
      const maxX = window.innerWidth - popupRect.width;
      const maxY = window.innerHeight - popupRect.height;
      currentX = Math.max(0, Math.min(currentX, maxX));
      currentY = Math.max(0, Math.min(currentY, maxY));
      popup.style.left = `${currentX}px`;
      popup.style.top = `${currentY}px`;
      popup.style.transform = "none";
    }
  }

  function onMouseUp() {
    isDragging = false;
    document.removeEventListener("mousemove", onMouseMove);
    document.removeEventListener("mouseup", onMouseUp);
  }

  popup.appendChild(title);
  popup.appendChild(guide);
  popup.appendChild(textarea);
  popup.appendChild(credit);
  document.body.appendChild(popup);

  // Căn giữa chính xác sau 2 lần render
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const rect = popup.getBoundingClientRect();
      currentX = (window.innerWidth - rect.width) / 2;
      currentY = (window.innerHeight - rect.height) / 2;
      popup.style.left = `${currentX}px`;
      popup.style.top = `${currentY}px`;
      textarea.focus();
    });
  });
}

(function () {
  try {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) {
      return;
    }

    const range = selection.getRangeAt(0);
    const selectedText = selection.toString();
    const rect = range.getBoundingClientRect();

    if (!rect.width || !rect.height) {
      showNotification("Vùng chọn không hợp lệ!");
      return;
    }

    createEditorPopup(selectedText, range);
  } catch (error) {
    showNotification("Lỗi khi khởi tạo: " + error.message);
    console.error("Lỗi trong content.js:", error);
  }
})();
