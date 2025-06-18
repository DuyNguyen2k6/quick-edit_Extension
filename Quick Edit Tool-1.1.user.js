// ==UserScript==
// @name         Quick Edit
// @namespace    http://tampermonkey.net/
// @version      1.5
// @description  Popup chỉnh sửa nhanh nội dung bôi đen với giao diện tông màu tối (dark mode)
// @author       DuyNguyen2k6
// @match        *://*/*
// @grant        none
// ==/UserScript==

(function() {
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
    if (!window.chrome || !chrome.storage) return;
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

    Object.assign(popup.style, {
      position: "fixed",
      zIndex: "10000",
      background: "#121212",
      color: "#eee",
      border: "1px solid #444",
      padding: "10px",
      minWidth: "350px",
      maxWidth: "90vw",
      boxShadow: "0 2px 12px rgba(0,0,0,0.9)",
      borderRadius: "8px",
      fontFamily: "Arial, sans-serif",
      fontSize: "14px",
      left: "50%",
      top: "50%",
      transform: "translate(-50%, -50%)",
      userSelect: "text",
      display: "flex",
      flexDirection: "column",
    });

    const header = document.createElement("div");
    header.textContent = "Quick Edit by DuyNguyen2k6";
    Object.assign(header.style, {
      fontWeight: "bold",
      fontSize: "16px",
      marginBottom: "8px",
      textAlign: "center",
      cursor: "move",
      userSelect: "none",
      color: "#ddd",
    });
    popup.appendChild(header);

    const textarea = document.createElement("textarea");
    textarea.value = selectedText;
    Object.assign(textarea.style, {
      width: "100%",
      height: "120px",
      padding: "8px",
      fontSize: "14px",
      fontFamily: "inherit",
      boxSizing: "border-box",
      resize: "vertical",
      border: "1px solid #555",
      outline: "none",
      background: "#1e1e1e",
      color: "#eee",
      transition: "background-color 0.3s ease",
      marginBottom: "8px",
    });
    textarea.oninput = () => {
      textarea.style.backgroundColor = "#333322";
      setTimeout(() => {
        textarea.style.backgroundColor = "#1e1e1e";
      }, 300);
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

    const guide = document.createElement("div");
    guide.textContent = "Press Enter to save, Escape to cancel, Tab for new line.";
    Object.assign(guide.style, {
      marginBottom: "8px",
      color: "#aaa",
    });
    popup.appendChild(guide);

    popup.onkeydown = (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        try {
          const cleanedText = sanitizeText(textarea.value);
          replaceTextInRange(range, cleanedText);
          saveEditHistory(selectedText, cleanedText);
          popup.remove();
          showNotification("Changes saved!", "success");
        } catch (error) {
          showNotification("Error saving: " + error.message);
          console.error("Save error:", error);
        }
      } else if (e.key === "Escape") {
        popup.remove();
      }
    };

    let isDragging = false,
      currentX = 0,
      currentY = 0,
      initialX = 0,
      initialY = 0;

    header.addEventListener("mousedown", (e) => {
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

  document.addEventListener("mousedown", (e) => {
    if (e.button === 1) { // Middle click
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        e.preventDefault();
        const range = selection.getRangeAt(0);
        const selectedText = selection.toString();
        createEditorPopup(selectedText, range);
      }
    }
  });
})();
