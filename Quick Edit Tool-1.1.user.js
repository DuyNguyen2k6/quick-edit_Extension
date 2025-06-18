// ==UserScript==
// @name         Quick Edit Tool
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Popup chỉnh sửa nhanh nội dung bôi đen, popup hiện luôn chính giữa, nhấn Enter lưu, Esc hủy, kéo thả tiện dụng
// @author       Bạn
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
  // Hàm hiện notification
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

  // Làm sạch text để tránh lỗi html injection
  function sanitizeText(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.textContent;
  }

  // Lưu lịch sử chỉnh sửa vào chrome.storage.local (nếu có)
  function saveEditHistory(originalText, newText) {
    if (!window.chrome || !chrome.storage) return; // Nếu không phải Chrome extension, bỏ qua
    chrome.storage.local.get({ editHistory: [] }, (data) => {
      const history = data.editHistory || [];
      history.push({
        timestamp: new Date().toISOString(),
        original: originalText,
        edited: newText,
      });
      if (history.length > 50) history.shift();
      chrome.storage.local.set({ editHistory: history });
    });
  }

  // Thay thế text trong range (hỗ trợ range nhiều node text)
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

  // Tạo popup chỉnh sửa
  function createEditorPopup(selectedText, range) {
    const existing = document.getElementById("html-quick-edit-popup");
    if (existing) existing.remove();

    const popup = document.createElement("div");
    popup.id = "html-quick-edit-popup";
    // Các style cơ bản popup
    popup.style.position = "fixed";
    popup.style.zIndex = "10000";
    popup.style.background = "white";
    popup.style.border = "1px solid #ccc";
    popup.style.padding = "10px";
    popup.style.minWidth = "350px";
    popup.style.maxWidth = "90vw";
    popup.style.boxShadow = "0 2px 10px rgba(0,0,0,0.2)";
    popup.style.borderRadius = "6px";
    popup.style.fontFamily = "Arial, sans-serif";
    popup.style.fontSize = "14px";
    popup.style.color = "#222";

    // ĐẶT NGAY CHÍNH GIỮA MÀN HÌNH, KHÔNG DI CHUYỂN
    popup.style.left = "50%";
    popup.style.top = "50%";
    popup.style.transform = "translate(-50%, -50%)";

    // Thêm FontAwesome nếu chưa có
    if (!document.getElementById("fa-stylesheet")) {
      const fontAwesome = document.createElement("link");
      fontAwesome.rel = "stylesheet";
      fontAwesome.href =
        "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css";
      fontAwesome.id = "fa-stylesheet";
      document.head.appendChild(fontAwesome);
    }

    // Tiêu đề popup
    const title = document.createElement("h3");
    title.className = "html-quick-edit-title";
    const icon = document.createElement("i");
    icon.className = "fas fa-pencil-alt";
    icon.style.marginRight = "6px";
    title.appendChild(icon);
    title.appendChild(document.createTextNode(" CHỈNH SỬA NỘI DUNG"));
    title.style.textAlign = "center";
    title.style.cursor = "move";
    title.style.userSelect = "none";
    popup.appendChild(title);

    // Hướng dẫn
    const guide = document.createElement("div");
    guide.className = "html-quick-edit-guide";
    guide.textContent = "Nhấn Enter để lưu, Escape để hủy, Tab để xuống dòng.";
    guide.style.marginBottom = "8px";
    popup.appendChild(guide);

    // Textarea chỉnh sửa
    const textarea = document.createElement("textarea");
    textarea.value = selectedText;
    textarea.className = "html-quick-edit-textarea";
    textarea.style.width = "100%";
    textarea.style.height = "120px";
    textarea.style.padding = "8px";
    textarea.style.fontSize = "14px";
    textarea.style.fontFamily = "inherit";
    textarea.style.boxSizing = "border-box";
    textarea.style.resize = "vertical";
    textarea.style.border = "1px solid #aaa";
    textarea.style.outline = "none";
    textarea.style.transition = "background-color 0.3s ease";
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
          textarea.value.substring(0, start) + "\n" + textarea.value.substring(end);
        textarea.selectionStart = textarea.selectionEnd = start + 1;
      }
    };
    popup.appendChild(textarea);

    // Credit nhỏ
    const credit = document.createElement("div");
    credit.className = "html-quick-edit-credit";
    credit.textContent = "Extension này được làm bởi Duy Nguyễn 2kar6";
    credit.style.fontSize = "10px";
    credit.style.color = "#888";
    credit.style.marginTop = "8px";
    credit.style.textAlign = "right";
    popup.appendChild(credit);

    // Xử lý lưu / hủy
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

    // Kéo thả popup
    let isDragging = false,
      currentX = 0,
      currentY = 0,
      initialX = 0,
      initialY = 0;

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

    document.body.appendChild(popup);

    textarea.focus();
  }

  // Lắng nghe sự kiện chuột phải để bật popup khi có vùng chọn
  document.addEventListener("contextmenu", (e) => {
    const selection = window.getSelection();
    if (selection && !selection.isCollapsed) {
      e.preventDefault();
      const range = selection.getRangeAt(0);
      const selectedText = selection.toString();
      createEditorPopup(selectedText, range);
    }
  });
})();
